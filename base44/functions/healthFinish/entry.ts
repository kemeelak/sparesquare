import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { PROVIDERS, callbackUrl, credentials, isProvider } from '../../shared/health.ts';

// Finishes a wearable link started by healthCallback. The caller is the signed-in
// member's own browser, so the tokens are bound to the account that actually went
// through the consent screen — a link started from someone else's state is refused.
const TICKET_TTL_MS = 10 * 60 * 1000;

export default async function (req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ticketId = typeof body.ticket === 'string' ? body.ticket.trim() : '';
    if (!ticketId) return Response.json({ error: 'ticket is required' }, { status: 400 });

    const db = base44.asServiceRole;
    const ticket = await db.entities.HealthLinkTicket.get(ticketId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!ticket) return Response.json({ error: 'That connection link has expired — try connecting again.' }, { status: 410 });

    const age = Date.now() - new Date(ticket.created_date).getTime();
    if (!(age >= 0 && age < TICKET_TTL_MS)) {
      await db.entities.HealthLinkTicket.delete(ticket.id).catch(() => {});
      return Response.json({ error: 'That connection link has expired — try connecting again.' }, { status: 410 });
    }

    if (ticket.state_user_id !== user.id) {
      console.log('healthFinish_user_mismatch', { ticketUser: ticket.state_user_id, caller: user.id });
      return Response.json({ error: 'That connection link was started from a different account.' }, { status: 403 });
    }

    const provider = ticket.provider;
    if (!isProvider(provider)) return Response.json({ error: 'Unsupported provider' }, { status: 400 });

    const { clientId, clientSecret } = credentials(provider, secrets);
    if (!clientId || !clientSecret) {
      return Response.json({ error: `${PROVIDERS[provider].label} app credentials are not set` }, { status: 500 });
    }

    const tokens = await PROVIDERS[provider].exchangeCode({
      code: ticket.code,
      redirectUri: callbackUrl(),
      clientId,
      clientSecret,
    });

    const record = {
      user_id: user.id,
      provider,
      provider_user_id: tokens.user_id ? String(tokens.user_id) : '',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expires_in ?? 86400) * 1000).toISOString(),
      scope: tokens.scope || '',
      status: 'connected',
      last_error: '',
    };

    const { items } = await db.entities.HealthConnection.filter({ user_id: user.id, provider }, { limit: 1 });
    if (items[0]) await db.entities.HealthConnection.update(items[0].id, record);
    else await db.entities.HealthConnection.create(record);

    await db.entities.HealthLinkTicket.delete(ticket.id).catch(() => {});

    return Response.json({ connected: true, provider });
  } catch (error) {
    console.log('healthFinish_error', error?.message);
    const reason = String(error?.message ?? error).slice(0, 140);
    return Response.json({ error: reason || 'Could not finish connecting that wearable' }, { status: 500 });
  }
}