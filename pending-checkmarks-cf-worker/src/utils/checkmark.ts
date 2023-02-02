import { Env } from '../types'
import { getCosmWasmClient, getSigningCosmWasmClient } from './chain'
import {
  clearPendingSession,
  currentSessionForInitialSessionIdKey,
  hashSessionId,
  walletForPendingSessionIdKey,
} from './keys'

// If a wallet has a checkmark assigned.
export const walletHasCheckmark = async (
  { CHECKMARK_CONTRACT_ADDRESS }: Env,
  walletAddress: string
): Promise<boolean> => {
  const client = await getCosmWasmClient()
  return !!(
    await client.queryContractSmart(CHECKMARK_CONTRACT_ADDRESS, {
      get_checkmark: { address: walletAddress },
    })
  ).checkmark_id
}

// If a checkmark has been assigned to a wallet for this session.
export const sessionHasCheckmark = async (
  { CHECKMARK_CONTRACT_ADDRESS }: Env,
  sessionId: string
): Promise<boolean> => {
  const client = await getCosmWasmClient()
  return !!(
    await client.queryContractSmart(CHECKMARK_CONTRACT_ADDRESS, {
      get_address: { checkmark_id: hashSessionId(sessionId) },
    })
  ).address
}

// If a session has been banned from receiving checkmarks.
export const sessionIsBanned = async (
  { CHECKMARK_CONTRACT_ADDRESS }: Env,
  sessionId: string
): Promise<boolean> => {
  const client = await getCosmWasmClient()
  return (
    await client.queryContractSmart(CHECKMARK_CONTRACT_ADDRESS, {
      checkmark_banned: { checkmark_id: hashSessionId(sessionId) },
    })
  ).banned
}

// This function attempts to assign a checkmark for the pending session ID given
// its initial session ID.
//
// It makes sure that:
//   - The most recently assigned checkmark for the initial session does not
//     currently have a checkmark assigned.
//   - The wallet address for the pending session ID has not already been
//     assigned a checkmark.
export const attemptToAssignCheckmark = async (
  env: Env,
  initialSessionId: string,
  pendingSessionId: string
): Promise<void> => {
  // Get session ID for which checkmark is currently or was most recently
  // assigned, based on the initial successful session ID. If the pending
  // session is the initial session, then we are about to assign a checkmark
  // for the first time, and the current session is the pending session.
  const currentSessionId =
    initialSessionId === pendingSessionId
      ? pendingSessionId
      : await env.SESSIONS.get(
          currentSessionForInitialSessionIdKey(initialSessionId)
        )
  // If no current session ID, something went wrong. A successful verification
  // should result in a checkmark assignment, and subsequently a current session
  // ID being stored, so a current session should always be found.
  if (!currentSessionId) {
    throw new Error('No current session found.')
  }

  // Check if checkmark has been banned from beign assigned for this session.
  const checkmarkBanned = await sessionIsBanned(env, initialSessionId)
  if (checkmarkBanned) {
    throw new Error('Checkmark banned for this identity.')
  }

  // Check if checkmark assigned for current session. If so, the user tried
  // to verify while already having a checkmark, which the UI should
  // prevent.
  const checkmarkAssigned = await sessionHasCheckmark(env, currentSessionId)
  if (checkmarkAssigned) {
    throw new Error('Checkmark already assigned for this identity.')
  }

  // Get wallet address for this pending session to assign the checkmark to.
  const destinationWalletAddress = await env.SESSIONS.get(
    walletForPendingSessionIdKey(pendingSessionId)
  )
  if (!destinationWalletAddress) {
    throw new Error('No wallet found for pending session.')
  }

  // Ensure wallet has not already been assigned a checkmark. This shouldn't
  // happen as the UI should prevent the user from attempting to verify if they
  // already have a checkmark, but just in case.
  if (await walletHasCheckmark(env, destinationWalletAddress)) {
    throw new Error('Wallet already has a checkmark assigned.')
  }

  const { client, walletAddress } = await getSigningCosmWasmClient(env)

  // Try to assign a checkmark. It should succeed given all the checks above.
  // Use the hash of the latest session ID.
  await client.execute(
    walletAddress,
    env.CHECKMARK_CONTRACT_ADDRESS,
    {
      assign: {
        checkmark_id: hashSessionId(pendingSessionId),
        address: destinationWalletAddress,
      },
    },
    'auto'
  )

  // Update the current session ID for the initial session ID to be the newly
  // assigned pending session ID.
  await env.SESSIONS.put(
    currentSessionForInitialSessionIdKey(initialSessionId),
    pendingSessionId
  )

  // Clear pending session <=> wallet address mappings since we have now
  // assigned a checkmark and updated the current session.
  await clearPendingSession(env, pendingSessionId)
}
