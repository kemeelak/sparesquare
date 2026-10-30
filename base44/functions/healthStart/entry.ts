import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { PROVIDERS, callbackUrl, credentials, isProvider, signState } from '../../shared/health.ts';

// Starts the consent flow for one wearable. The redirect address is pinned to the
// published app — providers refuse any callback that is not registered with them.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const provider = body.provider || new URL(req.url).searchParams.get('provider') || 'oura';
    if (!isProvider(provider)) return Response.json({ error: 'Unsupported provider' }, { status: 400 });

    const { clientId, clientSecret } = credentials(provider, secrets);
    if (!clientId || !clientSecret) {
      return Response.json({ error: `${PROVIDERS[provider].label} app credentials are not set` }, { status: 500 });
    }

    const state = await signState(user.id, provider, clientSecret);
    const url = PROVIDERS[provider].buildAuthorizeUrl({ clientId, redirectUri: callbackUrl(), state });

    return Response.json({ url, provider });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}