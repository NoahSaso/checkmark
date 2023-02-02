/* eslint-disable @typescript-eslint/ban-types */

import { Coin, StdFee } from '@cosmjs/amino'
import {
  CosmWasmClient,
  ExecuteResult,
  SigningCosmWasmClient,
} from '@cosmjs/cosmwasm-stargate'

export interface InstantiateMsg {
  assigner: string
  owner?: string | null
}
export type ExecuteMsg =
  | {
      assign: {
        address: string
        checkmark_id: string
      }
    }
  | {
      delete: {}
    }
  | {
      revoke_checkmark: {
        checkmark_id: string
      }
    }
  | {
      revoke_address: {
        address: string
      }
    }
  | {
      update_checkmark_ban: {
        ban_ids?: string[] | null
        unban_ids?: string[] | null
      }
    }
  | {
      update_assigner: {
        assigner: string
      }
    }
  | {
      update_ownership: Action
    }
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
export type QueryMsg =
  | {
      get_checkmark: {
        address: string
      }
    }
  | {
      get_address: {
        checkmark_id: string
      }
    }
  | {
      count: {}
    }
  | {
      checkmark_banned: {
        checkmark_id: string
      }
    }
  | {
      assigner: {}
    }
  | {
      ownership: {}
    }
export type Addr = string
export interface AssignerResponse {
  assigner: Addr
}
export interface CheckmarkBannedResponse {
  banned: boolean
}
export interface CountResponse {
  count: number
}
export interface GetAddressResponse {
  address?: Addr | null
}
export interface GetCheckmarkResponse {
  checkmark_id?: string | null
}
export interface OwnershipForString {
  owner?: string | null
  pending_expiry?: Expiration | null
  pending_owner?: string | null
}

export interface CwCheckmarkReadOnlyInterface {
  contractAddress: string
  getCheckmark: ({
    address,
  }: {
    address: string
  }) => Promise<GetCheckmarkResponse>
  getAddress: ({
    checkmarkId,
  }: {
    checkmarkId: string
  }) => Promise<GetAddressResponse>
  count: () => Promise<CountResponse>
  checkmarkBanned: ({
    checkmarkId,
  }: {
    checkmarkId: string
  }) => Promise<CheckmarkBannedResponse>
  assigner: () => Promise<AssignerResponse>
  ownership: () => Promise<OwnershipForString>
}
export class CwCheckmarkQueryClient implements CwCheckmarkReadOnlyInterface {
  client: CosmWasmClient
  contractAddress: string

  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client
    this.contractAddress = contractAddress
    this.getCheckmark = this.getCheckmark.bind(this)
    this.getAddress = this.getAddress.bind(this)
    this.count = this.count.bind(this)
    this.checkmarkBanned = this.checkmarkBanned.bind(this)
    this.assigner = this.assigner.bind(this)
    this.ownership = this.ownership.bind(this)
  }

  getCheckmark = async ({
    address,
  }: {
    address: string
  }): Promise<GetCheckmarkResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      get_checkmark: {
        address,
      },
    })
  }
  getAddress = async ({
    checkmarkId,
  }: {
    checkmarkId: string
  }): Promise<GetAddressResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      get_address: {
        checkmark_id: checkmarkId,
      },
    })
  }
  count = async (): Promise<CountResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      count: {},
    })
  }
  checkmarkBanned = async ({
    checkmarkId,
  }: {
    checkmarkId: string
  }): Promise<CheckmarkBannedResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      checkmark_banned: {
        checkmark_id: checkmarkId,
      },
    })
  }
  assigner = async (): Promise<AssignerResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      assigner: {},
    })
  }
  ownership = async (): Promise<OwnershipForString> => {
    return this.client.queryContractSmart(this.contractAddress, {
      ownership: {},
    })
  }
}
export interface CwCheckmarkInterface extends CwCheckmarkReadOnlyInterface {
  contractAddress: string
  sender: string
  assign: (
    {
      address,
      checkmarkId,
    }: {
      address: string
      checkmarkId: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
  delete: (
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
  revokeCheckmark: (
    {
      checkmarkId,
    }: {
      checkmarkId: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
  revokeAddress: (
    {
      address,
    }: {
      address: string
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
  updateCheckmarkBan: (
    {
      banIds,
      unbanIds,
    }: {
      banIds?: string[]
      unbanIds?: string[]
    },
    fee?: number | StdFee | 'auto',
    memo?: string,
    funds?: Coin[]
  ) => Promise<ExecuteResult>
  updateAssigner: (
    {
      assigner,
    }: {
      assigner: string
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
export class CwCheckmarkClient
  extends CwCheckmarkQueryClient
  implements CwCheckmarkInterface
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
    this.assign = this.assign.bind(this)
    this.delete = this.delete.bind(this)
    this.revokeCheckmark = this.revokeCheckmark.bind(this)
    this.revokeAddress = this.revokeAddress.bind(this)
    this.updateCheckmarkBan = this.updateCheckmarkBan.bind(this)
    this.updateAssigner = this.updateAssigner.bind(this)
    this.updateOwnership = this.updateOwnership.bind(this)
  }

  assign = async (
    {
      address,
      checkmarkId,
    }: {
      address: string
      checkmarkId: string
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        assign: {
          address,
          checkmark_id: checkmarkId,
        },
      },
      fee,
      memo,
      funds
    )
  }
  delete = async (
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        delete: {},
      },
      fee,
      memo,
      funds
    )
  }
  revokeCheckmark = async (
    {
      checkmarkId,
    }: {
      checkmarkId: string
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        revoke_checkmark: {
          checkmark_id: checkmarkId,
        },
      },
      fee,
      memo,
      funds
    )
  }
  revokeAddress = async (
    {
      address,
    }: {
      address: string
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        revoke_address: {
          address,
        },
      },
      fee,
      memo,
      funds
    )
  }
  updateCheckmarkBan = async (
    {
      banIds,
      unbanIds,
    }: {
      banIds?: string[]
      unbanIds?: string[]
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_checkmark_ban: {
          ban_ids: banIds,
          unban_ids: unbanIds,
        },
      },
      fee,
      memo,
      funds
    )
  }
  updateAssigner = async (
    {
      assigner,
    }: {
      assigner: string
    },
    fee: number | StdFee | 'auto' = 'auto',
    memo?: string,
    funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_assigner: {
          assigner,
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
