import { SYNC_DAYS, isoDay, saveSnapshots, recordSyncError } from "./healthStore.ts";

const AUTHORIZE_URL = "https://www.fitbit.com/oauth2/authorize";
const TOKEN_URL = "https://api.fitbit.com/oauth2/token";
const API_BASE = "https://api.fitbit.com";
const USER_AGENT = "SpareSquare/1.0";

export const FITBIT_SCOPES = "sleep activity profile";

export function buildAuthorizeUrl({ clientId, redirectUri, state }) {
  return `${AUTHORIZE_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(FITBIT_SCOPES)}` +
    `&state=${encodeURIComponent(state)}`;
}

// Fitbit wants the client credentials as HTTP Basic auth on every token call.
async function tokenRequest(body, clientId, clientSecret) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "User-Agent": USER_AGENT,
    },
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Fitbit token request failed (${res.status}) ${detail.slice(0, 200)}`);
  }
  return await res.json();
}

export function exchangeCode({ code, redirectUri, clientId, clientSecret }) {
  return tokenRequest(
    new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    clientId,
    clientSecret
  );
}

export function refreshAccessToken({ refreshToken, clientId, clientSecret }) {
  return tokenRequest(
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    clientId,
    clientSecret
  );
}

async function getJson(path, accessToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 401) throw Object.assign(new Error("Fitbit access token rejected"), { status: 401 });
  if (!res.ok) throw new Error(`Fitbit ${path.split("?")[0]} failed (${res.status})`);
  return await res.json();
}

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function buildSnapshots(userId, { sleep, steps, calories, heart }) {
  const byDay = new Map();
  const bucket = (day) => {
    if (!byDay.has(day)) byDay.set(day, { user_id: userId, date: day, source: "fitbit" });
    return byDay.get(day);
  };

  // A nap and a night can land on the same day — keep the longest sleep as the night.
  const bestSleep = new Map();
  for (const entry of sleep) {
    const day = entry?.dateOfSleep;
    if (!day) continue;
    const current = bestSleep.get(day);
    if (!current || (entry.minutesAsleep ?? 0) > (current.minutesAsleep ?? 0)) bestSleep.set(day, entry);
  }

  for (const [day, entry] of bestSleep) {
    const snap = bucket(day);
    if (typeof entry.minutesAsleep === "number") snap.sleep_minutes = Math.round(entry.minutesAsleep);
    const summary = entry.levels?.summary;
    if (typeof summary?.deep?.minutes === "number") snap.deep_minutes = Math.round(summary.deep.minutes);
    if (typeof summary?.rem?.minutes === "number") snap.rem_minutes = Math.round(summary.rem.minutes);
    if (typeof entry.efficiency === "number") snap.efficiency = Math.round(entry.efficiency);
    if (entry.startTime) snap.bedtime_start = entry.startTime;
    if (entry.endTime) snap.bedtime_end = entry.endTime;
  }

  for (const row of steps) {
    const value = row?.dateTime ? num(row.value) : null;
    if (value !== null) bucket(row.dateTime).steps = value;
  }
  for (const row of calories) {
    const value = row?.dateTime ? num(row.value) : null;
    if (value !== null) bucket(row.dateTime).active_calories = Math.round(value);
  }
  for (const row of heart) {
    const resting = num(row?.value?.restingHeartRate);
    if (row?.dateTime && resting !== null) bucket(row.dateTime).resting_hr = resting;
  }

  return [...byDay.values()];
}

export async function syncConnection(base44, connection, clientId, clientSecret) {
  let accessToken = connection.access_token;

  const needsRefresh = !connection.expires_at || Date.parse(connection.expires_at) - Date.now() < 120000;
  if (needsRefresh) {
    const fresh = await refreshAccessToken({ refreshToken: connection.refresh_token, clientId, clientSecret });
    accessToken = fresh.access_token;
    // Fitbit refresh tokens are single use — save the new pair before anything else can fail.
    await base44.asServiceRole.entities.HealthConnection.update(connection.id, {
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: new Date(Date.now() + (fresh.expires_in ?? 28800) * 1000).toISOString(),
    });
  }

  const start = isoDay(-(SYNC_DAYS - 1));
  const end = isoDay(0);

  let collections;
  try {
    const [sleepDoc, stepsDoc, caloriesDoc, heartDoc] = await Promise.all([
      getJson(`/1.2/user/-/sleep/date/${start}/${end}.json`, accessToken),
      getJson(`/1/user/-/activities/steps/date/${start}/${end}.json`, accessToken),
      getJson(`/1/user/-/activities/calories/date/${start}/${end}.json`, accessToken),
      getJson(`/1/user/-/activities/heart/date/${start}/${end}.json`, accessToken),
    ]);
    collections = {
      sleep: Array.isArray(sleepDoc?.sleep) ? sleepDoc.sleep : [],
      steps: stepsDoc?.["activities-steps"] || [],
      calories: caloriesDoc?.["activities-calories"] || [],
      heart: heartDoc?.["activities-heart"] || [],
    };
  } catch (error) {
    await recordSyncError(base44, connection, error);
    throw error;
  }

  return await saveSnapshots(base44, connection, buildSnapshots(connection.user_id, collections));
}