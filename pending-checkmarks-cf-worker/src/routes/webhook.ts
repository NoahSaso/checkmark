import { Env, RequestWithProvider, Status } from '../types'
import {
  currentSessionForInitialSessionIdKey,
  respond,
  respondError,
  walletForPendingSessionIdKey,
} from '../utils'
import { attemptToAssignCheckmark } from '../utils/checkmark'

export const webhook = async (
  request: RequestWithProvider,
  env: Env
): Promise<Response> => {
  if (!(await request.provider.isWebhookAuthenticated(request))) {
    return respondError(401, 'Webhook not authenticated.')
  }

  let pendingSessionId
  try {
    pendingSessionId = await request.provider.getSessionIdFromWebhook(request)
  } catch (err) {
    return err instanceof Error
      ? respondError(400, err.message)
      : respondError(500, `Unknown error: ${err}`)
  }

  // Check if pending session exists in the DB. If not, do nothing.
  if (
    !(await env.SESSIONS.get(walletForPendingSessionIdKey(pendingSessionId)))
  ) {
    return respondError(405, `Session ${pendingSessionId} not found in DB.`)
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

  // If session is still pending, do nothing.
  if (state.status === 'pending') {
    return respondError(202, 'Session is still pending.')
  }

  // If session failed, check if we should assign a checkmark based on it
  // matching a previously verified session. We assign a checkmark if the
  // checkmark from the initially verified session has been deleted to allow for
  // a change of wallet.
  else if (state.status === 'failed') {
    // If verification failed due to duplicate, check if checkmark already
    // assigned, and assign one if not.
    if (state.failedOnlyDueToDuplicate) {
      // This should never happen, but just in case.
      if (!state.initiallySuccessfulSessionId) {
        return respondError(400, 'No initially verified session ID found.')
      }

      // Assign checkmark for new pending session ID since we found an initial
      // session that successfully verified. and the latest checkmark assigned
      // for that initial session has been deleted.
      try {
        await attemptToAssignCheckmark(
          env,
          state.initiallySuccessfulSessionId,
          pendingSessionId
        )
      } catch (error) {
        return error instanceof Error
          ? respondError(400, error.message)
          : respondError(500, `Unexpected error assigning checkmark: ${error}`)
      }

      return respond(200, {
        status: Status.Checkmarked,
      })
    }
    // If verification failed for any other reason, do nothing so the wallet can
    // view its failure status.
    else {
      return respondError(202, 'Session failed for non-duplicate reason.')
    }
  }

  // If session verified, assign checkmark.
  else if (state.status === 'succeeded') {
    // Ensure there exists no current session for this initial session. This
    // should never happen due to the uniqueness requirement where a session
    // will only verify successfully if no other session has been verified. If
    // this happens, either the uniqueness requirement is not working, or this
    // webhook fired twice for the same session. Ideally this never happens.
    if (
      await env.SESSIONS.get(
        currentSessionForInitialSessionIdKey(pendingSessionId)
      )
    ) {
      return respondError(
        400,
        `Current session already exists for this session with ID ${pendingSessionId}.`
      )
    }

    try {
      // The initial session ID is the same as the pending session ID since
      // this is the first time the session has been verified and future
      // verification attempts fail due to the uniqueness requirement.
      await attemptToAssignCheckmark(env, pendingSessionId, pendingSessionId)
    } catch (error) {
      return error instanceof Error
        ? respondError(400, error.message)
        : respondError(500, `Unexpected error assigning checkmark: ${error}`)
    }

    return respond(200, {
      status: Status.Checkmarked,
    })
  }

  // Session status should never be anything else.
  else {
    return respondError(202, `Unexpected session status: ${state.status}`)
  }
}
