const axios = require("axios");
const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const { ethers } = require("ethers");
require("dotenv").config();

const BASE = "https://devnet-dapp.rayls.com";
const HEADERS = {
  accept: "application/json, text/plain, */*",
  "content-type": "application/json",
  origin: "https://devnet-dapp.rayls.com",
  referer: "https://devnet-dapp.rayls.com/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowISO = () => new Date().toISOString();
const ok = (msg) => console.log(`✅ ${msg}`);
const info = (msg) => console.log(`ℹ️  ${msg}`);
const warn = (msg) => console.log(`⚠️  ${msg}`);
const cross = (msg) => console.log(`❌ ${msg}`);
const rocket = (msg) => console.log(`🚀 ${msg}`);
const keyEmoji = (i) => `🔑 [${i + 1}]`;

const makeClient = () => {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      baseURL: BASE,
      headers: HEADERS,
      jar,
      withCredentials: true,
      timeout: 30000,
    })
  );
  return client;
};

const buildSiweMessage = (domain, address, nonce) => {
  return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to the app.

URI: https://${domain}
Version: 1
Chain ID: 1
Nonce: ${nonce}
Issued At: ${nowISO()}`;
};

const fetchNonce = async (client) => {
  const { data } = await client.get("/api/auth/nonce");
  return typeof data === "string" ? data : data?.nonce || "";
};

const verifySiwe = async (client, message, signature) => {
  const { data } = await client.post("/api/auth/verify", {
    message,
    signature,
  });
  return data;
};

const checkSession = async (client) => {
  try {
    const { data } = await client.get("/api/auth/session");
    return data;
  } catch {
    return null;
  }
};

const preflightReads = async (client, address) => {
  try {
    await client.get(`/api/user/${address}/hasAttestation`);
  } catch {}
  try {
    await client.get(`/api/portfolio/${address}/mint/status`);
  } catch {}
  try {
    await client.get(`/api/fuul/points/${address}`);
  } catch {}
};

const requestFaucet = async (client, address) => {
  const { data } = await client.post("/api/faucet/request", { address });
  return data;
};

const runForKey = async (pk, idx) => {
  const client = makeClient();
  const wallet = new ethers.Wallet(pk);
  const address = await wallet.getAddress();
  info(`${keyEmoji(idx)} Wallet: ${address}`);
  const nonce = await fetchNonce(client);
  ok(`${keyEmoji(idx)} Nonce received`);
  const domain = "devnet-dapp.rayls.com";
  const message = buildSiweMessage(domain, address, nonce);
  const signature = await wallet.signMessage(message);
  ok(`${keyEmoji(idx)} Message signed ✍️`);
  await verifySiwe(client, message, signature);
  ok(`${keyEmoji(idx)} Auth verified 🔐`);
  const sess = await checkSession(client);
  if (!sess) warn(`${keyEmoji(idx)} Session check returned empty, continuing`);
  await preflightReads(client, address);
  info(`${keyEmoji(idx)} Requesting faucet 💧`);
  const resp = await requestFaucet(client, address);
  rocket(
    `${keyEmoji(idx)} Faucet requested: id=${resp.id} at ${resp.requestedAt}`
  );
  return true;
};

const main = async () => {
  console.log(`\n🧩 Rayls Faucet Claimer`);
  console.log(`🕒 ${nowISO()}\n`);
  const keysEnv = process.env.PRIVATE_KEYS || "";
  if (!keysEnv.trim()) {
    cross("Set PRIVATE_KEYS in .env (comma-separated)");
    process.exit(1);
  }
  const keys = keysEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!keys.length) {
    cross("No private keys found after parsing PRIVATE_KEYS");
    process.exit(1);
  }
  ok(`Loaded ${keys.length} wallet${keys.length > 1 ? "s" : ""} 🔎`);
  let success = 0;
  for (let i = 0; i < keys.length; i++) {
    try {
      await runForKey(keys[i], i);
      success++;
    } catch (e) {
      const msg = e?.response?.data
        ? JSON.stringify(e.response.data)
        : e?.message || String(e);
      cross(`${keyEmoji(i)} Failed: ${msg}`);
    }
    await sleep(750);
  }
  console.log("");
  if (success === keys.length) ok(`All tasks completed 🎉`);
  else warn(`Completed ${success}/${keys.length} wallets`);
  console.log("");
};

main().catch((e) => {
  const msg = e?.response?.data
    ? JSON.stringify(e.response.data)
    : e?.message || String(e);
  cross(`Fatal: ${msg}`);
  process.exit(1);
});
