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
