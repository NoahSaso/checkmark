use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::Addr;

#[cw_serde]
pub struct InstantiateMsg {
    /// The assigner is the only one who can assign checkmarks.
    pub assigner: String,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Assign a checmark; this can only be called by the admin or assigner.
    Assign {
        checkmark_id: String,
        address: String,
    },

    /// Deletes the checkmark assigned to the sender, if any. Errors if no
    /// checkmark assigned.
    Delete {},

    /// Deletes the checkmark. Only the admin can call this.
    RevokeCheckmark { checkmark_id: String },

    /// Deletes the checkmark assigned to the address, if any. Only the admin
    /// can call this.
    RevokeAddress { address: String },

    /// Update whether a checkmark ID is banned.
    UpdateCheckmarkBan { checkmark_id: String, ban: bool },

    /// Update assigner. Only the admin can call this.
    UpdateAssigner { assigner: String },

    /// Update admin. Only the admin can call this.
    UpdateAdmin { admin: String },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Returns the checkmark ID assigned to the address, if any.
    #[returns(GetCheckmarkResponse)]
    GetCheckmark { address: String },

    /// Returns the address the checkmark ID is assigned to, if any.
    #[returns(GetAddressResponse)]
    GetAddress { checkmark_id: String },

    /// Returns the count of checkmarks assigned.
    #[returns(CountResponse)]
    Count {},

    /// Returns whether the checkmark ID is banned.
    #[returns(CheckmarkBannedResponse)]
    CheckmarkBanned { checkmark_id: String },

    /// Returns the assigner.
    #[returns(AssignerResponse)]
    Assigner {},

    /// Returns the admin.
    #[returns(AdminResponse)]
    Admin {},
}

/// Shows the checkmark ID assigned to the address, if any.
#[cw_serde]
pub struct GetCheckmarkResponse {
    pub checkmark_id: Option<String>,
}

/// Shows the address the checkmark ID is assigned to, if any.
#[cw_serde]
pub struct GetAddressResponse {
    pub address: Option<Addr>,
}

/// Shows count of checkmarks assigned.
#[cw_serde]
pub struct CountResponse {
    pub count: u64,
}

/// Shows whether the checkmark ID is banned.
#[cw_serde]
pub struct CheckmarkBannedResponse {
    pub banned: bool,
}

/// Shows who can assign checkmarks.
#[cw_serde]
pub struct AssignerResponse {
    pub assigner: Addr,
}

/// Shows who can change the assigner and admin.
#[cw_serde]
pub struct AdminResponse {
    pub admin: Addr,
}
