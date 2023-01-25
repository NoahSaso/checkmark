import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { GasPrice } from '@cosmjs/stargate'
import { Env } from '../types'

export const CHAIN_ID = 'juno-1'
export const CHAIN_RPC = 'https://rpc.juno.strange.love:443'
export const CHAIN_BECH32_PREFIX = 'juno'
export const GAS_PRICE = '0.0025ujuno'

let cosmWasmClient: CosmWasmClient | undefined
export const getCosmWasmClient = async (): Promise<CosmWasmClient> => {
  if (!cosmWasmClient) {
    cosmWasmClient = await CosmWasmClient.connect(CHAIN_RPC)
  }
  return cosmWasmClient
}

export const getSigningCosmWasmClient = async ({
  WALLET_MNEMONIC,
}: Env): Promise<{
  client: SigningCosmWasmClient
  walletAddress: string
}> => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(WALLET_MNEMONIC, {
    prefix: CHAIN_BECH32_PREFIX,
  })
  const walletAddress = (await wallet.getAccounts())[0].address

  const client = await SigningCosmWasmClient.connectWithSigner(
    CHAIN_RPC,
    wallet,
    {
      gasPrice: GasPrice.fromString(GAS_PRICE),
    }
  )

  return {
    client,
    walletAddress,
  }
}
