/* eslint-disable @typescript-eslint/ban-types */

import { Coin, StdFee } from '@cosmjs/amino'
import {
  CosmWasmClient,
  ExecuteResult,
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate'

export interface InstantiateMsg {
  output: string
  owner?: string | null
}
export type ExecuteMsg =
  | {
      receive: Cw20ReceiveMsg
    }
  | {
      pay: {
        id: string
      }
    }
  | {
      update_output: {
        output: string
      }
    }
  | {
      update_ownership: Action
    }
export type Uint128 = string
export type Binary = string
export type Action =
  | {
      transfer_ownership: {
        expiry?: Expiration | null
        new_owner: string
      }
    }
  | 'accept_ownership'
  | 'renounce_ownership'
export type Expiration =
  | {
      at_height: number
    }
  | {
      at_time: Timestamp
    }
  | {
      never: {}
    }
export type Timestamp = Uint64
export type Uint64 = string
export interface Cw20ReceiveMsg {
  amount: Uint128
  msg: Binary
  sender: string
}
export type QueryMsg =
  | {
      output: {}
    }
  | {
      list_payments_to_id: {
        id: string
        limit?: number | null
        start_after?: number | null
      }
    }
  | {
      list_totals_paid_to_id: {
        id: string
        limit?: number | null
        start_after?: CheckedDenom | null
      }
    }
  | {
      list_ids_for_payer: {
        limit?: number | null
        payer: string
        start_after?: string | null
      }
    }
  | {
      list_totals_paid_by_payer: {
        limit?: number | null
        payer: string
        start_after?: CheckedDenom | null
      }
    }
  | {
      ownership: {}
    }
export type CheckedDenom =
  | {
      native: string
    }
  | {
      cw20: Addr
    }
export type Addr = string
export interface ListIdsForPayerResponse {
  ids: string[]
}
export interface ListPaymentsToIdResponse {
  payments: PaymentWithId[]
}
export interface PaymentWithId {
  id: number
  payment: Payment
}
export interface Payment {
  amount: Uint128
  block: BlockInfo
  denom: CheckedDenom
}
export interface BlockInfo {
  chain_id: string
  height: number
  time: Timestamp
  [k: string]: unknown
}
export interface ListTotalsPaidByPayerResponse {
  totals: Total[]
}
export interface Total {
  amount: Uint128
  denom: CheckedDenom
}
export interface ListTotalsPaidToIdResponse {
  totals: Total[]
}
export interface OutputResponse {
  output: Addr
}
export interface OwnershipForString {
  owner?: string | null
  pending_expiry?: Expiration | null
  pending_owner?: string | null
}

export interface CwReceiptReadOnlyInterface {
  contractAddress: string
  output: () => Promise<OutputResponse>
  listPaymentsToId: ({
    id,
    limit,
    startAfter,
  }: {
    id: string
    limit?: number
    startAfter?: number
  }) => Promise<ListPaymentsToIdResponse>
  listTotalsPaidToId: ({
    id,
    limit,
    startAfter,
  }: {
    id: string
    limit?: number
    startAfter?: CheckedDenom
  }) => Promise<ListTotalsPaidToIdResponse>
  listIdsForPayer: ({
    limit,
    payer,
    startAfter,
  }: {
    limit?: number
    payer: string
    startAfter?: string
  }) => Promise<ListIdsForPayerResponse>
  listTotalsPaidByPayer: ({
    limit,
    payer,
    startAfter,
  }: {
    limit?: number
    payer: string
    startAfter?: CheckedDenom
  }) => Promise<ListTotalsPaidByPayerResponse>
  ownership: () => Promise<OwnershipForString>
}
export class CwReceiptQueryClient implements CwReceiptReadOnlyInterface {
  client: CosmWasmClient
  contractAddress: string

  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client
    this.contractAddress = contractAddress
    this.output = this.output.bind(this)
    this.listPaymentsToId = this.listPaymentsToId.bind(this)
    this.listTotalsPaidToId = this.listTotalsPaidToId.bind(this)
    this.listIdsForPayer = this.listIdsForPayer.bind(this)
    this.listTotalsPaidByPayer = this.listTotalsPaidByPayer.bind(this)
    this.ownership = this.ownership.bind(this)
  }

  output = async (): Promise<OutputResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      output: {},
    })
  }
  listPaymentsToId = async ({
    id,
    limit,
    startAfter,
  }: {
    id: string
    limit?: number
    startAfter?: number
  }): Promise<ListPaymentsToIdResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      list_payments_to_id: {
        id,
        limit,
        start_after: startAfter,
      },
    })
  }
  listTotalsPaidToId = async ({
    id,
    limit,
    startAfter,
  }: {
    id: string
    limit?: number
    startAfter?: CheckedDenom
  }): Promise<ListTotalsPaidToIdResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      list_totals_paid_to_id: {
        id,
        limit,
        start_after: startAfter,
      },
    })
  }
  listIdsForPayer = async ({
    limit,
    payer,
    startAfter,
  }: {
    limit?: number
    payer: string
    startAfter?: string
  }): Promise<ListIdsForPayerResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      list_ids_for_payer: {
        limit,
        payer,
        start_after: startAfter,
      },
    })
  }
  listTotalsPaidByPayer = async ({
    limit,
    payer,
    startAfter,
  }: {
    limit?: number
    payer: string
    startAfter?: CheckedDenom
  }): Promise<ListTotalsPaidByPayerResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      list_totals_paid_by_payer: {
        limit,
        payer,
        start_after: startAfter,
      },
    })
  }
  ownership = async (): Promise<OwnershipForString> => {
    return this.client.queryContractSmart(this.contractAddress, {
      ownership: {},
    })
  }
}
export interface CwReceiptInterface extends CwReceiptReadOnlyInterface {
  contractAddress: string
  sender: string
  receive: (
    {
      amount,
      msg,
      sender,
    }: {
      amount: Uint128
      msg: Binary
      sender: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
  pay: (
    {
      id,
    }: {
      id: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
  updateOutput: (
    {
      output,
    }: {
      output: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
  updateOwnership: (
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
}
export class CwReceiptClient
  extends CwReceiptQueryClient
  implements CwReceiptInterface
{
  client: SigningCosmWasmClient
  sender: string
  contractAddress: string

  constructor(
    client: SigningCosmWasmClient,
    sender: string,
    contractAddress: string
  ) {
    super(client, contractAddress)
    this.client = client
    this.sender = sender
    this.contractAddress = contractAddress
    this.receive = this.receive.bind(this)
    this.pay = this.pay.bind(this)
    this.updateOutput = this.updateOutput.bind(this)
    this.updateOwnership = this.updateOwnership.bind(this)
  }

  receive = async (
    {
      amount,
      msg,
      sender,
    }: {
      amount: Uint128
      msg: Binary
      sender: string
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        receive: {
          amount,
          msg,
          sender,
        },
      },
      fee,
      memo,
      funds
    )
  }
  pay = async (
    {
      id,
    }: {
      id: string
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        pay: {
          id,
        },
      },
      fee,
      memo,
      funds
    )
  }
  updateOutput = async (
    {
      output,
    }: {
      output: string
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_output: {
          output,
        },
      },
      fee,
      memo,
      funds
    )
  }
  updateOwnership = async (
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_ownership: {},
      },
      fee,
      memo,
      funds
    )
  }
}
