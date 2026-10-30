import * as oura from "./oura.ts";
import * as fitbit from "./fitbit.ts";

// Oura only accepts the exact redirect address registered in its developer portal,
// so the callback is pinned to the published app — never to whatever host the user
// happened to open (the preview host is refused with "400 Invalid request").
export const APP_URL = "https://spare-square-grow.base44.app";

export function callbackUrl() {
  return `${APP_URL}/functions/healthCallback`;
}

// Every wearable this app can pull from. Adding one means adding a module with the
// same four exports and a line here.
export const PROVIDERS = {
  oura: {
    label: "Oura",
    envId: "OURA_CLIENT_ID",
    envSecret: "OURA_CLIENT_SECRET",
    buildAuthorizeUrl: oura.buildAuthorizeUrl,
    exchangeCode: oura.exchangeCode,
    syncConnection: oura.syncConnection,
  },
  fitbit: {
    label: "Fitbit",
    envId: "FITBIT_CLIENT_ID",
    envSecret: "FITBIT_CLIENT_SECRET",
    buildAuthorizeUrl: fitbit.buildAuthorizeUrl,
    exchangeCode: fitbit.exchangeCode,
    syncConnection: fitbit.syncConnection,
  },
};

export function isProvider(provider) {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, provider) && provider;
}

export function credentials(provider, secrets) {
  const spec = PROVIDERS[provider];
  if (!spec) return { clientId: null, clientSecret: null };
  return { clientId: secrets.get(spec.envId), clientSecret: secrets.get(spec.envSecret) };
}

const encoder = new TextEncoder();

async function sign(secret, payload) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// OAuth state carries who started the link and which provider it was for, signed so
// nobody can attach their wearable account to someone else.
export async function signState(userId, provider, secret) {
  const payload = `${userId}.${provider}.${crypto.randomUUID()}`;
  return `${payload}.${await sign(secret, payload)}`;
}

// Which provider a state belongs to, read without trusting it — the signature is
// checked against that provider's own secret right after.
export function stateProvider(state) {
  const parts = (state || "").split(".");
  if (parts.length === 4) return isProvider(parts[1]) ? parts[1] : null;
  if (parts.length === 3) return "oura"; // links started before Fitbit support
  return null;
}

export async function verifyState(state, secret) {
  const parts = (state || "").split(".");
  if (parts.length === 4) {
    const [userId, provider, nonce, sig] = parts;
    if (!userId || !nonce || !sig || !isProvider(provider)) return null;
    const expected = await sign(secret, `${userId}.${provider}.${nonce}`);
    return expected === sig ? { userId, provider } : null;
  }
  if (parts.length === 3) {
    const [userId, nonce, sig] = parts;
    if (!userId || !nonce || !sig) return null;
    const expected = await sign(secret, `${userId}.${nonce}`);
    return expected === sig ? { userId, provider: "oura" } : null;
  }
  return null;
}