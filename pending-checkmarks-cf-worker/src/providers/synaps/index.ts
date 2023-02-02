import { objectMatchesStructure } from '../../utils'
import { ProviderLoader } from '../types'
import { getOnboardingDetails } from './api'
import { VerificationStepIdentity } from './types'

export const Synaps: ProviderLoader = {
  id: 'synaps',
  load: (env) => ({
    isWebhookAuthenticated: async (request) => {
      const secret = request.query?.secret
      return !!secret && secret === env.SYNAPS_WEBHOOK_SECRET
    },

    getSessionIdFromWebhook: async (request) => {
      const body = await request.json?.()
      if (
        !objectMatchesStructure(body, {
          session_id: {},
        }) ||
        typeof body.session_id !== 'string' ||
        !body.session_id
      ) {
        throw new Error('Invalid body.')
      }

      return body.session_id
    },

    getSessionState: async (sessionId: string) => {
      const onboardingDetails = await getOnboardingDetails(env, sessionId)
      switch (onboardingDetails.session.status) {
        // Synaps sessions are still pending even when rejected.
        case 'PENDING':
        case 'CANCELLED':
          const steps = Object.values(onboardingDetails.steps)

          const reasons = steps
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
                  // TODO: Verify this is safe for anyone to read, or scrub it.
                  return step.verification.document.rejection.user_reason
                } else if (
                  step.verification.duplicate &&
                  step.verification.duplicate.state === 'REJECTED'
                ) {
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

          const failedOnlyDueToDuplicate = steps.every(
            (step) =>
              (step.type === 'LIVENESS' &&
                step.verification.state === 'VALIDATED') ||
              (step.type === 'IDENTITY' &&
                step.verification.duplicate &&
                step.verification.duplicate.state === 'REJECTED' &&
                step.verification.document &&
                step.verification.document.state === 'VALIDATED' &&
                step.verification.facematch &&
                step.verification.facematch.state === 'VALIDATED')
          )

          const initiallySuccessfulSessionId = steps.find(
            (step): step is VerificationStepIdentity => step.type === 'IDENTITY'
          )?.verification?.duplicate?.session_id

          // Check if all steps have been validated or rejected to determine if
          // session has failed or is still pending.
          const noStepsPending = steps.every(
            (step) =>
              (step.type === 'LIVENESS' &&
                (step.verification.state === 'VALIDATED' ||
                  step.verification.state === 'REJECTED')) ||
              (step.type === 'IDENTITY' &&
                step.verification.duplicate &&
                (step.verification.duplicate.state === 'VALIDATED' ||
                  step.verification.duplicate.state === 'REJECTED') &&
                step.verification.document &&
                (step.verification.document.state === 'VALIDATED' ||
                  step.verification.document.state === 'REJECTED') &&
                step.verification.facematch &&
                (step.verification.facematch.state === 'VALIDATED' ||
                  step.verification.facematch.state === 'REJECTED'))
          )

          return {
            status: noStepsPending ? 'failed' : 'pending',
            reasons,
            failedOnlyDueToDuplicate,
            initiallySuccessfulSessionId,
          }

        case 'VERIFIED':
          return {
            status: 'succeeded',
          }

        default:
          throw new Error(
            `Unexpected session status: ${onboardingDetails.session.status}`
          )
      }
    },
  }),
}
