use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("no checkmark assigned")]
    NoCheckmark {},

    #[error("checkmark_id is banned")]
    CheckmarkBanned {},

    #[error("checkmark_id already assigned")]
    AlreadyAssigned {},

    #[error("address already has a checkmark")]
    AlreadyHasCheckmark {},
}
