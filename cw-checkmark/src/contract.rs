use cosmwasm_std::{
    to_binary, Binary, Deps, DepsMut, Empty, Env, MessageInfo, Response, StdError, StdResult,
};

use crate::error::ContractError;
use crate::msg::{
    AdminResponse, AssignerResponse, CheckmarkBannedResponse, CountResponse, ExecuteMsg,
    GetAddressResponse, GetCheckmarkResponse, InstantiateMsg, QueryMsg,
};
use crate::state::{
    ADDRESSES_TO_CHECKMARKS, ADMIN, ASSIGNER, BANNED_CHECKMARKS, CHECKMARKS_TO_ADDRESSES,
    CHECKMARK_COUNT,
};
use cosmwasm_std::entry_point;
use cw2::set_contract_version;

// Version info for migration
const CONTRACT_NAME: &str = "crates.io:cw721-checkmark";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let assigner = deps.api.addr_validate(&msg.assigner)?;
    ASSIGNER.save(deps.storage, &assigner)?;
    ADMIN.save(deps.storage, &info.sender)?;

    CHECKMARK_COUNT.save(deps.storage, &0)?;

    Ok(Response::default()
        .add_attribute("method", "instantiate")
        .add_attribute("assigner", assigner)
        .add_attribute("admin", info.sender))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Assign {
            checkmark_id,
            address,
        } => execute_assign(deps, info, checkmark_id, address),
        ExecuteMsg::Delete {} => execute_delete(deps, info),
        ExecuteMsg::RevokeCheckmark { checkmark_id } => {
            execute_revoke_checkmark(deps, info, checkmark_id)
        }
        ExecuteMsg::RevokeAddress { address } => execute_revoke_address(deps, info, address),
        ExecuteMsg::UpdateCheckmarkBan { checkmark_id, ban } => {
            execute_update_checkmark_ban(deps, info, checkmark_id, ban)
        }
        ExecuteMsg::UpdateAssigner { assigner } => execute_update_assigner(deps, info, assigner),
        ExecuteMsg::UpdateAdmin { admin } => execute_update_admin(deps, info, admin),
    }
}

fn execute_assign(
    deps: DepsMut,
    info: MessageInfo,
    checkmark_id: String,
    address: String,
) -> Result<Response, ContractError> {
    let addr = deps.api.addr_validate(&address)?;

    // Ensure the sender is the admin or the assigner.
    let admin = ADMIN.load(deps.storage)?;
    let assigner = ASSIGNER.load(deps.storage)?;
    if info.sender != assigner && info.sender != admin {
        return Err(ContractError::Unauthorized {});
    }

    // Ensure checkmark_id is not banned.
    let banned = BANNED_CHECKMARKS.has(deps.storage, checkmark_id.clone());
    if banned {
        return Err(ContractError::CheckmarkBanned {});
    }

    // Ensure checkmark_id is not already assigned.
    let existing_address = CHECKMARKS_TO_ADDRESSES.may_load(deps.storage, checkmark_id.clone())?;
    if existing_address.is_some() {
        return Err(ContractError::AlreadyAssigned {});
    }

    // Ensure address does not already have a checkmark.
    let existing_checkmark = ADDRESSES_TO_CHECKMARKS.may_load(deps.storage, addr.clone())?;
    if existing_checkmark.is_some() {
        return Err(ContractError::AlreadyHasCheckmark {});
    }

    // Assign the checkmark.
    CHECKMARKS_TO_ADDRESSES.save(deps.storage, checkmark_id.clone(), &addr)?;
    ADDRESSES_TO_CHECKMARKS.save(deps.storage, addr, &checkmark_id)?;
    CHECKMARK_COUNT.update(deps.storage, |count| Ok::<u64, StdError>(count + 1))?;

    Ok(Response::default()
        .add_attribute("method", "assign")
        .add_attribute("checkmark_id", checkmark_id)
        .add_attribute("address", address))
}

fn execute_delete(deps: DepsMut, info: MessageInfo) -> Result<Response, ContractError> {
    // Ensure address has a checkmark.
    let existing_checkmark = ADDRESSES_TO_CHECKMARKS.may_load(deps.storage, info.sender.clone())?;
    if existing_checkmark.is_none() {
        return Err(ContractError::NoCheckmark {});
    }

    let checkmark_id = existing_checkmark.unwrap();
    let addr = info.sender;

    // Remove the checkmark.
    CHECKMARKS_TO_ADDRESSES.remove(deps.storage, checkmark_id.clone());
    ADDRESSES_TO_CHECKMARKS.remove(deps.storage, addr.clone());
    CHECKMARK_COUNT.update(deps.storage, |count| Ok::<u64, StdError>(count - 1))?;

    Ok(Response::default()
        .add_attribute("method", "delete")
        .add_attribute("checkmark_id", checkmark_id)
        .add_attribute("address", addr))
}

fn execute_revoke_checkmark(
    deps: DepsMut,
    info: MessageInfo,
    checkmark_id: String,
) -> Result<Response, ContractError> {
    // Ensure the sender is the admin.
    let admin = ADMIN.load(deps.storage)?;
    if info.sender != admin {
        return Err(ContractError::Unauthorized {});
    }

    // Ensure checkmark exists.
    let existing_address = CHECKMARKS_TO_ADDRESSES.may_load(deps.storage, checkmark_id.clone())?;
    if existing_address.is_none() {
        return Err(ContractError::NoCheckmark {});
    }

    let addr = existing_address.unwrap();

    // Remove the checkmark.
    CHECKMARKS_TO_ADDRESSES.remove(deps.storage, checkmark_id.clone());
    ADDRESSES_TO_CHECKMARKS.remove(deps.storage, addr.clone());
    CHECKMARK_COUNT.update(deps.storage, |count| Ok::<u64, StdError>(count - 1))?;

    Ok(Response::default()
        .add_attribute("method", "revoke_checkmark")
        .add_attribute("checkmark_id", checkmark_id)
        .add_attribute("address", addr))
}

fn execute_revoke_address(
    deps: DepsMut,
    info: MessageInfo,
    address: String,
) -> Result<Response, ContractError> {
    // Ensure the sender is the admin.
    let admin = ADMIN.load(deps.storage)?;
    if info.sender != admin {
        return Err(ContractError::Unauthorized {});
    }

    let addr = deps.api.addr_validate(&address)?;

    // Ensure checkmark exists.
    let existing_checkmark = ADDRESSES_TO_CHECKMARKS.may_load(deps.storage, addr.clone())?;
    if existing_checkmark.is_none() {
        return Err(ContractError::NoCheckmark {});
    }

    let checkmark_id = existing_checkmark.unwrap();

    // Remove the checkmark.
    CHECKMARKS_TO_ADDRESSES.remove(deps.storage, checkmark_id.clone());
    ADDRESSES_TO_CHECKMARKS.remove(deps.storage, addr.clone());
    CHECKMARK_COUNT.update(deps.storage, |count| Ok::<u64, StdError>(count - 1))?;

    Ok(Response::default()
        .add_attribute("method", "revoke_address")
        .add_attribute("checkmark_id", checkmark_id)
        .add_attribute("address", addr))
}

fn execute_update_checkmark_ban(
    deps: DepsMut,
    info: MessageInfo,
    checkmark_id: String,
    ban: bool,
) -> Result<Response, ContractError> {
    // Ensure the sender is the admin.
    let admin = ADMIN.load(deps.storage)?;
    if info.sender != admin {
        return Err(ContractError::Unauthorized {});
    }

    // If banning, remove checkmark if exists.
    if ban {
        let existing_address =
            CHECKMARKS_TO_ADDRESSES.may_load(deps.storage, checkmark_id.clone())?;
        if let Some(addr) = existing_address {
            // Remove the checkmark.
            CHECKMARKS_TO_ADDRESSES.remove(deps.storage, checkmark_id.clone());
            ADDRESSES_TO_CHECKMARKS.remove(deps.storage, addr);
            CHECKMARK_COUNT.update(deps.storage, |count| Ok::<u64, StdError>(count - 1))?;
        }
    }

    // Add or remove from banned list.
    if ban {
        BANNED_CHECKMARKS.save(deps.storage, checkmark_id.clone(), &Empty {})?;
    } else {
        BANNED_CHECKMARKS.remove(deps.storage, checkmark_id.clone());
    }

    Ok(Response::default()
        .add_attribute("method", "update_checkmark_ban")
        .add_attribute("checkmark_id", checkmark_id)
        .add_attribute("ban", if ban { "true" } else { "false" }))
}

fn execute_update_assigner(
    deps: DepsMut,
    info: MessageInfo,
    assigner: String,
) -> Result<Response, ContractError> {
    // Ensure the sender is the admin.
    let admin = ADMIN.load(deps.storage)?;
    if info.sender != admin {
        return Err(ContractError::Unauthorized {});
    }

    let assigner = deps.api.addr_validate(&assigner)?;

    // Update the assigner.
    ASSIGNER.save(deps.storage, &assigner)?;

    Ok(Response::default()
        .add_attribute("method", "update_assigner")
        .add_attribute("assigner", assigner))
}

fn execute_update_admin(
    deps: DepsMut,
    info: MessageInfo,
    admin: String,
) -> Result<Response, ContractError> {
    // Ensure the sender is the admin.
    let current_admin = ADMIN.load(deps.storage)?;
    if info.sender != current_admin {
        return Err(ContractError::Unauthorized {});
    }

    let admin = deps.api.addr_validate(&admin)?;

    // Update the admin.
    ADMIN.save(deps.storage, &admin)?;

    Ok(Response::default()
        .add_attribute("method", "update_admin")
        .add_attribute("admin", admin))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCheckmark { address } => {
            let addr = deps.api.addr_validate(&address)?;

            to_binary(&GetCheckmarkResponse {
                checkmark_id: ADDRESSES_TO_CHECKMARKS
                    .may_load(deps.storage, addr)
                    .unwrap(),
            })
        }
        QueryMsg::GetAddress { checkmark_id } => to_binary(&GetAddressResponse {
            address: CHECKMARKS_TO_ADDRESSES
                .may_load(deps.storage, checkmark_id)
                .unwrap(),
        }),
        QueryMsg::Count {} => to_binary(&CountResponse {
            count: CHECKMARK_COUNT.load(deps.storage)?,
        }),
        QueryMsg::CheckmarkBanned { checkmark_id } => to_binary(&CheckmarkBannedResponse {
            banned: BANNED_CHECKMARKS.has(deps.storage, checkmark_id),
        }),
        QueryMsg::Assigner {} => to_binary(&AssignerResponse {
            assigner: ASSIGNER.load(deps.storage)?,
        }),
        QueryMsg::Admin {} => to_binary(&AdminResponse {
            admin: ADMIN.load(deps.storage)?,
        }),
    }
}
