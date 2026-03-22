import { CHAT_LIMITS, SOCKET_EVENTS } from '@repo/shared'
import type { Server } from 'socket.io'
import type { AppLogger } from '../logger.js'

interface AgentPresence {
  readonly name: string
  lastHeartbeat: number
}

type OrgPresenceMap = Map<string, AgentPresence>

/** Tracks online agent presence per organization with automatic stale removal */
export class PresenceTracker {
  private readonly orgs = new Map<string, OrgPresenceMap>()
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly io: Server,
    private readonly logger: AppLogger
  ) {}

  start(): void {
    this.intervalId = setInterval(
      () => this.removeStaleAgents(),
      CHAT_LIMITS.HEARTBEAT_INTERVAL_MS
    )
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  heartbeat(orgId: string, userId: string, name: string): void {
    let orgMap = this.orgs.get(orgId)
    if (!orgMap) {
      orgMap = new Map()
      this.orgs.set(orgId, orgMap)
    }
    orgMap.set(userId, { name, lastHeartbeat: Date.now() })
  }

  removeAgent(orgId: string, userId: string): void {
    const orgMap = this.orgs.get(orgId)
    if (!orgMap) return

    orgMap.delete(userId)
    if (orgMap.size === 0) {
      this.orgs.delete(orgId)
    }

    this.broadcastStatus(orgId)
  }

  getOnlineAgents(orgId: string): Array<{ userId: string; name: string }> {
    const orgMap = this.orgs.get(orgId)
    if (!orgMap) return []

    return Array.from(orgMap.entries()).map(([userId, data]) => ({
      userId,
      name: data.name,
    }))
  }

  private removeStaleAgents(): void {
    const now = Date.now()

    for (const [orgId, orgMap] of this.orgs.entries()) {
      for (const [userId, data] of orgMap.entries()) {
        if (now - data.lastHeartbeat > CHAT_LIMITS.HEARTBEAT_TIMEOUT_MS) {
          this.logger.info(
            { orgId, userId },
            'Removing stale agent from presence'
          )
          orgMap.delete(userId)
          this.broadcastStatus(orgId)
        }
      }

      if (orgMap.size === 0) {
        this.orgs.delete(orgId)
      }
    }
  }

  private broadcastStatus(orgId: string): void {
    const agents = this.getOnlineAgents(orgId)
    this.io
      .to(`lobby:${orgId}`)
      .emit(SOCKET_EVENTS.AGENT_STATUS_UPDATE, { agents })
  }
}
