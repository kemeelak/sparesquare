import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { PROVIDERS, credentials } from '../../shared/health.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await base44.asServiceRole.entities.HealthConnection.filter(
      { user_id: user.id },
      { limit: 10 }
    );
    const byProvider = new Map(items.map((item) => [item.provider, item]));

    const providers = Object.entries(PROVIDERS).map(([provider, spec]) => {
      const connection = byProvider.get(provider);
      const { clientId, clientSecret } = credentials(provider, secrets);
      return {
        provider,
        label: spec.label,
        configured: !!(clientId && clientSecret),
        connected: connection?.status === 'connected',
        lastSyncedAt: connection?.last_synced_at ?? null,
        lastError: connection?.last_error || null,
      };
    });

    // Kept for the single-provider Oura card that shipped before Fitbit existed.
    const oura = providers.find((p) => p.provider === 'oura');
    return Response.json({
      providers,
      connected: !!oura?.connected,
      provider: 'oura',
      lastSyncedAt: oura?.lastSyncedAt ?? null,
      lastError: oura?.lastError ?? null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}