import { Request } from 'itty-router'

import { Env, Status, VerificationStepIdentity } from '../types'
import {
  currentSessionForInitialSessionIdKey,
  getOnboardingDetails,
  objectMatchesStructure,
  respond,
  respondError,
  walletForPendingSessionIdKey,
} from '../utils'
import { attemptToAssignCheckmark } from '../utils/checkmark'

export const synapsWebhook = async (
  request: Request,
  env: Env
): Promise<Response> => {
  const secret = request.params?.secret
  if (!secret || secret !== env.SYNAPS_WEBHOOK_SECRET) {
    return respondError(401, 'Invalid secret.')
  }

  const body = await request.json?.()
  if (
    !objectMatchesStructure(body, {
      session_id: {},
    })
  ) {
    return respondError(400, 'Invalid body.')
  }

  const { session_id: pendingSessionId } = body

  // Check if pending session exists in the DB. If not, do nothing.
  if (
    !(await env.SESSIONS.get(walletForPendingSessionIdKey(pendingSessionId)))
  ) {
    return respondError(
      405,
      `Session not found in DB. Webhook data:\n${JSON.stringify(body, null, 2)}`
    )
  }

  // Get synaps session details.
  const onboardingDetails = await getOnboardingDetails(env, pendingSessionId)

  // If session is still pending, do nothing.
  if (onboardingDetails.session.status === 'PENDING') {
    return respondError(412, 'Session is still pending.')
  }

  // If session failed, check if we should assign a checkmark based on it
  // matching a previously verified session. We assign a checkmark if the
  // checkmark from the initially verified session has been deleted to allow for
  // a change of wallet.
  else if (onboardingDetails.session.status === 'CANCELLED') {
    // Find if verification failed only due to identity duplicate.
    const steps = Object.values(onboardingDetails.steps)
    const failedDueToDuplicate = steps.every(
      (step) =>
        (step.type === 'LIVENESS' && step.verification.state === 'VALIDATED') ||
        (step.type === 'IDENTITY' &&
          step.verification.duplicate &&
          step.verification.duplicate.state === 'REJECTED' &&
          step.verification.document &&
          step.verification.document.state === 'VALIDATED' &&
          step.verification.facematch &&
          step.verification.facematch.state === 'VALIDATED')
    )
    // If verification failed due to duplicate, check if checkmark already
    // assigned, and assign one if not.
    if (failedDueToDuplicate) {
      // Get initially verified session ID.
      const initialSessionId = steps.find(
        (step): step is VerificationStepIdentity => step.type === 'IDENTITY'
      )?.verification.duplicate.session_id
      // This should never happen, but just in case.
      if (!initialSessionId) {
        return respondError(400, 'No initially verified session ID found.')
      }

      // Assign checkmark for new pending session ID since we found an initial
      // session that successfully verified. and the latest checkmark assigned
      // for that initial session has been deleted.
      try {
        await attemptToAssignCheckmark(env, initialSessionId, pendingSessionId)
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
      return respondError(412, 'Session failed for non-duplicate reason.')
    }
  }

  // If session verified, assign checkmark.
  else if (onboardingDetails.session.status === 'VERIFIED') {
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
    return respondError(
      412,
      `Unexpected session status: ${onboardingDetails.session.status}`
    )
  }
}
