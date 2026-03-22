// Minimal interface for Redis pub/sub publishing.
// Avoids coupling processors to a specific IORedis version.
export interface PubsubClient {
  publish(channel: string, message: string): Promise<number>
}
