import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { APP_URL, PROVIDERS, callbackUrl, credentials, stateProvider, verifyState } from '../../shared/health.ts';

// Every wearable sends the browser here after consent — no app login on this
// request. So this handler never stores tokens: it parks the authorization code in a
// short-lived ticket and hands the browser back to the app, where the signed-in member
// claims it. Tokens can then only ever land on the account that actually completed the
// flow in that browser, never on whoever's state was in the URL.
export default async function (req) {
  const requestUrl = new URL(req.url);
  const provider = stateProvider(requestUrl.searchParams.get('state')) || 'oura';
  const back = (query) =>
    new Response(null, { status: 302, headers: { Location: `${APP_URL}/Progress?${query}&provider=${provider}` } });
  const label = PROVIDERS[provider]?.label || 'Wearable';

  try {
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    if (requestUrl.searchParams.get('error') || !code || !state) {
      return back(`health=denied&reason=${encodeURIComponent(requestUrl.searchParams.get('error_description') || '')}`);
    }
    if (!PROVIDERS[provider]) return back('health=error&reason=unsupported-provider');

    const { clientId, clientSecret } = credentials(provider, secrets);
    if (!clientId || !clientSecret) return back('health=error&reason=missing-credentials');

    const verified = await verifyState(state, clientSecret);
    if (!verified || verified.provider !== provider) return back('health=error&reason=invalid-state');

    const base44 = createClientFromRequest(req);
    const ticket = await base44.asServiceRole.entities.HealthLinkTicket.create({
      code,
      provider,
      state_user_id: verified.userId,
    });

    return back(`health=pending&ticket=${encodeURIComponent(ticket.id)}`);
  } catch (error) {
    const reason = String(error?.message ?? error).slice(0, 140);
    return back(`health=error&reason=${encodeURIComponent(reason || `${label} would not connect`)}`);
  }
}