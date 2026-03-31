import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomBytes } from 'node:crypto'
import IORedis from 'ioredis'
import { z } from 'zod'

import { env } from '@repo/env'
import { encryptToken, decryptToken } from '@repo/shared/meta-crypto'

import {
  generateOAuthUrl,
  validateState,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getMetaUserId,
} from './meta-oauth-service.js'
import {
  fetchUserPages,
  mapPagesToAssets,
  getInstagramUsername,
} from './meta-assets-service.js'
import {
  connectMetaChannel,
  subscribePageToWebhooks,
  disconnectMetaChannel,
  getChannelMetaStatus,
} from './meta-connect-service.js'
import { connectWhatsAppEmbeddedSignup } from './meta-whatsapp-service.js'

const META_OAUTH_SESSION_PREFIX = 'meta:oauth:'
const META_OAUTH_SESSION_TTL = 600

/**
 * Stored in Redis with tokens encrypted. The `longLivedToken` and each page
 * `accessToken` are JSON-serialised EncryptedField objects.
 */
const metaOAuthSessionSchema = z.object({
  longLivedToken: z.string(),
  metaUserId: z.string(),
  expiresIn: z.number(),
  tenantId: z.string(),
  channelType: z.string(),
  pages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      accessToken: z.string(),
      instagramBusinessAccountId: z.string().nullable(),
    })
  ),
})

type MetaOAuthSession = z.infer<typeof metaOAuthSessionSchema>

const MESSENGER_IG_SCOPES = [
  'pages_messaging',
  'pages_manage_metadata',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_manage_messages',
]

function encryptSessionTokens(
  longLivedToken: string,
  pages: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly accessToken: string
    readonly instagramBusinessAccountId: string | null
  }>
): {
  encryptedLongLivedToken: string
  encryptedPages: MetaOAuthSession['pages']
} {
  const encryptedLongLivedToken = JSON.stringify(encryptToken(longLivedToken))
  const encryptedPages = pages.map((p) => ({
    ...p,
    accessToken: JSON.stringify(encryptToken(p.accessToken)),
  }))
  return { encryptedLongLivedToken, encryptedPages }
}

function decryptSessionTokens(session: MetaOAuthSession): {
  longLivedToken: string
  pages: Array<{
    id: string
    name: string
    accessToken: string
    instagramBusinessAccountId: string | null
  }>
} {
  const longLivedToken = decryptToken(JSON.parse(session.longLivedToken))
  const pages = session.pages.map((p) => ({
    ...p,
    accessToken: decryptToken(JSON.parse(p.accessToken)),
  }))
  return { longLivedToken, pages }
}

const authCallbackBodySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

const connectBodySchema = z.object({
  sessionId: z.string().min(1),
  pageId: z.string().min(1),
  channelType: z.enum(['MESSENGER', 'INSTAGRAM']),
  channelName: z.string().min(1).max(255),
})

const disconnectBodySchema = z.object({
  channelId: z.string().min(1),
})

const channelIdParamsSchema = z.object({
  channelId: z.string().min(1),
})

const authUrlQuerySchema = z.object({
  channelType: z.enum(['MESSENGER', 'INSTAGRAM']).default('MESSENGER'),
})

const whatsappConnectBodySchema = z.object({
  code: z.string().min(1),
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  name: z.string().min(1).max(255),
})

let redisInstance: IORedis | null = null
function getMetaRedis(): IORedis {
  if (!redisInstance) {
    redisInstance = new IORedis(env.REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: false,
    })
  }
  return redisInstance
}

/**
 * Unauthenticated route: GET /meta/auth/callback
 * Meta redirects here after OAuth consent. Processes the code exchange
 * and redirects to the frontend with the sessionId.
 * Must be registered BEFORE the auth middleware in app.ts.
 */
export async function metaCallbackRoute(app: FastifyInstance): Promise<void> {
  const redis = getMetaRedis()

  app.addHook('onClose', async () => {
    if (redisInstance) {
      await redisInstance.quit()
      redisInstance = null
    }
  })

  app.get(
    '/meta/auth/callback',
    async (
      request: FastifyRequest<{
        Querystring: { code?: string; state?: string; error?: string }
      }>,
      reply: FastifyReply
    ) => {
      const { code, state, error } = request.query as Record<string, string>

      const frontendUrl = env.FRONTEND_URL ?? 'http://localhost:3000'

      if (error || !code || !state) {
        const errorMsg = error ?? 'missing_params'
        return reply.redirect(
          `${frontendUrl}/settings?section=canais&meta_error=${encodeURIComponent(errorMsg)}`
        )
      }

      try {
        const oauthState = validateState(state)
        const tenantId = oauthState.tenantId

        const shortLived = await exchangeCodeForToken(code)
        const longLived = await exchangeForLongLivedToken(
          shortLived.accessToken
        )
        const metaUserId = await getMetaUserId(longLived.accessToken)
        const pages = await fetchUserPages(longLived.accessToken)

        const sessionId = randomBytes(16).toString('hex')
        const { encryptedLongLivedToken, encryptedPages } =
          encryptSessionTokens(longLived.accessToken, pages)

        const session: MetaOAuthSession = {
          longLivedToken: encryptedLongLivedToken,
          metaUserId,
          expiresIn: longLived.expiresIn,
          tenantId,
          channelType: oauthState.channelType,
          pages: encryptedPages,
        }

        await redis.set(
          `${META_OAUTH_SESSION_PREFIX}${sessionId}`,
          JSON.stringify(session),
          'EX',
          META_OAUTH_SESSION_TTL
        )

        app.log.info(
          { tenantId, metaUserId, pageCount: pages.length },
          'Meta OAuth callback completed'
        )

        return reply.redirect(
          `${frontendUrl}/settings?section=canais&meta_session=${encodeURIComponent(sessionId)}&meta_channel_type=${oauthState.channelType}`
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'auth_failed'
        app.log.warn({ err: message }, 'Meta OAuth callback failed')
        return reply.redirect(
          `${frontendUrl}/settings?section=canais&meta_error=${encodeURIComponent(message)}`
        )
      }
    }
  )
}

export async function metaRoutes(app: FastifyInstance): Promise<void> {
  const redis = getMetaRedis()

  // GET /meta/auth/url — Generate Facebook Login URL + state
  app.get(
    '/meta/auth/url',
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof authUrlQuerySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { channelType } = authUrlQuerySchema.parse(request.query)
      const tenantId = request.organizationId

      try {
        const { url, state } = generateOAuthUrl(tenantId, channelType)
        app.log.info({ tenantId, channelType }, 'Meta OAuth URL generated')
        return reply.send({ success: true, data: { url, state } })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao gerar URL de autenticação'
        app.log.warn(
          { tenantId, err: message },
          'Failed to generate Meta OAuth URL'
        )
        return reply.status(500).send({
          success: false,
          error: { code: 'META_CONFIG_ERROR', message },
        })
      }
    }
  )

  // POST /meta/auth/callback — Exchange code for long-lived token, save session in Redis
  app.post(
    '/meta/auth/callback',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof authCallbackBodySchema> }>,
      reply: FastifyReply
    ) => {
      const { code, state } = authCallbackBodySchema.parse(request.body)
      const tenantId = request.organizationId

      try {
        const oauthState = validateState(state)

        if (oauthState.tenantId !== tenantId) {
          return reply.status(403).send({
            success: false,
            error: {
              code: 'STATE_TENANT_MISMATCH',
              message: 'Estado OAuth inválido para este tenant',
            },
          })
        }

        const shortLived = await exchangeCodeForToken(code)
        const longLived = await exchangeForLongLivedToken(
          shortLived.accessToken
        )
        const metaUserId = await getMetaUserId(longLived.accessToken)
        const pages = await fetchUserPages(longLived.accessToken)

        const sessionId = randomBytes(16).toString('hex')
        const { encryptedLongLivedToken, encryptedPages } =
          encryptSessionTokens(longLived.accessToken, pages)

        const session: MetaOAuthSession = {
          longLivedToken: encryptedLongLivedToken,
          metaUserId,
          expiresIn: longLived.expiresIn,
          tenantId,
          channelType: oauthState.channelType,
          pages: encryptedPages,
        }

        await redis.set(
          `${META_OAUTH_SESSION_PREFIX}${sessionId}`,
          JSON.stringify(session),
          'EX',
          META_OAUTH_SESSION_TTL
        )

        const rawAssets = mapPagesToAssets(pages)

        const assets = await Promise.all(
          rawAssets.map(async (asset) => {
            if (!asset.hasInstagram || !asset.instagramAccountId) return asset
            const page = pages.find((p) => p.id === asset.pageId)
            if (!page) return asset
            const username = await getInstagramUsername(
              asset.instagramAccountId,
              page.accessToken
            )
            return { ...asset, instagramUsername: username }
          })
        )

        app.log.info(
          { tenantId, metaUserId, pageCount: pages.length },
          'Meta OAuth callback completed'
        )

        return reply.send({
          success: true,
          data: { sessionId, assets, channelType: oauthState.channelType },
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Falha na autenticação com Meta'
        app.log.warn({ tenantId, err: message }, 'Meta OAuth callback failed')
        return reply.status(400).send({
          success: false,
          error: { code: 'META_AUTH_FAILED', message },
        })
      }
    }
  )

  // GET /meta/assets — List Pages/Instagram from session
  app.get(
    '/meta/assets',
    async (
      request: FastifyRequest<{ Querystring: { sessionId?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.organizationId
      const sessionId = request.query.sessionId

      if (!sessionId || typeof sessionId !== 'string') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_SESSION_ID',
            message: 'sessionId é obrigatório',
          },
        })
      }

      const raw = await redis.get(`${META_OAUTH_SESSION_PREFIX}${sessionId}`)
      if (!raw) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Sessão OAuth expirada ou não encontrada',
          },
        })
      }

      const session = metaOAuthSessionSchema.parse(JSON.parse(raw))

      if (session.tenantId !== tenantId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'SESSION_TENANT_MISMATCH',
            message: 'Sessão não pertence a este tenant',
          },
        })
      }

      const decrypted = decryptSessionTokens(session)
      const rawAssets = mapPagesToAssets(decrypted.pages)

      const assets = await Promise.all(
        rawAssets.map(async (asset) => {
          if (!asset.hasInstagram || !asset.instagramAccountId) return asset
          const page = decrypted.pages.find((p) => p.id === asset.pageId)
          if (!page) return asset
          const username = await getInstagramUsername(
            asset.instagramAccountId,
            page.accessToken
          )
          return { ...asset, instagramUsername: username }
        })
      )

      return reply.send({
        success: true,
        data: { assets, channelType: session.channelType },
      })
    }
  )

  // POST /meta/connect — Connect Page to channel, encrypt token, subscribe webhooks
  app.post(
    '/meta/connect',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof connectBodySchema> }>,
      reply: FastifyReply
    ) => {
      const body = connectBodySchema.parse(request.body)
      const tenantId = request.organizationId

      const raw = await redis.get(
        `${META_OAUTH_SESSION_PREFIX}${body.sessionId}`
      )
      if (!raw) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Sessão OAuth expirada ou não encontrada',
          },
        })
      }

      const session = metaOAuthSessionSchema.parse(JSON.parse(raw))

      if (session.tenantId !== tenantId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'SESSION_TENANT_MISMATCH',
            message: 'Sessão não pertence a este tenant',
          },
        })
      }

      const decrypted = decryptSessionTokens(session)
      const page = decrypted.pages.find((p) => p.id === body.pageId)
      if (!page) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PAGE_NOT_FOUND',
            message: 'Página não encontrada na sessão OAuth',
          },
        })
      }

      try {
        const tokenExpiresAt = new Date(Date.now() + session.expiresIn * 1000)

        const channel = await connectMetaChannel({
          tenantId,
          channelType: body.channelType,
          name: body.channelName,
          pageId: page.id,
          pageAccessToken: page.accessToken,
          metaUserId: session.metaUserId,
          scopes: MESSENGER_IG_SCOPES,
          tokenExpiresAt,
          ...(body.channelType === 'INSTAGRAM' &&
          page.instagramBusinessAccountId
            ? { instagramAccountId: page.instagramBusinessAccountId }
            : {}),
        })

        const webhookResult = await subscribePageToWebhooks(
          page.id,
          page.accessToken
        )

        if (!webhookResult.success) {
          app.log.warn(
            { tenantId, pageId: page.id, error: webhookResult.error },
            'Page webhook subscription failed — channel created but webhooks not subscribed'
          )
        }

        // Invalidate session after use
        await redis.del(`${META_OAUTH_SESSION_PREFIX}${body.sessionId}`)

        app.log.info(
          {
            tenantId,
            channelId: channel.channelId,
            channelType: body.channelType,
          },
          'Meta channel connected'
        )

        return reply.status(201).send({
          success: true,
          data: {
            channel,
            webhookSubscribed: webhookResult.success,
            ...(webhookResult.success
              ? {}
              : { webhookError: webhookResult.error }),
          },
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao conectar canal Meta'
        app.log.warn({ tenantId, err: message }, 'Meta channel connect failed')
        return reply.status(500).send({
          success: false,
          error: { code: 'CONNECT_FAILED', message },
        })
      }
    }
  )

  // POST /meta/disconnect — Revoke + deactivate channel
  app.post(
    '/meta/disconnect',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof disconnectBodySchema> }>,
      reply: FastifyReply
    ) => {
      const { channelId } = disconnectBodySchema.parse(request.body)
      const tenantId = request.organizationId

      const success = await disconnectMetaChannel(channelId, tenantId)

      if (!success) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CHANNEL_NOT_FOUND',
            message: 'Canal não encontrado ou já inativo',
          },
        })
      }

      app.log.info({ tenantId, channelId }, 'Meta channel disconnected')

      return reply.send({
        success: true,
        data: { channelId, status: 'DISCONNECTED' },
      })
    }
  )

  // POST /meta/whatsapp/connect — Connect WhatsApp via Embedded Signup
  app.post(
    '/meta/whatsapp/connect',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = whatsappConnectBodySchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'code, phoneNumberId, wabaId, name são obrigatórios',
          },
        })
      }

      const { code, phoneNumberId, wabaId, name } = parsed.data
      const tenantId = request.organizationId

      try {
        const result = await connectWhatsAppEmbeddedSignup({
          tenantId,
          code,
          phoneNumberId,
          wabaId,
          name,
        })

        app.log.info(
          {
            event: 'meta.channel.connected',
            tenantId,
            channelId: result.channelId,
            channelType: 'WHATSAPP',
            connectionMethod: 'embedded_signup',
          },
          'WhatsApp channel connected via Embedded Signup'
        )

        return reply
          .status(201)
          .send({ success: true, data: { channel: result } })
      } catch (err) {
        app.log.error({ err }, 'WhatsApp Embedded Signup connection failed')
        return reply.status(422).send({
          success: false,
          error: {
            code: 'WHATSAPP_CONNECT_FAILED',
            message:
              err instanceof Error ? err.message : 'Failed to connect WhatsApp',
          },
        })
      }
    }
  )

  // GET /meta/status/:channelId — Integration status
  app.get(
    '/meta/status/:channelId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof channelIdParamsSchema>
      }>,
      reply: FastifyReply
    ) => {
      const { channelId } = channelIdParamsSchema.parse(request.params)
      const tenantId = request.organizationId

      const status = await getChannelMetaStatus(channelId, tenantId)

      if (!status) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Canal não encontrado' },
        })
      }

      return reply.send({ success: true, data: status })
    }
  )

  // POST /meta/reconnect/:channelId — Generate new OAuth URL for re-auth
  app.post(
    '/meta/reconnect/:channelId',
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof channelIdParamsSchema>
        Querystring: z.infer<typeof authUrlQuerySchema>
      }>,
      reply: FastifyReply
    ) => {
      const { channelId } = channelIdParamsSchema.parse(request.params)
      const { channelType } = authUrlQuerySchema.parse(request.query)
      const tenantId = request.organizationId

      const existing = await getChannelMetaStatus(channelId, tenantId)
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Canal não encontrado' },
        })
      }

      try {
        const { url, state } = generateOAuthUrl(tenantId, channelType)
        app.log.info(
          { tenantId, channelId, channelType },
          'Meta reconnect OAuth URL generated'
        )
        return reply.send({ success: true, data: { url, state, channelId } })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao gerar URL de reautenticação'
        app.log.warn(
          { tenantId, channelId, err: message },
          'Failed to generate Meta reconnect URL'
        )
        return reply.status(500).send({
          success: false,
          error: { code: 'META_CONFIG_ERROR', message },
        })
      }
    }
  )
}
