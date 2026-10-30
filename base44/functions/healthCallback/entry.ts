import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { APP_URL, PROVIDERS, callbackUrl, credentials, stateProvider, verifyState } from '../../shared/health.ts';

// Every wearable sends the browser here after consent — no app login on this
// request, so the signed state is what tells us which user and provider it was.
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

    const tokens = await PROVIDERS[provider].exchangeCode({
      code,
      redirectUri: callbackUrl(),
      clientId,
      clientSecret,
    });

    const base44 = createClientFromRequest(req);
    const record = {
      user_id: verified.userId,
      provider,
      provider_user_id: tokens.user_id ? String(tokens.user_id) : '',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expires_in ?? 86400) * 1000).toISOString(),
      scope: tokens.scope || '',
      status: 'connected',
      last_error: '',
    };

    const { items } = await base44.asServiceRole.entities.HealthConnection.filter(
      { user_id: verified.userId, provider },
      { limit: 1 }
    );
    if (items[0]) await base44.asServiceRole.entities.HealthConnection.update(items[0].id, record);
    else await base44.asServiceRole.entities.HealthConnection.create(record);

    return back('health=connected');
  } catch (error) {
    const reason = String(error?.message ?? error).slice(0, 140);
    return back(`health=error&reason=${encodeURIComponent(reason || `${label} would not connect`)}`);
  }
}