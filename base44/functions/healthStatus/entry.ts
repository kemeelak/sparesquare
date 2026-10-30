import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await base44.asServiceRole.entities.HealthConnection.filter(
      { user_id: user.id, provider: 'oura' },
      { limit: 1 }
    );
    const connection = items[0];

    return Response.json({
      connected: connection?.status === 'connected',
      provider: 'oura',
      lastSyncedAt: connection?.last_synced_at ?? null,
      lastError: connection?.last_error || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}