export interface PubsubClient {
  publish(channel: string, message: string): Promise<number>
}
