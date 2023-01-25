use cosmwasm_std::{
    to_binary, Binary, Deps, DepsMut, Empty, Env, MessageInfo, Response, StdError, StdResult,
};

use crate::error::ContractError;
use crate::msg::{
    AssignerResponse, CheckmarkBannedResponse, CountResponse, ExecuteMsg, GetAddressResponse,
    GetCheckmarkResponse, InstantiateMsg, QueryMsg,
};
use crate::state::{
    ADDRESSES_TO_CHECKMARKS, ASSIGNER, BANNED_CHECKMARKS, CHECKMARKS_TO_ADDRESSES, CHECKMARK_COUNT,
};
use cosmwasm_std::entry_point;
use cw2::set_contract_version;

// Version info for migration
const CONTRACT_NAME: &str = "crates.io:cw-checkmark";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    cw_ownable::initialize_owner(deps.storage, deps.api, msg.owner.as_deref())?;

    let assigner = deps.api.addr_validate(&msg.assigner)?;
    ASSIGNER.save(deps.storage, &assigner)?;

    CHECKMARK_COUNT.save(deps.storage, &0)?;

    Ok(Response::default()
        .add_attribute("method", "instantiate")
        .add_attribute("assigner", assigner)
        .add_attribute("owner", msg.owner.unwrap_or_default()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
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
        ExecuteMsg::UpdateCheckmarkBan { ban_ids, unban_ids } => {
            execute_update_checkmark_ban(deps, info, ban_ids, unban_ids)
        }
        ExecuteMsg::UpdateAssigner { assigner } => execute_update_assigner(deps, info, assigner),
        ExecuteMsg::UpdateOwnership(action) => execute_update_owner(deps, env, info, action),
    }
}

fn execute_assign(
    deps: DepsMut,
    info: MessageInfo,
    checkmark_id: String,
    address: String,
) -> Result<Response, ContractError> {
    let addr = deps.api.addr_validate(&address)?;

    // Ensure the sender is the owner or the assigner.
    let ownership_asserted = cw_ownable::assert_owner(deps.storage, &info.sender).is_ok();
    let assigner = ASSIGNER.load(deps.storage)?;
    if info.sender != assigner && !ownership_asserted {
        return Err(ContractError::Unauthorized);
    }

    // Ensure checkmark_id is not banned.
    let banned = BANNED_CHECKMARKS.has(deps.storage, checkmark_id.clone());
    if banned {
        return Err(ContractError::CheckmarkBanned);
    }

    // Ensure checkmark_id is not already assigned.
    let existing_address = CHECKMARKS_TO_ADDRESSES.may_load(deps.storage, checkmark_id.clone())?;
    if existing_address.is_some() {
        return Err(ContractError::AlreadyAssigned);
    }

    // Ensure address does not already have a checkmark.
    let existing_checkmark = ADDRESSES_TO_CHECKMARKS.may_load(deps.storage, addr.clone())?;
    if existing_checkmark.is_some() {
        return Err(ContractError::AlreadyHasCheckmark);
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
        return Err(ContractError::NoCheckmark);
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
    cw_ownable::assert_owner(deps.storage, &info.sender)?;

    // Ensure checkmark exists.
    let existing_address = CHECKMARKS_TO_ADDRESSES.may_load(deps.storage, checkmark_id.clone())?;
    if existing_address.is_none() {
        return Err(ContractError::NoCheckmark);
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
    cw_ownable::assert_owner(deps.storage, &info.sender)?;

    let addr = deps.api.addr_validate(&address)?;

    // Ensure checkmark exists.
    let existing_checkmark = ADDRESSES_TO_CHECKMARKS.may_load(deps.storage, addr.clone())?;
    if existing_checkmark.is_none() {
        return Err(ContractError::NoCheckmark);
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
    ban_ids: Option<Vec<String>>,
    unban_ids: Option<Vec<String>>,
) -> Result<Response, ContractError> {
    cw_ownable::assert_owner(deps.storage, &info.sender)?;

    for ban_id in ban_ids.map_or_else(Vec::new, |v| v) {
        // If banning, remove checkmark if exists.
        let existing_address = CHECKMARKS_TO_ADDRESSES.may_load(deps.storage, ban_id.clone())?;
        if let Some(addr) = existing_address {
            // Remove the checkmark.
            CHECKMARKS_TO_ADDRESSES.remove(deps.storage, ban_id.clone());
            ADDRESSES_TO_CHECKMARKS.remove(deps.storage, addr);
            CHECKMARK_COUNT.update(deps.storage, |count| Ok::<u64, StdError>(count - 1))?;
        }

        // Add to banned list.
        BANNED_CHECKMARKS.save(deps.storage, ban_id.clone(), &Empty {})?;
    }

    for unban_id in unban_ids.map_or_else(Vec::new, |v| v) {
        // Remove from banned list.
        BANNED_CHECKMARKS.remove(deps.storage, unban_id.clone());
    }

    Ok(Response::default().add_attribute("method", "update_checkmark_ban"))
}

fn execute_update_assigner(
    deps: DepsMut,
    info: MessageInfo,
    assigner: String,
) -> Result<Response, ContractError> {
    cw_ownable::assert_owner(deps.storage, &info.sender)?;

    let assigner = deps.api.addr_validate(&assigner)?;

    // Update the assigner.
    ASSIGNER.save(deps.storage, &assigner)?;

    Ok(Response::default()
        .add_attribute("method", "update_assigner")
        .add_attribute("assigner", assigner))
}

pub fn execute_update_owner(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    action: cw_ownable::Action,
) -> Result<Response, ContractError> {
    let ownership = cw_ownable::update_ownership(deps, &env.block, &info.sender, action)?;
    Ok(Response::default().add_attributes(ownership.into_attributes()))
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

        QueryMsg::Ownership {} => to_binary(&cw_ownable::get_ownership(deps.storage)?),
    }
}
