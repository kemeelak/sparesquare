import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { PROVIDERS, credentials } from '../../shared/health.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const body = await req.json().catch(() => ({}));

    const syncOne = async (connection) => {
      const { clientId, clientSecret } = credentials(connection.provider, secrets);
      if (!clientId || !clientSecret) {
        throw new Error(`${PROVIDERS[connection.provider]?.label || connection.provider} is not set up yet`);
      }
      return await PROVIDERS[connection.provider].syncConnection(base44, connection, clientId, clientSecret);
    };

    // Called by the nightly workflow: refresh every connected wearable.
    if (body.all === true) {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { items } = await base44.asServiceRole.entities.HealthConnection.filter(
        { status: 'connected' },
        { limit: 200 }
      );

      const results = [];
      for (let i = 0; i < items.length; i += 4) {
        const batch = items.slice(i, i + 4);
        const settled = await Promise.allSettled(batch.map((connection) => syncOne(connection)));
        settled.forEach((outcome, index) => {
          results.push({
            user_id: batch[index].user_id,
            provider: batch[index].provider,
            ok: outcome.status === 'fulfilled',
            error: outcome.status === 'rejected' ? String(outcome.reason?.message ?? outcome.reason) : null,
          });
        });
      }
      return Response.json({ synced: results.length, results });
    }

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const query = body.provider
      ? { user_id: user.id, provider: body.provider, status: 'connected' }
      : { user_id: user.id, status: 'connected' };

    const { items } = await base44.asServiceRole.entities.HealthConnection.filter(query, { limit: 10 });
    if (!items.length) {
      return Response.json({ connected: false, provider: body.provider ?? null });
    }

    const summaries = [];
    for (const connection of items) {
      const summary = await syncOne(connection);
      summaries.push({ provider: connection.provider, ...summary });
    }

    return Response.json({
      connected: true,
      provider: body.provider ?? null,
      days: summaries.reduce((sum, s) => sum + (s.days || 0), 0),
      lastSyncedAt: summaries[0]?.lastSyncedAt ?? null,
      providers: summaries.map((s) => s.provider),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}