import { Env } from '../../types'
import { OnboardingDetails } from './types'

export const getOnboardingDetails = async (
  { SYNAPS_CLIENT_ID, SYNAPS_API_KEY }: Env,
  sessionId: string
): Promise<OnboardingDetails> => {
  const response = await fetch(
    'https://individual-api.synaps.io/v3/onboarding/details',
    {
      method: 'GET',
      headers: {
        'Session-Id': sessionId,
        'Client-Id': SYNAPS_CLIENT_ID,
        'Api-Key': SYNAPS_API_KEY,
      },
    }
  )
  if (response.ok) {
    return await response.json()
  }

  throw new Error(
    `Synaps error: ${response.status} ${response.statusText} ${await response
      .text()
      .catch(() => '')}`.trim()
  )
}
