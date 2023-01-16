import { secp256k1PublicKeyToBech32Address } from '../crypto'
import { AuthorizedRequest, Env, Status } from '../types'
import {
  getOnboardingDetails,
  pendingSessionForWalletAddressKey,
  respond,
} from '../utils'
import { walletHasCheckmark } from '../utils/checkmark'

export const getStatus = async (
  request: AuthorizedRequest,
  env: Env
): Promise<Response> => {
  const { publicKey, chainBech32Prefix } = request.parsedBody.data.auth
  const walletAddress = secp256k1PublicKeyToBech32Address(
    publicKey,
    chainBech32Prefix
  )

  // Check if wallet already has checkmark.
  if (await walletHasCheckmark(env, walletAddress)) {
    return respond(200, {
      status: Status.Checkmarked,
    })
  }

  // Find pending session for wallet.
  const pendingSessionId = await env.SESSIONS.get(
    pendingSessionForWalletAddressKey(walletAddress)
  )
  if (!pendingSessionId) {
    return respond(200, {
      status: Status.None,
    })
  }

  // Return status based on session status.
  const onboardingDetails = await getOnboardingDetails(env, pendingSessionId)
  if (onboardingDetails.session.status === 'PENDING') {
    return respond(200, {
      status: Status.Pending,
    })
  }
  // If session failed, return reasons.
  else if (onboardingDetails.session.status === 'CANCELLED') {
    const failedSteps = Object.values(onboardingDetails.steps)
      .map((step) => {
        if (
          step.type === 'LIVENESS' &&
          step.verification.state === 'REJECTED'
        ) {
          return 'Failed to verify liveness.'
        } else if (step.type === 'IDENTITY') {
          if (
            step.verification.document &&
            step.verification.document.state === 'REJECTED'
          ) {
            return step.verification.document.rejection.user_reason
          } else if (
            step.verification.duplicate &&
            step.verification.duplicate.state === 'REJECTED'
          ) {
            // This should only happen if the user is trying to verify when they
            // already have a checkmark, which the UI should prevent. When they
            // don't already have a checkmark, a failed duplicate check should
            // result in the webhook assigning them a checkmark since their
            // identity has been confirmed in the past and now they are
            // switching wallets.
            return 'Identity already verified.'
          } else if (
            step.verification.facematch &&
            step.verification.facematch.state === 'REJECTED'
          ) {
            return 'Face does not appear to match ID submitted.'
          }
        }
      })
      .filter((step): step is string => !!step)

    return respond(200, {
      status: Status.Failed,
      errors: failedSteps.length ? failedSteps : ['Unknown error.'],
    })
  }
  // Session should only be successful when the session succeeded and the
  // webhook has not yet been fired, because the webhook triggers the checkmark
  // assignment and subsequent pending session ID removal from the KV store.
  else {
    return respond(200, {
      status: Status.Processing,
    })
  }
}
