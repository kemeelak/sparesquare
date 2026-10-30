import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { callbackUrl, exchangeCode, verifyState, OURA_SCOPES } from '../../shared/oura.ts';

// Oura sends the browser here after consent — no app login on this request, so the
// signed state is what tells us which user just connected.
export default async function (req) {
  const requestUrl = new URL(req.url);
  const appUrl = req.headers.get('x-base44-app-url') || requestUrl.origin;
  const back = (query) => new Response(null, { status: 302, headers: { Location: `${appUrl}/Progress?${query}` } });

  try {
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    if (requestUrl.searchParams.get('error') || !code || !state) return back('oura=denied');

    const clientId = secrets.get('OURA_CLIENT_ID');
    const clientSecret = secrets.get('OURA_CLIENT_SECRET');
    if (!clientId || !clientSecret) return back('oura=error');

    const userId = await verifyState(state, clientSecret);
    if (!userId) return back('oura=error');

    const tokens = await exchangeCode({
      code,
      redirectUri: callbackUrl(appUrl),
      clientId,
      clientSecret,
    });

    const base44 = createClientFromRequest(req);
    const record = {
      user_id: userId,
      provider: 'oura',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expires_in ?? 86400) * 1000).toISOString(),
      scope: tokens.scope || OURA_SCOPES,
      status: 'connected',
      last_error: '',
    };

    const { items } = await base44.asServiceRole.entities.HealthConnection.filter(
      { user_id: userId, provider: 'oura' },
      { limit: 1 }
    );
    if (items[0]) await base44.asServiceRole.entities.HealthConnection.update(items[0].id, record);
    else await base44.asServiceRole.entities.HealthConnection.create(record);

    return back('oura=connected');
  } catch (error) {
    return back('oura=error');
  }
}