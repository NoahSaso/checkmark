use cosmwasm_std::{Addr, Empty};

use cw_storage_plus::{Item, Map};

pub const ASSIGNER: Item<Addr> = Item::new("assigner");
pub const ADMIN: Item<Addr> = Item::new("admin");

pub const CHECKMARKS_TO_ADDRESSES: Map<String, Addr> = Map::new("checkmarks_to_addresses");
pub const ADDRESSES_TO_CHECKMARKS: Map<Addr, String> = Map::new("addresses_to_checkmarks");
pub const CHECKMARK_COUNT: Item<u64> = Item::new("checkmark_count");

pub const BANNED_CHECKMARKS: Map<String, Empty> = Map::new("banned_checkmarks");
