import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import { prisma } from '@repo/db'
import pino from 'pino'
import type { CsvImportJobData, CsvImportProgress } from '@repo/core'
import { IMPORT_BATCH_SIZE, MAX_IMPORT_ERRORS } from '@repo/core'

const logger = pino({ name: 'csv-import-processor' })
const QUEUE_NAME = 'csv-import'

interface ClientImportRow {
  readonly Nome: string
  readonly 'CPF/CNPJ': string
  readonly Tipo?: string
  readonly Email?: string
  readonly Telefone?: string
  readonly 'Data Nascimento'?: Date | string
  readonly Profissao?: string
  readonly 'Estado Civil'?: string
  readonly Tags?: string
}

interface PolicyImportRow {
  readonly 'Numero Apolice': string
  readonly 'CPF/CNPJ Cliente': string
  readonly Ramo: string
  readonly 'Premio (R$)': number
  readonly 'Inicio Vigencia': Date | string
  readonly 'Fim Vigencia': Date | string
  readonly Seguradora?: string
  readonly Status?: string
}

async function processClientBatch(
  batch: ReadonlyArray<Record<string, unknown>>,
  organizationId: string,
  progress: CsvImportProgress,
  batchStartIndex: number
): Promise<void> {
  const mappedData = batch.map((raw) => {
    const row = raw as unknown as ClientImportRow
    const tags = row.Tags ? row.Tags.split(';').filter(Boolean) : []
    const birthDate = row['Data Nascimento']
      ? new Date(row['Data Nascimento'])
      : null

    return {
      organizationId,
      name: row.Nome,
      document: row['CPF/CNPJ'],
      type: (row.Tipo ?? 'CLIENT') as 'LEAD' | 'CLIENT' | 'FORMER_CLIENT',
      email: row.Email || null,
      phone: row.Telefone || null,
      birthDate: birthDate && !isNaN(birthDate.getTime()) ? birthDate : null,
      profession: row.Profissao || null,
      maritalStatus: (row['Estado Civil'] || null) as
        | 'SINGLE'
        | 'MARRIED'
        | 'DIVORCED'
        | 'WIDOWED'
        | 'OTHER'
        | null,
      tags,
    }
  })

  try {
    const result = await prisma.client.createMany({
      data: mappedData,
      skipDuplicates: true,
    })
    progress.created += result.count
    progress.skipped += mappedData.length - result.count
  } catch {
    // If batch fails, try individual inserts to identify problematic rows
    for (let i = 0; i < mappedData.length; i++) {
      const data = mappedData[i]
      if (!data) continue
      try {
        await prisma.client.create({ data })
        progress.created += 1
      } catch (innerErr: unknown) {
        progress.failed += 1
        if (progress.errors.length < MAX_IMPORT_ERRORS) {
          const errorMessage =
            innerErr instanceof Error ? innerErr.message : 'Erro desconhecido'
          progress.errors.push({
            row: batchStartIndex + i + 2,
            message: errorMessage,
          })
        }
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
    const row = raw as unknown as PolicyImportRow

    try {
      // Look up client by document
      const client = await prisma.client.findFirst({
        where: {
          organizationId,
          document: row['CPF/CNPJ Cliente'],
          deletedAt: null,
        },
        select: { id: true },
      })

      if (!client) {
        progress.failed += 1
        if (progress.errors.length < MAX_IMPORT_ERRORS) {
          progress.errors.push({
            row: batchStartIndex + i + 2,
            message: `Cliente com CPF/CNPJ ${row['CPF/CNPJ Cliente']} nao encontrado`,
          })
        }
        continue
      }

      // Check for duplicate policyNumber
      const existing = await prisma.policy.findFirst({
        where: {
          organizationId,
          policyNumber: row['Numero Apolice'],
        },
        select: { id: true },
      })

      if (existing) {
        progress.skipped += 1
        continue
      }

      // Create a stub proposal for the policy (required by schema)
      const proposal = await prisma.proposal.create({
        data: {
          organizationId,
          clientId: client.id,
          salespersonId: userId,
          stage: 'POLICY_ISSUED',
          boardType: 'NEW_INSURANCE',
          branch: row.Ramo as
            | 'AUTO'
            | 'RESIDENTIAL'
            | 'CONDOMINIUM'
            | 'BUSINESS'
            | 'LIFE'
            | 'OTHER',
          premiumValueInCents: Math.round(Number(row['Premio (R$)']) * 100),
          commissionPercentageInCents: 0,
        },
      })

      await prisma.policy.create({
        data: {
          organizationId,
          proposalId: proposal.id,
          clientId: client.id,
          salespersonId: userId,
          policyNumber: row['Numero Apolice'],
          status: (row.Status ?? 'ACTIVE') as
            | 'ACTIVE'
            | 'CANCELLED'
            | 'EXPIRED',
          branch: row.Ramo as
            | 'AUTO'
            | 'RESIDENTIAL'
            | 'CONDOMINIUM'
            | 'BUSINESS'
            | 'LIFE'
            | 'OTHER',
          premiumValueInCents: Math.round(Number(row['Premio (R$)']) * 100),
          startDate: new Date(row['Inicio Vigencia']),
          endDate: new Date(row['Fim Vigencia']),
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
          await processClientBatch(batch, organizationId, progress, i)
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
