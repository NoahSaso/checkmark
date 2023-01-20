import { secp256k1PublicKeyToBech32Address } from '../crypto'
import { AuthorizedRequest, Env } from '../types'
import {
  seenSessionIdKey,
  getOnboardingDetails,
  pendingSessionForWalletAddressKey,
  respond,
  respondError,
  storePendingSession,
} from '../utils'
import { sessionHasCheckmark, walletHasCheckmark } from '../utils/checkmark'
import { sessionIsPaidFor } from '../utils/payment'

interface CreateSessionRequest {
  sessionId: string
}

export const createSession = async (
  request: AuthorizedRequest<CreateSessionRequest>,
  env: Env
): Promise<Response> => {
  const sessionId = request.parsedBody.data.sessionId
  if (!sessionId || typeof sessionId !== 'string') {
    return respondError(400, 'Invalid session ID.')
  }

  // Ensure session has not already been seen.
  if (await env.SESSIONS.get(seenSessionIdKey(sessionId))) {
    return respondError(409, 'Verification already used.')
  }

  // Ensure session has been paid for.
  if (!(await sessionIsPaidFor(env, sessionId))) {
    return respondError(402, "Verification hasn't been paid for.")
  }

  // Mark session used. Even if one of the below checks fails and the pending
  // session is not stored, the session should not be reused. The UI should
  // prevent the creation of a session if the wallet is already checkmarked or
  // waiting on a verification. A session should never be reused.
  await env.SESSIONS.put(seenSessionIdKey(sessionId), '1')

  const { publicKey, chainBech32Prefix } = request.parsedBody.data.auth
  const walletAddress = secp256k1PublicKeyToBech32Address(
    publicKey,
    chainBech32Prefix
  )

  // Ensure wallet not already waiting for a pending session.
  if (
    await env.SESSIONS.get(pendingSessionForWalletAddressKey(walletAddress))
  ) {
    return respondError(400, 'You are already waiting for verification.')
  }

  // Ensure neither wallet nor session already has checkmark assigned.
  if (await walletHasCheckmark(env, walletAddress)) {
    return respondError(400, 'You already have a checkmark.')
  } else if (await sessionHasCheckmark(env, sessionId)) {
    return respondError(
      400,
      'This verification is already assigned to a checkmark.'
    )
  }

  // Make sure session exists in Synaps.
  const onboardingDetails = await getOnboardingDetails(env, sessionId)
  // Ensure session is pending.
  // TODO: Maybe automatically handle verified or cancelled sessions?
  if (onboardingDetails.session.status !== 'PENDING') {
    return respondError(400, 'Verification is not pending.')
  }

  // Store pending session, failing if it already exists.
  try {
    await storePendingSession(env, walletAddress, sessionId)
  } catch (error) {
    return error instanceof Error
      ? // Potential validation error.
        respondError(400, error.message)
      : // Unexpected failure, probably will never happen.
        respondError(500, `Unexpected error: ${error}`)
  }

  // Return success.
  return respond(200, { success: true })
}
