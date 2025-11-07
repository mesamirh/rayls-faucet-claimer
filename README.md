# Rayls Faucet Claimer

A single-file Node.js script that automatically connects a web3 wallet (via signed SIWE message) to the Rayls devnet dApp and requests faucet tokens for one or multiple private keys stored in an `.env` file.

---

## Features

* Supports multiple private keys (comma-separated in `PRIVATE_KEYS`).
* Sequential processing (safe default) with optional concurrency support.
* Automatic SIWE nonce fetch, message signing (with private keys), verification and faucet request via the dApp HTTP API.
* Console UI with emoji-based status messages for easier tracking.
* Robust error logging and per-wallet continuation on failure.

---

## Requirements

* Node.js (v16+ recommended)
* npm

---

## Installation

1. git clone https://github.com/mesamirh/rayls-faucet-claimer.git
2. cd rayls-faucet-claimer
3. Create a `.env` file in the same folder.
4. Install dependencies:

```bash
npm install axios axios-cookiejar-support tough-cookie ethers dotenv
```

---

## `.env` (required)

Only `PRIVATE_KEYS` is required for the current faucet flow. Keys must be comma-separated.

Example:

```
PRIVATE_KEYS=0xaaa111...,0xbbb222...,0xccc333...
```
---

## How it works (high level)

1. Script fetches a SIWE nonce from `GET /api/auth/nonce`.
2. Builds the SIWE message and signs it locally using a private key.
3. Sends `POST /api/auth/verify` with the message and signature to authenticate.
4. Optionally performs several read endpoints for preflight checks.
5. Sends `POST /api/faucet/request` with the wallet address.
6. Repeats for each private key.

No on-chain transactions are broadcast in the default workflow — all steps use the dApp HTTP API.

---

## Usage

1. Ensure `.env` is populated with `PRIVATE_KEYS`.
2. Run:

```bash
node main.js
```

Script prints friendly emoji logs per wallet and a final summary of successes vs failures.

---

## Security & Safety

* **Never** commit `.env` to a public repo. Add it to `.gitignore`.
* Keep private keys offline when possible and prefer secure vaults for production use.
* Use small test/dev wallets for automation.

---

## Troubleshooting

* `Set PRIVATE_KEYS in .env` error: Your `.env` is missing or empty — ensure keys are properly listed.
* `Failed` messages: The script logs the HTTP response when available; rate limits or network errors may be reported by the API.
* If authentication fails, verify the script’s SIWE message matches the server nonce and issuedAt timestamp.
