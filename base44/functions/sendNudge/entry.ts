import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Sends one accountability nudge. The recipient must be an accepted connection of the
// caller — every member's user id is readable, so the friendship check has to happen
// here and not only in the UI.
const TYPES = ['nudge', 'checkin', 'motivation', 'alert', 'hype', 'celebration', 'challenge', 'custom'];

export default async function (req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const toUserId = typeof body.to_user_id === 'string' ? body.to_user_id.trim() : '';
    const type = TYPES.includes(body.type) ? body.type : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';

    if (!toUserId || !type) return Response.json({ error: 'to_user_id and type are required' }, { status: 400 });
    if (toUserId === user.id) return Response.json({ error: 'You cannot nudge yourself' }, { status: 400 });

    const db = base44.asServiceRole;
    const [mine, theirs] = await Promise.all([
      db.entities.Friendship.filter({ status: 'accepted', requester_id: user.id, recipient_id: toUserId }, { limit: 1 }),
      db.entities.Friendship.filter({ status: 'accepted', requester_id: toUserId, recipient_id: user.id }, { limit: 1 }),
    ]);
    const linked = (mine?.items?.length || 0) + (theirs?.items?.length || 0) > 0;
    if (!linked) {
      console.log('sendNudge_not_connected', { from: user.id, to: toUserId });
      return Response.json({ error: 'You can only nudge someone you are connected with.' }, { status: 403 });
    }

    const nudge = await db.entities.AccountabilityNudge.create({
      from_user_id: user.id,
      to_user_id: toUserId,
      from_name: user.full_name || 'Your partner',
      type,
      message,
      read: false,
    });

    return Response.json({ nudge });
  } catch (error) {
    console.log('sendNudge_error', error?.message);
    return Response.json({ error: error?.message || 'Could not send that nudge' }, { status: 500 });
  }
}