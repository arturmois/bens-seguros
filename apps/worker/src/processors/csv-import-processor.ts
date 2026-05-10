import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import { prismaAdmin } from '@repo/db'
import pino from 'pino'
import type { CsvImportJobData, CsvImportProgress } from '@repo/core'
import { IMPORT_BATCH_SIZE, MAX_IMPORT_ERRORS } from '@repo/core'
import {
  hashDocument,
  maskDocument,
  encrypt,
  getEncryptionKey,
} from '@repo/shared'

const logger = pino({ name: 'csv-import-processor' })
const QUEUE_NAME = 'csv-import'

const MARITAL_STATUSES = new Set([
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'OTHER',
])
const POLICY_BRANCHES = new Set([
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
])
const POLICY_STATUSES = new Set(['ACTIVE', 'CANCELLED', 'EXPIRED'])

function extractClientRow(raw: Record<string, unknown>) {
  const estadoCivil = raw['Estado Civil'] ? String(raw['Estado Civil']) : null
  const tags = raw['Tags'] ? String(raw['Tags']).split(';').filter(Boolean) : []
  const birthDateRaw = raw['Data Nascimento']
  const birthDate = birthDateRaw ? new Date(String(birthDateRaw)) : null
  return {
    nome: String(raw['Nome'] ?? ''),
    cpfCnpj: String(raw['CPF/CNPJ'] ?? ''),
    email: raw['Email'] ? String(raw['Email']) : null,
    telefone: raw['Telefone'] ? String(raw['Telefone']) : null,
    birthDate: birthDate && !isNaN(birthDate.getTime()) ? birthDate : null,
    profissao: raw['Profissão'] ? String(raw['Profissão']) : null,
    estadoCivil:
      estadoCivil && MARITAL_STATUSES.has(estadoCivil)
        ? (estadoCivil as
            | 'SINGLE'
            | 'MARRIED'
            | 'DIVORCED'
            | 'WIDOWED'
            | 'OTHER')
        : null,
    tags,
  }
}

function extractPolicyRow(raw: Record<string, unknown>) {
  const ramo = String(raw['Ramo'] ?? 'OTHER')
  const status = String(raw['Status'] ?? 'ACTIVE')
  return {
    numeroApolice: String(raw['Numero Apolice'] ?? ''),
    cpfCnpjCliente: String(raw['CPF/CNPJ Cliente'] ?? ''),
    ramo: POLICY_BRANCHES.has(ramo)
      ? (ramo as
          | 'AUTO'
          | 'RESIDENTIAL'
          | 'CONDOMINIUM'
          | 'BUSINESS'
          | 'LIFE'
          | 'OTHER')
      : ('OTHER' as const),
    premioReais: Number(raw['Premio (R$)'] ?? 0),
    inicioVigencia: new Date(String(raw['Inicio Vigencia'] ?? '')),
    fimVigencia: new Date(String(raw['Fim Vigencia'] ?? '')),
    seguradora: raw['Seguradora'] ? String(raw['Seguradora']) : null,
    status: POLICY_STATUSES.has(status)
      ? (status as 'ACTIVE' | 'CANCELLED' | 'EXPIRED')
      : ('ACTIVE' as const),
  }
}

async function processClientBatch(
  batch: ReadonlyArray<Record<string, unknown>>,
  organizationId: string,
  userId: string,
  progress: CsvImportProgress,
  batchStartIndex: number
): Promise<void> {
  const encryptionKey = getEncryptionKey()
  for (let i = 0; i < batch.length; i++) {
    const raw = batch[i]
    if (!raw) continue
    const row = extractClientRow(raw)
    const rawDocument = row.cpfCnpj
    const hash = hashDocument(rawDocument)
    const masked = maskDocument(rawDocument)
    const encrypted = encrypt(rawDocument, encryptionKey)
    try {
      const existing = await prismaAdmin.client.findFirst({
        where: { organizationId, documentHash: hash, deletedAt: null },
        select: { id: true },
      })
      const client =
        existing ??
        (await prismaAdmin.client.create({
          data: {
            organizationId,
            legalName: row.nome,
            document: masked,
            documentEncrypted: JSON.stringify(encrypted),
            documentHash: hash,
            personType:
              rawDocument.replace(/\D/g, '').length > 11
                ? 'COMPANY'
                : 'INDIVIDUAL',
            profession: row.profissao,
            maritalStatus: row.estadoCivil,
            fiscalBirthDate: row.birthDate,
          },
          select: { id: true },
        }))
      const contactExists =
        existing &&
        (await prismaAdmin.contact.findFirst({
          where: { organizationId, clientId: client.id, deletedAt: null },
          select: { id: true },
        }))
      if (!contactExists) {
        await prismaAdmin.contact.create({
          data: {
            organizationId,
            name: row.nome,
            phone: row.telefone,
            email: row.email,
            source: 'IMPORT',
            salespersonId: userId,
            clientId: client.id,
            tags: row.tags,
            consentLgpd: true,
            birthDate: row.birthDate,
          },
        })
      }
      if (existing) {
        progress.skipped += 1
      } else {
        progress.created += 1
      }
    } catch (err: unknown) {
      progress.failed += 1
      if (progress.errors.length < MAX_IMPORT_ERRORS) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido'
        progress.errors.push({
          row: batchStartIndex + i + 2,
          message: errorMessage,
        })
      }
    }
  }
}

async function processPolicyBatch(
  batch: ReadonlyArray<Record<string, unknown>>,
  organizationId: string,
  userId: string,
  progress: CsvImportProgress,
  batchStartIndex: number
): Promise<void> {
  for (let i = 0; i < batch.length; i++) {
    const raw = batch[i]
    if (!raw) continue
    const row = extractPolicyRow(raw)
    try {
      const clientHash = hashDocument(row.cpfCnpjCliente)
      const client = await prismaAdmin.client.findFirst({
        where: {
          organizationId,
          documentHash: clientHash,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (!client) {
        progress.failed += 1
        if (progress.errors.length < MAX_IMPORT_ERRORS) {
          progress.errors.push({
            row: batchStartIndex + i + 2,
            message: `Cliente com CPF/CNPJ ${row.cpfCnpjCliente} não encontrado`,
          })
        }
        continue
      }
      const existing = await prismaAdmin.policy.findFirst({
        where: {
          organizationId,
          policyNumber: row.numeroApolice,
        },
        select: { id: true },
      })
      if (existing) {
        progress.skipped += 1
        continue
      }
      const premiumInCents = Math.round(row.premioReais * 100)
      const contact = await prismaAdmin.contact.findFirst({
        where: { organizationId, clientId: client.id, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      if (!contact) {
        progress.failed += 1
        if (progress.errors.length < MAX_IMPORT_ERRORS) {
          progress.errors.push({
            row: batchStartIndex + i + 2,
            message: `Cliente com CPF/CNPJ ${row.cpfCnpjCliente} não tem Contact vinculado`,
          })
        }
        continue
      }
      const proposal = await prismaAdmin.proposal.create({
        data: {
          organizationId,
          contactId: contact.id,
          salespersonId: userId,
          stage: 'POLICY_ISSUED',
          boardType: 'NEW_INSURANCE',
          branch: row.ramo,
          premiumValueInCents: premiumInCents,
          commissionPercentageInCents: 0,
        },
      })
      await prismaAdmin.policy.create({
        data: {
          organizationId,
          proposalId: proposal.id,
          clientId: client.id,
          salespersonId: userId,
          policyNumber: row.numeroApolice,
          status: row.status,
          branch: row.ramo,
          premiumValueInCents: premiumInCents,
          startDate: row.inicioVigencia,
          endDate: row.fimVigencia,
        },
      })
      progress.created += 1
    } catch (err: unknown) {
      progress.failed += 1
      if (progress.errors.length < MAX_IMPORT_ERRORS) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido'
        progress.errors.push({
          row: batchStartIndex + i + 2,
          message: errorMessage,
        })
      }
    }
  }
}

export function setupCsvImportProcessor(connection: ConnectionOptions) {
  const queue = new Queue<CsvImportJobData>(QUEUE_NAME, { connection })
  const worker = new Worker<CsvImportJobData>(
    QUEUE_NAME,
    async (job: Job<CsvImportJobData>) => {
      const { entityType, organizationId, userId, rows, totalRows } = job.data
      const progress: CsvImportProgress = {
        processed: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        total: totalRows,
        errors: [],
      }
      for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(i, i + IMPORT_BATCH_SIZE)
        if (entityType === 'client') {
          await processClientBatch(batch, organizationId, userId, progress, i)
        } else {
          await processPolicyBatch(batch, organizationId, userId, progress, i)
        }
        progress.processed += batch.length
        await job.updateProgress(progress)
      }
      return progress
    },
    {
      connection,
      concurrency: 2,
      removeOnComplete: { age: 7200 },
      removeOnFail: { age: 86_400 },
    }
  )
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'CSV import job failed')
  })
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'CSV import job completed')
  })
  return { queue, worker }
}
