import { CheckedDenom, CwReceiptQueryClient } from '../contracts/CwReceipt'
import { Env } from '../types'
import { getCosmWasmClient } from './chain'
import { hashSessionId } from './keys'

export const sessionIsPaidFor = async (
  {
    PAYMENT_CONTRACT_ADDRESS,
    PAYMENT_AMOUNT,
    PAYMENT_DENOM,
    PAYMENT_DENOM_TYPE,
  }: Env,
  sessionId: string
): Promise<boolean> => {
  const client = await getCosmWasmClient()

  const { totals } = await new CwReceiptQueryClient(
    client,
    PAYMENT_CONTRACT_ADDRESS
  ).listTotalsPaidToId({
    id: hashSessionId(sessionId),
  })

  return totals.some(
    (total) =>
      PAYMENT_DENOM_TYPE in total.denom &&
      total.denom[PAYMENT_DENOM_TYPE as keyof CheckedDenom] === PAYMENT_DENOM &&
      total.amount === PAYMENT_AMOUNT
  )
}
