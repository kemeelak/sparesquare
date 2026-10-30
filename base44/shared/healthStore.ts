// Shared persistence for every wearable provider: the same daily snapshot shape,
// whichever ring or watch the data came from.

export const SYNC_DAYS = 14;

export function isoDay(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function recordSyncError(base44, connection, error) {
  const revoked = error?.status === 401;
  await base44.asServiceRole.entities.HealthConnection.update(connection.id, {
    status: revoked ? "revoked" : "connected",
    last_error: revoked ? `${connection.provider} access expired — reconnect needed.` : String(error?.message ?? error),
  });
}

// One row per day per user: update the days we already hold, insert the new ones.
export async function saveSnapshots(base44, connection, snapshots) {
  if (snapshots.length) {
    const dates = snapshots.map((s) => s.date);
    const existing = await base44.asServiceRole.entities.HealthSnapshot.filter(
      { user_id: connection.user_id, date: { $in: dates } },
      { limit: 100 }
    );
    const idByDate = new Map((existing?.items || []).map((r) => [r.date, r.id]));
    const updates = [];
    const creates = [];
    for (const snap of snapshots) {
      const id = idByDate.get(snap.date);
      if (id) updates.push({ id, ...snap });
      else creates.push(snap);
    }
    if (updates.length) await base44.asServiceRole.entities.HealthSnapshot.bulkUpdate(updates);
    if (creates.length) await base44.asServiceRole.entities.HealthSnapshot.bulkCreate(creates);
  }

  const syncedAt = new Date().toISOString();
  await base44.asServiceRole.entities.HealthConnection.update(connection.id, {
    status: "connected",
    last_error: "",
    last_synced_at: syncedAt,
  });

  return { days: snapshots.length, lastSyncedAt: syncedAt };
}