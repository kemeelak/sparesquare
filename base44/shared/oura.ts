import { SYNC_DAYS, isoDay, saveSnapshots, recordSyncError } from "./healthStore.ts";

const AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
// Oura moved OAuth onto moi.ouraring.com — the legacy api.ouraring.com/oauth/token
// answers every exchange with 400 invalid_request.
const TOKEN_URL = "https://moi.ouraring.com/oauth/v2/ext/oauth-token";
const API_BASE = "https://api.ouraring.com/v2/usercollection";
const USER_AGENT = "SpareSquare/1.0";

export const OURA_SCOPES = "daily personal";

export function buildAuthorizeUrl({ clientId, redirectUri, state }) {
  return `${AUTHORIZE_URL}?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(OURA_SCOPES)}` +
    `&state=${encodeURIComponent(state)}`;
}

async function tokenRequest(body) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Oura token request failed (${res.status}) ${detail.slice(0, 200)}`);
  }
  return await res.json();
}

export function exchangeCode({ code, redirectUri, clientId, clientSecret }) {
  return tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  }));
}

export function refreshAccessToken({ refreshToken, clientId, clientSecret }) {
  return tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  }));
}

export async function fetchCollection(resource, accessToken, startDate, endDate) {
  const res = await fetch(`${API_BASE}/${resource}?start_date=${startDate}&end_date=${endDate}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 401) throw Object.assign(new Error("Oura access token rejected"), { status: 401 });
  if (!res.ok) throw new Error(`Oura ${resource} failed (${res.status})`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

const minutes = (seconds) => Math.round((seconds ?? 0) / 60);

// Oura splits a night across sleep periods, so keep each day's longest one as the real night.
export function buildSnapshots(userId, { sleepPeriods, dailySleep, dailyActivity, dailyReadiness }) {
  const byDay = new Map();
  const bucket = (day) => {
    if (!byDay.has(day)) byDay.set(day, { user_id: userId, date: day, source: "oura" });
    return byDay.get(day);
  };

  const bestPeriod = new Map();
  for (const period of sleepPeriods) {
    if (!period?.day) continue;
    const current = bestPeriod.get(period.day);
    if (!current || (period.total_sleep_duration ?? 0) > (current.total_sleep_duration ?? 0)) {
      bestPeriod.set(period.day, period);
    }
  }

  for (const [day, period] of bestPeriod) {
    const snap = bucket(day);
    snap.sleep_minutes = minutes(period.total_sleep_duration);
    snap.deep_minutes = minutes(period.deep_sleep_duration);
    snap.rem_minutes = minutes(period.rem_sleep_duration);
    if (typeof period.efficiency === "number") snap.efficiency = period.efficiency;
    if (typeof period.average_hrv === "number") snap.hrv = period.average_hrv;
    if (typeof period.lowest_heart_rate === "number") snap.resting_hr = period.lowest_heart_rate;
    if (period.bedtime_start) snap.bedtime_start = period.bedtime_start;
    if (period.bedtime_end) snap.bedtime_end = period.bedtime_end;
  }

  for (const doc of dailySleep) {
    if (doc?.day && typeof doc.score === "number") bucket(doc.day).sleep_score = doc.score;
  }
  for (const doc of dailyReadiness) {
    if (doc?.day && typeof doc.score === "number") bucket(doc.day).readiness_score = doc.score;
  }
  for (const doc of dailyActivity) {
    if (!doc?.day) continue;
    const snap = bucket(doc.day);
    if (typeof doc.score === "number") snap.activity_score = doc.score;
    if (typeof doc.steps === "number") snap.steps = doc.steps;
    if (typeof doc.active_calories === "number") snap.active_calories = Math.round(doc.active_calories);
  }

  return [...byDay.values()];
}

export async function syncConnection(base44, connection, clientId, clientSecret) {
  let accessToken = connection.access_token;

  const needsRefresh = !connection.expires_at || Date.parse(connection.expires_at) - Date.now() < 120000;
  if (needsRefresh) {
    const fresh = await refreshAccessToken({ refreshToken: connection.refresh_token, clientId, clientSecret });
    accessToken = fresh.access_token;
    // Oura refresh tokens are single use — save the new pair before anything else can fail.
    await base44.asServiceRole.entities.HealthConnection.update(connection.id, {
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: new Date(Date.now() + (fresh.expires_in ?? 86400) * 1000).toISOString(),
      scope: fresh.scope ?? connection.scope,
    });
  }

  const start = isoDay(-(SYNC_DAYS - 1));
  const end = isoDay(0);

  let collections;
  try {
    const [sleepPeriods, dailySleep, dailyActivity, dailyReadiness] = await Promise.all([
      fetchCollection("sleep", accessToken, start, end),
      fetchCollection("daily_sleep", accessToken, start, end),
      fetchCollection("daily_activity", accessToken, start, end),
      fetchCollection("daily_readiness", accessToken, start, end),
    ]);
    collections = { sleepPeriods, dailySleep, dailyActivity, dailyReadiness };
  } catch (error) {
    await recordSyncError(base44, connection, error);
    throw error;
  }

  return await saveSnapshots(base44, connection, buildSnapshots(connection.user_id, collections));
}