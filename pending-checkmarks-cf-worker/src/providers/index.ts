import { Env, RequestWithProvider } from '../types'

import { Synaps } from './synaps'
import { Provider, ProviderLoader } from './types'

const getProvider = (env: Env): Provider => {
  const providerLoaders: ProviderLoader[] = [
    // Add provider loaders here.
    Synaps,
  ]

  const providerLoader = providerLoaders.find(
    ({ id }) => id === env.PROVIDER_ID
  )
  if (!providerLoader) {
    throw new Error(`Unknown PROVIDER_ID: ${env.PROVIDER_ID}`)
  }

  return providerLoader.load(env)
}

export const loadProviderMiddleware = (
  request: RequestWithProvider,
  env: Env
) => {
  const provider = getProvider(env)
  request.provider = provider
}
