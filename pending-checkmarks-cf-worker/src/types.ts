import { Request as IttyRequest } from 'itty-router'
import { Provider } from './providers/types'

export interface Env {
  NONCES: KVNamespace
  SESSIONS: KVNamespace

  // Environment variables.
  PROVIDER_ID: string
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

export interface RequestWithProvider extends IttyRequest {
  provider: Provider
}

export interface AuthorizedRequest<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data extends Record<string, any> = Record<string, any>
> extends RequestWithProvider {
  parsedBody: RequestBody<Data>
}

export enum Status {
  None = 'none',
  Pending = 'pending',
  Processing = 'processing',
  Checkmarked = 'checkmarked',
  Failed = 'failed',
}
