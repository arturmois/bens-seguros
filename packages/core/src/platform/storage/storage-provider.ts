export interface UploadResult {
  storageKey: string
}

export interface StorageProvider {
  upload(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<UploadResult>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
}
