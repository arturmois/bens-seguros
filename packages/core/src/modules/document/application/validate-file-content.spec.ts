import { describe, expect, it } from 'vitest'
import { InvalidFileTypeError } from '../domain/document-errors.js'
import { validateFileContent } from './validate-file-content.js'

// Real JPEG magic bytes: FF D8 FF
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
// Real PNG magic bytes: 89 50 4E 47
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
// Real PDF magic bytes: %PDF
const PDF_HEADER = Buffer.from('%PDF-1.4 fake content')
// EXE magic bytes: MZ
const EXE_HEADER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00])

describe('validateFileContent', () => {
  it('accepts a valid JPEG file', async () => {
    await expect(
      validateFileContent(JPEG_HEADER, 'photo.jpg')
    ).resolves.toBeUndefined()
  })

  it('accepts a valid PNG file', async () => {
    await expect(
      validateFileContent(PNG_HEADER, 'image.png')
    ).resolves.toBeUndefined()
  })

  it('accepts a valid PDF file', async () => {
    await expect(
      validateFileContent(PDF_HEADER, 'contract.pdf')
    ).resolves.toBeUndefined()
  })

  it('rejects a file with blocked extension regardless of content', async () => {
    await expect(
      validateFileContent(JPEG_HEADER, 'malware.exe')
    ).rejects.toThrow(InvalidFileTypeError)
  })

  it('rejects a file with blocked .bat extension', async () => {
    await expect(
      validateFileContent(Buffer.from('echo hello'), 'script.bat')
    ).rejects.toThrow(InvalidFileTypeError)
  })

  it('rejects an EXE disguised as .jpg', async () => {
    await expect(validateFileContent(EXE_HEADER, 'photo.jpg')).rejects.toThrow(
      InvalidFileTypeError
    )
  })

  it('allows a plain text file (no detectable magic bytes)', async () => {
    const textBuffer = Buffer.from('Hello, this is a plain text file.')
    await expect(
      validateFileContent(textBuffer, 'notes.txt')
    ).resolves.toBeUndefined()
  })

  it('allows a CSV file (no detectable magic bytes)', async () => {
    const csvBuffer = Buffer.from('name,email\nJohn,john@test.com')
    await expect(
      validateFileContent(csvBuffer, 'clients.csv')
    ).resolves.toBeUndefined()
  })

  it('rejects .sh extension', async () => {
    await expect(
      validateFileContent(Buffer.from('#!/bin/bash'), 'deploy.sh')
    ).rejects.toThrow(InvalidFileTypeError)
  })

  it('rejects .ps1 extension', async () => {
    await expect(
      validateFileContent(Buffer.from('Write-Host "hi"'), 'script.ps1')
    ).rejects.toThrow(InvalidFileTypeError)
  })

  it('rejects double-extension bypass like malware.bat.csv', async () => {
    await expect(
      validateFileContent(Buffer.from('echo rm -rf /'), 'malware.bat.csv')
    ).rejects.toThrow(InvalidFileTypeError)
  })

  it('rejects a file with disallowed detected MIME type', async () => {
    // ZIP magic bytes: PK (50 4B 03 04)
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])
    await expect(validateFileContent(zipHeader, 'archive.zip')).rejects.toThrow(
      InvalidFileTypeError
    )
  })
})
