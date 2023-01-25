#![cfg(test)]
use cosmwasm_std::{Addr, Empty};
use cw_multi_test::{App, Contract, ContractWrapper, Executor};

use crate::{
    msg::{
        AssignerResponse, CheckmarkBannedResponse, CountResponse, ExecuteMsg, GetAddressResponse,
        GetCheckmarkResponse, InstantiateMsg, QueryMsg,
    },
    ContractError,
};

const OWNER: &str = "owner";
const ASSIGNER: &str = "assigner";
const USER: &str = "user";
const ANOTHER_USER: &str = "another_user";
const CHECKMARK: &str = "checkmark";

fn setup_contract() -> Box<dyn Contract<Empty>> {
    let contract = ContractWrapper::new(
        crate::contract::execute,
        crate::contract::instantiate,
        crate::contract::query,
    );
    Box::new(contract)
}

fn instantiate() -> (App, Addr) {
    let mut app = App::default();

    // Instantiate contract.
    let code_id = app.store_code(setup_contract());
    let addr = app
        .instantiate_contract(
            code_id,
            Addr::unchecked(OWNER),
            &InstantiateMsg {
                owner: Some(OWNER.to_string()),
                assigner: ASSIGNER.to_string(),
            },
            &[],
            "checkmark",
            None,
        )
        .unwrap();

    (app, addr)
}

#[test]
pub fn test_instantiate() {
    instantiate();
}

#[test]
pub fn test_updatable_owner() {
    let (mut app, addr) = instantiate();

    // Ensure owner is set.
    let res: cw_ownable::Ownership<String> = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Ownership {})
        .unwrap();
    assert_eq!(res.owner, Some(OWNER.to_string()));

    // Update owner.
    let new_owner = "new_owner";
    app.execute_contract(
        Addr::unchecked(OWNER),
        addr.clone(),
        &ExecuteMsg::UpdateOwnership(cw_ownable::Action::TransferOwnership {
            new_owner: new_owner.to_string(),
            expiry: None,
        }),
        &[],
    )
    .unwrap();

    // Accept ownership transfer.
    app.execute_contract(
        Addr::unchecked(new_owner),
        addr.clone(),
        &ExecuteMsg::UpdateOwnership(cw_ownable::Action::AcceptOwnership),
        &[],
    )
    .unwrap();

    // Ensure owner is updated to new owner.
    let res: cw_ownable::Ownership<String> = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Ownership {})
        .unwrap();
    assert_eq!(res.owner, Some(new_owner.to_string()));

    // Ensure old owner can no longer update.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(OWNER),
            addr.clone(),
            &ExecuteMsg::UpdateOwnership(cw_ownable::Action::TransferOwnership {
                new_owner: "new_new_owner".to_string(),
                expiry: None,
            }),
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(
        err,
        ContractError::Ownable(cw_ownable::OwnershipError::NotOwner)
    );

    // Renounce ownership.
    app.execute_contract(
        Addr::unchecked(new_owner),
        addr.clone(),
        &ExecuteMsg::UpdateOwnership(cw_ownable::Action::RenounceOwnership),
        &[],
    )
    .unwrap();

    // Ensure new owner is removed.
    let res: cw_ownable::Ownership<String> = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Ownership {})
        .unwrap();
    assert_eq!(res.owner, None);

    // Ensure new owner can no longer update.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(new_owner),
            addr.clone(),
            &ExecuteMsg::UpdateOwnership(cw_ownable::Action::TransferOwnership {
                new_owner: new_owner.to_string(),
                expiry: None,
            }),
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(
        err,
        ContractError::Ownable(cw_ownable::OwnershipError::NoOwner)
    );

    // Ensure new owner is still removed.
    let res: cw_ownable::Ownership<String> = app
        .wrap()
        .query_wasm_smart(addr, &QueryMsg::Ownership {})
        .unwrap();
    assert_eq!(res.owner, None);
}

#[test]
pub fn test_updatable_assigner() {
    let (mut app, addr) = instantiate();

    // Ensure assigner is set.
    let res: AssignerResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Assigner {})
        .unwrap();
    assert_eq!(
        res,
        AssignerResponse {
            assigner: Addr::unchecked(ASSIGNER)
        }
    );

    // Update assigner.
    let new_assigner = "new_assigner";
    app.execute_contract(
        Addr::unchecked(OWNER),
        addr.clone(),
        &ExecuteMsg::UpdateAssigner {
            assigner: new_assigner.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure assigner is updated.
    let res: AssignerResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Assigner {})
        .unwrap();
    assert_eq!(
        res,
        AssignerResponse {
            assigner: Addr::unchecked(new_assigner)
        }
    );

    // Ensure non-owner cannot update.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked("non_owner"),
            addr.clone(),
            &ExecuteMsg::UpdateAssigner {
                assigner: "non_owner_assigner".to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(
        err,
        ContractError::Ownable(cw_ownable::OwnershipError::NotOwner)
    );

    // Ensure assigner is the same as before.
    let res: AssignerResponse = app
        .wrap()
        .query_wasm_smart(addr, &QueryMsg::Assigner {})
        .unwrap();
    assert_eq!(
        res,
        AssignerResponse {
            assigner: Addr::unchecked(new_assigner)
        }
    );
}

#[test]
pub fn test_assign() {
    let (mut app, addr) = instantiate();

    // Ensure no checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetCheckmarkResponse { checkmark_id: None });

    // Ensure no user for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetAddressResponse { address: None });

    // Ensure no checkmark count.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 0 });

    // Assign checkmark.
    app.execute_contract(
        Addr::unchecked(ASSIGNER),
        addr.clone(),
        &ExecuteMsg::Assign {
            checkmark_id: CHECKMARK.to_string(),
            address: USER.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetCheckmarkResponse {
            checkmark_id: Some(CHECKMARK.to_string())
        }
    );

    // Ensure user exists for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetAddressResponse {
            address: Some(Addr::unchecked(USER))
        }
    );

    // Ensure checkmark count is 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });

    // Ensure non-assigner cannot assign.
    let non_assigner = "non_assigner";
    let non_assigner_checkmark = "non_assigner_checkmark";
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(non_assigner.to_string()),
            addr.clone(),
            &ExecuteMsg::Assign {
                checkmark_id: non_assigner_checkmark.to_string(),
                address: non_assigner.to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(err, ContractError::Unauthorized);

    // Ensure no checkmark assigned for non_assigner user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: non_assigner.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetCheckmarkResponse { checkmark_id: None });

    // Ensure no user for non_assigner checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: non_assigner_checkmark.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetAddressResponse { address: None });

    // Ensure checkmark count is still 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });

    // Try to assign same checkmark to ANOTHER_USER.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(ASSIGNER),
            addr.clone(),
            &ExecuteMsg::Assign {
                checkmark_id: CHECKMARK.to_string(),
                address: ANOTHER_USER.to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(err, ContractError::AlreadyAssigned);

    // Ensure no checkmark assigned for ANOTHER_USER.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: ANOTHER_USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetCheckmarkResponse { checkmark_id: None });

    // Ensure still same user for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetAddressResponse {
            address: Some(Addr::unchecked(USER))
        }
    );

    // Ensure checkmark count is still 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });

    // Try to assign another checkmark to the already checkmarked user.
    let another_checkmark = "another_checkmark";
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(ASSIGNER),
            addr.clone(),
            &ExecuteMsg::Assign {
                checkmark_id: another_checkmark.to_string(),
                address: USER.to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(err, ContractError::AlreadyHasCheckmark);

    // Ensure still same checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetCheckmarkResponse {
            checkmark_id: Some(CHECKMARK.to_string())
        }
    );

    // Ensure no user for another_checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: another_checkmark.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetAddressResponse { address: None });

    // Ensure checkmark count is still 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr, &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });
}

#[test]
pub fn test_assign_delete_assign() {
    let (mut app, addr) = instantiate();

    // Try to delete checkmark before assigning.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(USER),
            addr.clone(),
            &ExecuteMsg::Delete {},
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(err, ContractError::NoCheckmark);

    // Assign checkmark.
    app.execute_contract(
        Addr::unchecked(ASSIGNER),
        addr.clone(),
        &ExecuteMsg::Assign {
            checkmark_id: CHECKMARK.to_string(),
            address: USER.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetCheckmarkResponse {
            checkmark_id: Some(CHECKMARK.to_string())
        }
    );

    // Ensure user exists for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetAddressResponse {
            address: Some(Addr::unchecked(USER))
        }
    );

    // Ensure checkmark count is 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });

    // Delete checkmark.
    app.execute_contract(
        Addr::unchecked(USER),
        addr.clone(),
        &ExecuteMsg::Delete {},
        &[],
    )
    .unwrap();

    // Ensure no checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetCheckmarkResponse { checkmark_id: None });

    // Ensure no user for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetAddressResponse { address: None });

    // Ensure no checkmark count.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 0 });

    // Assign checkmark to ANOTHER_USER.
    app.execute_contract(
        Addr::unchecked(ASSIGNER),
        addr.clone(),
        &ExecuteMsg::Assign {
            checkmark_id: CHECKMARK.to_string(),
            address: ANOTHER_USER.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark assigned for ANOTHER_USER.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: ANOTHER_USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetCheckmarkResponse {
            checkmark_id: Some(CHECKMARK.to_string())
        }
    );

    // Ensure user exists for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr,
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetAddressResponse {
            address: Some(Addr::unchecked(ANOTHER_USER))
        }
    );
}

#[test]
pub fn test_revoke_checkmark() {
    let (mut app, addr) = instantiate();

    // Try to revoke checkmark before assigned.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(OWNER),
            addr.clone(),
            &ExecuteMsg::RevokeCheckmark {
                checkmark_id: CHECKMARK.to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(err, ContractError::NoCheckmark);

    // Assign checkmark.
    app.execute_contract(
        Addr::unchecked(ASSIGNER),
        addr.clone(),
        &ExecuteMsg::Assign {
            checkmark_id: CHECKMARK.to_string(),
            address: USER.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetCheckmarkResponse {
            checkmark_id: Some(CHECKMARK.to_string())
        }
    );

    // Ensure user exists for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetAddressResponse {
            address: Some(Addr::unchecked(USER))
        }
    );

    // Ensure checkmark count is 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });

    // Try to revoke checkmark as non_owner.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked("non_owner"),
            addr.clone(),
            &ExecuteMsg::RevokeCheckmark {
                checkmark_id: CHECKMARK.to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(
        err,
        ContractError::Ownable(cw_ownable::OwnershipError::NotOwner)
    );

    // Revoke checkmark.
    app.execute_contract(
        Addr::unchecked(OWNER),
        addr.clone(),
        &ExecuteMsg::RevokeCheckmark {
            checkmark_id: CHECKMARK.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure no checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetCheckmarkResponse { checkmark_id: None });

    // Ensure no user for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetAddressResponse { address: None });

    // Ensure no checkmark count.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr, &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 0 });
}

#[test]
pub fn test_revoke_address() {
    let (mut app, addr) = instantiate();

    // Try to revoke checkmark for address before assigned.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(OWNER),
            addr.clone(),
            &ExecuteMsg::RevokeAddress {
                address: USER.to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(err, ContractError::NoCheckmark);

    // Assign checkmark.
    app.execute_contract(
        Addr::unchecked(ASSIGNER),
        addr.clone(),
        &ExecuteMsg::Assign {
            checkmark_id: CHECKMARK.to_string(),
            address: USER.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetCheckmarkResponse {
            checkmark_id: Some(CHECKMARK.to_string())
        }
    );

    // Ensure user exists for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetAddressResponse {
            address: Some(Addr::unchecked(USER))
        }
    );

    // Ensure checkmark count is 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });

    // Try to revoke checkmark from user as non-owner.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked("non_owner"),
            addr.clone(),
            &ExecuteMsg::RevokeAddress {
                address: USER.to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(
        err,
        ContractError::Ownable(cw_ownable::OwnershipError::NotOwner)
    );

    // Revoke checkmark for address.
    app.execute_contract(
        Addr::unchecked(OWNER),
        addr.clone(),
        &ExecuteMsg::RevokeAddress {
            address: USER.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure no checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetCheckmarkResponse { checkmark_id: None });

    // Ensure no user for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetAddressResponse { address: None });

    // Ensure no checkmark count.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr, &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 0 });
}

#[test]
pub fn test_ban_unban_checkmark() {
    let (mut app, addr) = instantiate();

    // Assign checkmark.
    app.execute_contract(
        Addr::unchecked(ASSIGNER),
        addr.clone(),
        &ExecuteMsg::Assign {
            checkmark_id: CHECKMARK.to_string(),
            address: USER.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetCheckmarkResponse {
            checkmark_id: Some(CHECKMARK.to_string())
        }
    );

    // Ensure user exists for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetAddressResponse {
            address: Some(Addr::unchecked(USER))
        }
    );

    // Ensure checkmark count is 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });

    // Try to ban checkmark as non_owner.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked("non_owner"),
            addr.clone(),
            &ExecuteMsg::UpdateCheckmarkBan {
                ban_ids: Some(vec![CHECKMARK.to_string()]),
                unban_ids: None,
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(
        err,
        ContractError::Ownable(cw_ownable::OwnershipError::NotOwner)
    );

    // Ensure checkmark not banned.
    let res: CheckmarkBannedResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::CheckmarkBanned {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, CheckmarkBannedResponse { banned: false });

    // Ban checkmark.
    app.execute_contract(
        Addr::unchecked(OWNER),
        addr.clone(),
        &ExecuteMsg::UpdateCheckmarkBan {
            ban_ids: Some(vec![CHECKMARK.to_string()]),
            unban_ids: None,
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark banned.
    let res: CheckmarkBannedResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::CheckmarkBanned {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, CheckmarkBannedResponse { banned: true });

    // Try to assign checkmark.
    let err: ContractError = app
        .execute_contract(
            Addr::unchecked(ASSIGNER),
            addr.clone(),
            &ExecuteMsg::Assign {
                checkmark_id: CHECKMARK.to_string(),
                address: USER.to_string(),
            },
            &[],
        )
        .unwrap_err()
        .downcast()
        .unwrap();
    assert_eq!(err, ContractError::CheckmarkBanned);

    // Ensure no checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetCheckmarkResponse { checkmark_id: None });

    // Ensure no user for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, GetAddressResponse { address: None });

    // Ensure no checkmark count.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr.clone(), &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 0 });

    // Unban checkmark.
    app.execute_contract(
        Addr::unchecked(OWNER),
        addr.clone(),
        &ExecuteMsg::UpdateCheckmarkBan {
            ban_ids: None,
            unban_ids: Some(vec![CHECKMARK.to_string()]),
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark unbanned.
    let res: CheckmarkBannedResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::CheckmarkBanned {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(res, CheckmarkBannedResponse { banned: false });

    // Assign checkmark.
    app.execute_contract(
        Addr::unchecked(ASSIGNER),
        addr.clone(),
        &ExecuteMsg::Assign {
            checkmark_id: CHECKMARK.to_string(),
            address: USER.to_string(),
        },
        &[],
    )
    .unwrap();

    // Ensure checkmark assigned for user.
    let res: GetCheckmarkResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetCheckmark {
                address: USER.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetCheckmarkResponse {
            checkmark_id: Some(CHECKMARK.to_string())
        }
    );

    // Ensure user exists for checkmark.
    let res: GetAddressResponse = app
        .wrap()
        .query_wasm_smart(
            addr.clone(),
            &QueryMsg::GetAddress {
                checkmark_id: CHECKMARK.to_string(),
            },
        )
        .unwrap();
    assert_eq!(
        res,
        GetAddressResponse {
            address: Some(Addr::unchecked(USER))
        }
    );

    // Ensure checkmark count is 1.
    let res: CountResponse = app
        .wrap()
        .query_wasm_smart(addr, &QueryMsg::Count {})
        .unwrap();
    assert_eq!(res, CountResponse { count: 1 });
}
