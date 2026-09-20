import {
  ResendEmailProvider,
  R2StorageProvider,
  LocalStorageProvider,
  MarkQuoteSent,
  PrismaProposalRepository,
  type EmailProvider,
  type StorageProvider,
} from '@repo/core'
import { prismaAdmin } from '@repo/db'
import { env } from '@repo/env'
import { quoteSentEmailHtml } from '@repo/core/notification'
import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'send-quote-email-processor' })

const QUEUE_NAME = 'erp-send-quote'

interface SendQuoteEmailJobData {
  readonly proposalId: string
  readonly organizationId: string
  readonly storageKey: string
  readonly recipientEmail: string
  readonly recipientName: string
  readonly salespersonName: string
  readonly salespersonEmail: string | null
  readonly organizationName: string
  readonly branch: string
  readonly premiumFormatted: string
}

function buildStorageProvider(): StorageProvider {
  if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
    return new R2StorageProvider()
  }
  return new LocalStorageProvider()
}

async function downloadPdf(
  storage: StorageProvider,
  storageKey: string
): Promise<Buffer> {
  const signedUrl = await storage.getSignedUrl(storageKey, 60)
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(
      `Failed to download PDF from storage: ${response.status} ${response.statusText}`
    )
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export interface SendQuoteEmailJobDeps {
  resendApiKey: string | undefined
  emailProvider: EmailProvider | null
  storage: StorageProvider
  markQuoteSent: Pick<MarkQuoteSent, 'execute'>
}

export async function processSendQuoteEmailJob(
  job: { data: SendQuoteEmailJobData; id?: string },
  deps: SendQuoteEmailJobDeps
): Promise<void> {
  if (!deps.resendApiKey || !deps.emailProvider) {
    logger.warn(
      { jobId: job.id },
      'RESEND_API_KEY not configured — skipping send-quote-email job'
    )
    return
  }
  const {
    proposalId,
    organizationId,
    storageKey,
    recipientEmail,
    recipientName,
    salespersonName,
    salespersonEmail,
    organizationName,
    branch,
    premiumFormatted,
  } = job.data
  const pdfBuffer = await downloadPdf(deps.storage, storageKey)
  const html = quoteSentEmailHtml({
    clientName: recipientName,
    salespersonName,
    organizationName,
    branch,
    premiumFormatted,
  })
  await deps.emailProvider.send({
    to: recipientEmail,
    subject: `Cotação de Seguro — ${branch}`,
    html,
    ...(salespersonEmail ? { replyTo: salespersonEmail } : {}),
    attachments: [{ filename: 'cotacao.pdf', content: pdfBuffer }],
  })
  await deps.markQuoteSent.execute({
    proposalId,
    organizationId,
    sentAt: new Date(),
  })
  logger.info(
    { proposalId, organizationId, recipientEmail },
    'Quote email sent successfully'
  )
}

export function setupSendQuoteEmailProcessor(connection: ConnectionOptions) {
  const queue = new Queue<SendQuoteEmailJobData>(QUEUE_NAME, { connection })
  const storage = buildStorageProvider()
  const markQuoteSent = new MarkQuoteSent(
    new PrismaProposalRepository(prismaAdmin)
  )
  let emailProvider: EmailProvider | null = null
  if (env.RESEND_API_KEY) {
    emailProvider = new ResendEmailProvider({
      apiKey: env.RESEND_API_KEY,
      fromAddress: env.RESEND_FROM_ADDRESS,
    })
  }
  const worker = new Worker<SendQuoteEmailJobData>(
    QUEUE_NAME,
    async (job: Job<SendQuoteEmailJobData>) => {
      await processSendQuoteEmailJob(job, {
        resendApiKey: env.RESEND_API_KEY,
        emailProvider,
        storage,
        markQuoteSent,
      })
    },
    {
      connection,
      concurrency: 2,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 },
    }
  )
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Send-quote-email job failed')
  })
  return { worker, queue }
}
