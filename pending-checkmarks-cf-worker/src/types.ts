import { Request as IttyRequest } from 'itty-router'

export interface Env {
  NONCES: KVNamespace
  SESSIONS: KVNamespace

  // Environment variables.
  CHECKMARK_CONTRACT_ADDRESS: string
  PAYMENT_CONTRACT_ADDRESS: string
  // Secrets.
  WALLET_MNEMONIC: string
  SYNAPS_CLIENT_ID: string
  SYNAPS_API_KEY: string
  SYNAPS_WEBHOOK_SECRET: string
}

export interface Auth {
  type: string
  nonce: number
  chainId: string
  chainFeeDenom: string
  chainBech32Prefix: string
  publicKey: string
}

export type RequestBody<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends Record<string, unknown> = Record<string, any>
> = {
  data: {
    auth: Auth
  } & Data
  signature: string
}

export interface AuthorizedRequest<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends Record<string, any> = Record<string, any>
> extends IttyRequest {
  parsedBody: RequestBody<Data>
}

// Synaps

export type Session = {
  session_id: string
  status: 'PENDING' | 'VERIFIED' | 'CANCELLED'
  sandbox: boolean
  alias: string
}

export type OnboardingDetails = {
  app_id: string
  sandbox: boolean
  session: Session
  session_id: string
  alias: string
  steps: Record<string, VerificationStepDetails>
}

export type VerificationStepDetails =
  | VerificationStepIdentity
  | VerificationStepLiveness

export type VerificationStepIdentity = {
  type: 'IDENTITY'
  verification: IdentityVerificationResponse
}

export type VerificationStepLiveness = {
  type: 'LIVENESS'
  verification: LivenessVerificationResponse
}

export type LivenessVerificationResponse = {
  attempts: number
  enrollment_date: string
  face: string
  state: 'VALIDATED' | 'NOT_STARTED' | 'PENDING' | 'REJECTED'
}

export type IdentityVerificationResponse = {
  document: IdentityDocument
  duplicate: IdentityDuplicate
  facematch: IdentityFacematch
}

export type IdentityDocument = {
  state: 'VALIDATED' | 'NOT_STARTED' | 'PENDING' | 'REJECTED'
  rejection: {
    reason_code: string
    customer_reason: string
    user_reason: string
  }
}

export type IdentityDuplicate = {
  state: 'VALIDATED' | 'NOT_STARTED' | 'PENDING' | 'REJECTED'
  session_id?: string
  alias?: string
}

export type IdentityFacematch = {
  state: 'VALIDATED' | 'NOT_STARTED' | 'PENDING' | 'REJECTED'
}

export enum Status {
  None = 'none',
  Pending = 'pending',
  Processing = 'processing',
  Checkmarked = 'checkmarked',
  Failed = 'failed',
}
