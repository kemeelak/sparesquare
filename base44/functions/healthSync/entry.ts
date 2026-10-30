import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { syncConnection } from '../../shared/oura.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    const body = await req.json().catch(() => ({}));

    const clientId = secrets.get('OURA_CLIENT_ID');
    const clientSecret = secrets.get('OURA_CLIENT_SECRET');
    if (!clientId || !clientSecret) return Response.json({ error: 'Oura app credentials are not set' }, { status: 500 });

    // Called by the nightly workflow: refresh every connected wearable.
    if (body.all === true) {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { items } = await base44.asServiceRole.entities.HealthConnection.filter(
        { provider: 'oura', status: 'connected' },
        { limit: 200 }
      );

      const results = [];
      for (let i = 0; i < items.length; i += 4) {
        const batch = items.slice(i, i + 4);
        const settled = await Promise.allSettled(
          batch.map((connection) => syncConnection(base44, connection, clientId, clientSecret))
        );
        settled.forEach((outcome, index) => {
          results.push({
            user_id: batch[index].user_id,
            ok: outcome.status === 'fulfilled',
            error: outcome.status === 'rejected' ? String(outcome.reason?.message ?? outcome.reason) : null,
          });
        });
      }
      return Response.json({ synced: results.length, results });
    }

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await base44.asServiceRole.entities.HealthConnection.filter(
      { user_id: user.id, provider: 'oura' },
      { limit: 1 }
    );
    const connection = items[0];
    if (!connection || connection.status !== 'connected') return Response.json({ connected: false });

    const summary = await syncConnection(base44, connection, clientId, clientSecret);
    return Response.json({ connected: true, ...summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}