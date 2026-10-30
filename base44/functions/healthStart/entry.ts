import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { callbackUrl, signState, OURA_SCOPES } from '../../shared/oura.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const clientId = secrets.get('OURA_CLIENT_ID');
    const clientSecret = secrets.get('OURA_CLIENT_SECRET');
    if (!clientId || !clientSecret) return Response.json({ error: 'Oura app credentials are not set' }, { status: 500 });

    const state = await signState(user.id, clientSecret);

    const url = `${'https://cloud.ouraring.com/oauth/authorize'}?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl())}` +
      `&scope=${encodeURIComponent(OURA_SCOPES)}` +
      `&state=${encodeURIComponent(state)}`;

    return Response.json({ url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}