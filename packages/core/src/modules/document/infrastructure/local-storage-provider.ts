import { mkdir, writeFile, unlink, access, constants } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type {
  StorageProvider,
  UploadResult,
} from '../domain/storage-provider.js'

const UPLOADS_DIR = resolve('./uploads')

export class LocalStorageProvider implements StorageProvider {
  async upload(
    key: string,
    buffer: Buffer,
    _contentType: string
  ): Promise<UploadResult> {
    const filePath = join(UPLOADS_DIR, key)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, buffer)

    return { storageKey: key }
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    const filePath = join(UPLOADS_DIR, key)
    await access(filePath, constants.R_OK)
    return `file://${filePath}`
  }

  async delete(key: string): Promise<void> {
    const filePath = join(UPLOADS_DIR, key)
    try {
      await unlink(filePath)
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return
      }
      throw error
    }
  }
}
