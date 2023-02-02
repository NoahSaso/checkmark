import { secp256k1PublicKeyToBech32Address } from '../crypto'
import { Env, RequestWithProvider, Status } from '../types'
import {
  pendingSessionForWalletAddressKey,
  respond,
  respondError,
} from '../utils'
import { walletHasCheckmark } from '../utils/checkmark'

const chainBech32Prefix = 'juno'

export const getStatus = async (
  request: RequestWithProvider,
  env: Env
): Promise<Response> => {
  const publicKey = request.params?.publicKey
  if (!publicKey) {
    return respondError(400, 'Missing publicKey.')
  }

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

  // Get session state.
  let state
  try {
    state = await request.provider.getSessionState(pendingSessionId)
  } catch (err) {
    return respondError(
      500,
      err instanceof Error ? err.message : `Unknown error: ${err}`
    )
  }

  // Return status based on session status.
  if (state.status === 'pending') {
    return respond(200, {
      status: Status.Pending,
    })
  }
  // If session failed, return reasons.
  else if (state.status === 'failed') {
    return respond(200, {
      status: Status.Failed,
      errors: state.reasons.length ? state.reasons : ['Unknown error.'],
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
