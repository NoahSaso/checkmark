# Design spec

Author: [@NoahSaso](https://github.com/NoahSaso)

### KV Mappings

Key | Value
-- | --
`WALLET_FOR:<pending_session_id>` | `<wallet_address>`
`SESSION_FOR:<wallet_address>` | `<pending_session_id>`
`CURRENT_SESSION_FOR:<initial_session_id>` | `<current_session_id>`
`SESSION_SEEN:<session_id>` | `1`

### Flows
1. person verifies for the first time
	1. get unique session ID from synaps (`pending_session_id`), and store two KV store keys: (1) mapping `pending_session_id` and `wallet_address`, and (2) mapping `wallet_address` to `pending_session_id`
	2. show pending status
2. person checks their status by connecting their wallet
	1. if they have a checkmark assigned, display status
	2. after a button and a wallet signature request, retrieve `pending_session_id` from KV store using `wallet_address`
	3. query synaps for status and display it
		- either pending or failure; if successful, the checkmark should have been assigned
4. synaps session verification updates and sends a webhook
	- on uniqueness requirement failure:
		1. retrieve `current_session_id` using the `initial_session_id` retrieved from the uniqueness requirement failure which provides the initially successful session ID
		2. check if a checkmark exists with `checkmark_id` set to the sha-512 hash of the `current_session_id`
		3. if exists, do nothing, leaving the failed `pending_session_id` in the KV store so the wallet can view the failure reason. a uniqueness failed session found in the KV store indicates that a checkmark is already assigned
		4. if checkmark does not exist:
			1. assign a checkmark to the wallet, retrieving `wallet_address` from the KV store using `pending_session_id`, with `checkmark_id` set to the sha-512 hash of `pending_session_id`
			2. map `initial_session_id` to `pending_session_id`, replacing `current_session_id`, to indicate that this is the new session for which the checkmark is currently assigned associated with that first initial verified session
			3. delete both `wallet_address` <=> `pending_session_id` mappings as they are no longer needed
	- on other failure:
		1. do nothing so wallet can view failure reason
	- on success (must be first time verifying):
		1. retrieve `wallet_address` from KV store using `pending_session_id`
		2. assign checkmark to `wallet_address` with `checkmark_id` set to the sha-512 hash of `pending_session_id`
		3. map `pending_session_id` to `pending_session_id` to indicate that this is the session for which the checkmark is currently assigned. the `initial_session_id` and `current_session_id` are equivalent, since this is the initial successful session and a checkmark is currently assigned for it
		4. delete both `wallet_address` <=> `pending_session_id` mappings as they are no longer needed
5. person tries to verify with a different wallet
	1. get unique session ID from synaps (`pending_session_id`), and store two KV store keys: (1) mapping `pending_session_id` and `wallet_address`, and (2) mapping `wallet_address` to `pending_session_id`
		- check if this rejects immediately or after some delay (i.e. will it instant-reject or will the webhook have to handle failures)
	2. show pending status
6. person deletes the checkmark, and tries to verify again, from any wallet
	1. get unique session ID from synaps (`pending_session_id`), and store two KV store keys: (1) mapping `pending_session_id` and `wallet_address`, and (2) mapping `wallet_address` to `pending_session_id`
		- check if this rejects immediately or after some delay (i.e. will it instant-reject or will the webhook have to handle uniqueness failures that turn into new checkmark assignments)
	2. show pending status

### Security concerns

sensitive information to minimize exposure to:
- personally identifiable information (PII)
- connection between PII and a wallet address
- connection between different wallets associated with the same PII, even if the PII is unknown

the link between the `session_id` and `wallet_address` is only meaningful if you've compromised synaps or our API key because you can then retrieve session info containing PII. this link can only be discovered in the following situations:
- session is pending or failed, and the attacker has access to the wallet to perform wallet signature auth
- session is pending or failed, and the attacker has access to the KV store

with the `session_id`, the attacker can view the status, which is composed of whatever we decide to return from our own API call. the API call queries synaps with a secret API key. because we use the sha-512 hash of `session_id` as the `checkmark_id` values, one can only obtain a `session_id` via one of the following:
- creating their own session
- compromising the API key and listing sessions
- compromising the KV store
- compromising synaps
...all other session access is behind wallet signature auth, and so only the owner of the wallet may access their latest session assuming no services or keys have been compromised

#### Conclusions
- PII safety is entrusted to synaps. we have no control over PII and hope they keep it safe 🙏
- the connection between PII and a wallet address is impossible as long as the wallet private key, synaps, and the KV store remain uncompromised
- tracking consistent identities across wallets is impossible since the same identity receives a different `checkmark_id` each time
	- the only way to follow identities across wallets is to correlate the time a checkmark was deleted with the time another checkmark was assigned, assuming that (1) there is insufficient noise from activity to obscure the proximity of these two events, and (2) session approvals take a predictable amount of time
	- since no `checkmark_id` is reused, sufficient activity should obscure any connection between checkmarks when one gets deleted and then reassigned for the same identity but a different wallet
