import { Env } from '../types'
import { getCosmWasmClient } from './chain'
import { hashSessionId } from './keys'

export const sessionIsPaidFor = async (
  { PAYMENT_CONTRACT_ADDRESS }: Env,
  sessionId: string
) => {
  const client = await getCosmWasmClient()
  return (
    await client.queryContractSmart(PAYMENT_CONTRACT_ADDRESS, {
      paid: { id: hashSessionId(sessionId) },
    })
  ).paid
}
