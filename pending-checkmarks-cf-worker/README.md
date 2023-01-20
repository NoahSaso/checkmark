# pending-checkmarks-cf-worker

An API to store pending checkmark sessions, built with [Cloudflare
Workers](https://workers.cloudflare.com/).

Used template for [Cosmos wallet
authentication](https://github.com/NoahSaso/cloudflare-worker-cosmos-auth) to
authenticate requests via a [Cosmos](https://cosmos.network) wallet signature.

Read through the design spec [here](./DESIGN.md).

## Development

### Run locally

```sh
npm run dev
# OR
wrangler dev --local --persist
```

### Configuration

1. Copy `wrangler.toml.example` to `wrangler.toml`.

2. Create KV namespaces for production and development:

```sh
npx wrangler kv:namespace create NONCES
npx wrangler kv:namespace create NONCES --preview
npx wrangler kv:namespace create SESSIONS
npx wrangler kv:namespace create SESSIONS --preview
```

3. Update the binding IDs in `wrangler.toml`:

```toml
kv-namespaces = [
  { binding = "NONCES", id = "<INSERT NONCES_ID>", preview_id = "<INSERT NONCES_PREVIEW_ID>" },
  { binding = "SESSIONS", id = "<INSERT SESSIONS_ID>", preview_id = "<INSERT SESSIONS_PREVIEW_ID>" }
]
```

4. Configure variables in `wrangler.toml`:

```toml
[vars]
CHECKMARK_CONTRACT_ADDRESS = "<VALUE>"
PAYMENT_CONTRACT_ADDRESS = "<VALUE>"
```

5. Configure secrets:

```sh
echo <VALUE> | npx wrangler secret put WALLET_MNEMONIC
echo <VALUE> | npx wrangler secret put SYNAPS_CLIENT_ID
echo <VALUE> | npx wrangler secret put SYNAPS_API_KEY
echo <VALUE> | npx wrangler secret put SYNAPS_WEBHOOK_SECRET
```

## Deploy

```sh
wrangler publish
# OR
npm run deploy
```
