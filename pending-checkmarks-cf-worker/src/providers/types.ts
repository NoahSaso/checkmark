import { Request as IttyRequest } from 'itty-router'
import { Env } from '../types'

export type SessionState =
  | {
      status: 'pending' | 'succeeded'
    }
  | {
      status: 'failed'
      reasons: string[]
      failedOnlyDueToDuplicate: boolean
      initiallySuccessfulSessionId?: string
    }

export type Provider = {
  isWebhookAuthenticated: (request: IttyRequest) => Promise<boolean>
  getSessionIdFromWebhook: (request: IttyRequest) => Promise<string>
  getSessionState: (sessionId: string) => Promise<SessionState>
}

export type ProviderLoader = {
  id: string
  load: (env: Env) => Provider
}
