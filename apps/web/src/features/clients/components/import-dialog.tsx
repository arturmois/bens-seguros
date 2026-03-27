'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import {
  useUploadCsv,
  useConfirmImport,
  useImportStatus,
} from '../hooks/use-import-clients'
import type { ImportPreviewResponse } from '../types/import-types'
import { ImportStepUpload } from './import-step-upload'
import { ImportStepPreview } from './import-step-preview'
import { ImportStepProcessing } from './import-step-processing'
import { ImportStepResults } from './import-step-results'

type ImportStep = 'upload' | 'preview' | 'processing' | 'results'

const STEP_TITLES: Record<ImportStep, string> = {
  upload: 'Importar Clientes',
  preview: 'Revisar Dados',
  processing: 'Importando...',
  results: 'Resultado',
}

const STEP_DESCRIPTIONS: Record<ImportStep, string> = {
  upload: 'Envie um arquivo CSV com os dados dos clientes.',
  preview: 'Confira os dados antes de importar.',
  processing: 'Aguarde enquanto os clientes são importados.',
  results: 'Veja o resultado da importação.',
}

interface ImportDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [jobId, setJobId] = useState('')

  const uploadCsv = useUploadCsv()
  const confirmImport = useConfirmImport()
  const importStatus = useImportStatus(jobId, step === 'processing')

  const uploadReset = uploadCsv.reset
  const confirmReset = confirmImport.reset

  useEffect(() => {
    if (!open) {
      setStep('upload')
      setPreview(null)
      setJobId('')
      uploadReset()
      confirmReset()
    }
  }, [open, uploadReset, confirmReset])

  useEffect(() => {
    if (step !== 'processing') return
    if (!importStatus.data) return

    const { status } = importStatus.data
    if (status === 'completed' || status === 'failed') {
      setStep('results')
    }
  }, [step, importStatus.data])

  const handleFileSelect = useCallback(
    (file: File) => {
      uploadCsv.mutate(file, {
        onSuccess: (data) => {
          setPreview(data)
          setJobId(data.jobId)
          setStep('preview')
        },
      })
    },
    [uploadCsv]
  )

  const handleConfirm = useCallback(() => {
    confirmImport.mutate(jobId, {
      onSuccess: () => {
        setStep('processing')
      },
    })
  }, [confirmImport, jobId])

  const handleCancel = useCallback(() => {
    setStep('upload')
    setPreview(null)
    setJobId('')
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const isClosable = step === 'upload' || step === 'results'

  return (
    <Sheet open={open} onOpenChange={isClosable ? onOpenChange : undefined}>
      <SheetContent
        side="right"
        className="sm:max-w-lg"
        showCloseButton={isClosable}
      >
        <SheetHeader>
          <SheetTitle>{STEP_TITLES[step]}</SheetTitle>
          <SheetDescription>{STEP_DESCRIPTIONS[step]}</SheetDescription>
        </SheetHeader>

        {step === 'upload' && (
          <ImportStepUpload
            onFileSelect={handleFileSelect}
            isUploading={uploadCsv.isPending}
          />
        )}

        {step === 'preview' && preview && (
          <ImportStepPreview
            preview={preview}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isConfirming={confirmImport.isPending}
          />
        )}

        {step === 'processing' && (
          <ImportStepProcessing status={importStatus.data} />
        )}

        {step === 'results' && importStatus.data && (
          <ImportStepResults status={importStatus.data} onClose={handleClose} />
        )}
      </SheetContent>
    </Sheet>
  )
}
