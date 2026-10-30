import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Binds friend requests / invites that were sent to an email before that person had an
// account, so the request shows up in their Pending Requests once they sign up.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = (user.email || '').toLowerCase();
    if (!email) return Response.json({ claimed: 0 });

    const admin = base44.asServiceRole;
    const [lower, asIs] = await Promise.all([
      admin.entities.Friendship.filter({ recipient_email: email }, { limit: 200 }),
      admin.entities.Friendship.filter({ recipient_email: user.email }, { limit: 200 }),
    ]);

    const seen = new Set();
    const candidates = [...(lower?.items || []), ...(asIs?.items || [])].filter((f) => {
      if (!f || seen.has(f.id)) return false;
      seen.add(f.id);
      if (f.recipient_id === user.id) return false;      // already bound to me
      if (f.requester_id === user.id) return false;      // something I sent
      if (f.status === 'declined') return false;
      return String(f.recipient_email || '').toLowerCase() === email;
    });

    let claimed = 0;
    for (const f of candidates) {
      await admin.entities.Friendship.update(f.id, {
        recipient_id: user.id,
        recipient_name: user.full_name || f.recipient_name || user.email,
      });
      claimed += 1;
    }

    return Response.json({ claimed });
  } catch (error) {
    console.error('claimFriendInvites failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}