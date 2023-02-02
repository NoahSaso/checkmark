import { createCors } from 'itty-cors'
import { Router } from 'itty-router'

import { Env } from './types'
import { authMiddleware } from './auth'
import { handleNonce } from './routes/nonce'
import { respondError } from './utils'
import { createSession } from './routes/createSession'
import { getStatus } from './routes/getStatus'
import { webhook } from './routes/webhook'
import { loadProviderMiddleware } from './providers'

// Create CORS handlers.
const { preflight, corsify } = createCors({
  methods: ['GET', 'POST'],
  origins: ['*'],
  maxAge: 3600,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  },
})

const router = Router()

// Handle CORS preflight OPTIONS request.
router.options('*', preflight)

//! Unauthenticated routes.

// Get nonce for publicKey.
router.get('/nonce/:publicKey', handleNonce)

// Get status for publicKey.
router.get('/status/:publicKey', loadProviderMiddleware, getStatus)

// Webhook.
router.post('/webhook', loadProviderMiddleware, webhook)

//! Authenticated routes.
// Authenticate the following routes.
router.all('*', authMiddleware)

// Data storage routes.

// Create session.
router.post('/create', loadProviderMiddleware, createSession)

//! 404
router.all('*', () => respondError(404, 'Not found'))

//! Entrypoint.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router
      .handle(request, env)
      .catch((err) => {
        console.error('Error handling request', request.url, err)
        return respondError(
          500,
          `Internal server error. ${
            err instanceof Error ? err.message : `${JSON.stringify(err)}`
          }`
        )
      })
      .then(corsify)
  },
}
