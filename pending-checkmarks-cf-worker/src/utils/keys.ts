import { Env } from '../types'

// The key that maps from a pending session ID to the wallet address that
// initiated it.
export const walletForPendingSessionIdKey = (pendingSessionId: string) =>
  `WALLET_FOR:${pendingSessionId}`

// The key that maps from a wallet address to the pending session ID that it
// initiated.
export const pendingSessionForWalletAddressKey = (walletAddress: string) =>
  `PENDING_SESSION_FOR:${walletAddress}`

// The key that keeps track of whether or not we've already seen a session ID.
export const seenSessionIdKey = (sessionId: string) =>
  `SESSION_SEEN:${sessionId}`

// The key that maps from an initial session ID to the current session ID. The
// current session ID will be the same as the initial session ID on the first
// successful verification. On future checkmark deletes and reverifications, the
// initial successful session ID will stay the same, and this will map to the
// latest attempt that resulted in a new checkmark being assigned. If a
// checkmark is deleted, the initial session ID will point to the last session
// that had a checkmark assigned.
export const currentSessionForInitialSessionIdKey = (
  initialSessionId: string
) => `CURRENT_SESSION_FOR:${initialSessionId}`

export const storePendingSession = async (
  { SESSIONS }: Env,
  walletAddress: string,
  pendingSessionId: string
): Promise<void> => {
  const sessionKey = pendingSessionForWalletAddressKey(walletAddress)
  const walletKey = walletForPendingSessionIdKey(pendingSessionId)

  // Make sure pending session does not already exist for this wallet and that
  // this session is not already attached to another wallet. We don't expect
  // either of these to happen as long as the UI prevents the user from creating
  // a new session while they have one pending. Multiple tabs or a malicious
  // user trying to reuse a session could trigger this.
  const existingPendingSessionIdForWallet = await SESSIONS.get(sessionKey)
  if (existingPendingSessionIdForWallet) {
    throw new Error('You already have a pending verification.')
  }

  const existingWalletAddressForPendingSession = await SESSIONS.get(walletKey)
  if (existingWalletAddressForPendingSession) {
    throw new Error(
      'This pending verification is already attached to a wallet.'
    )
  }

  // Store session.
  await SESSIONS.put(sessionKey, pendingSessionId)
  await SESSIONS.put(walletKey, walletAddress)
}

export const clearPendingSession = async (
  { SESSIONS }: Env,
  pendingSessionId: string
): Promise<void> => {
  // Get wallet address for pending session, to verify that mapping exists
  // before clearing it.
  const walletKey = walletForPendingSessionIdKey(pendingSessionId)
  const walletAddress = await SESSIONS.get(walletKey)
  if (!walletAddress) {
    throw new Error('No wallet address found for pending session.')
  }

  const sessionKey = pendingSessionForWalletAddressKey(walletAddress)

  // Clear mappings between wallet address and pending session ID.
  await SESSIONS.delete(sessionKey)
  await SESSIONS.delete(walletKey)
}
