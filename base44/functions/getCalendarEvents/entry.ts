import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { expandIcsEvents, safeFeedUrl } from '../../shared/ics.ts';

const CONNECTOR_ID = '6ad815231cdd9de033a79a50';

async function fetchGoogleBlocks(base44, dateStr) {
  const dayStart = new Date(dateStr + 'T00:00:00');
  const dayEnd = new Date(dateStr + 'T23:59:59');

  let accessToken;
  try {
    ({ accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID));
  } catch (e) {
    return { blocks: [], connected: false };
  }

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', dayStart.toISOString());
  url.searchParams.set('timeMax', dayEnd.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '100');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000)
  });

  if (!res.ok) {
    console.log('google_api_error', res.status, await res.text());
    return { blocks: [], connected: true };
  }

  const data = await res.json();
  const blocks = (data.items || []).map(ev => {
    const isAllDay = !ev.start.dateTime;
    const startDate = new Date(ev.start.dateTime || ev.start.date);
    const endDate = new Date(ev.end.dateTime || ev.end.date);
    let startHour = 0, endHour = 24;
    if (!isAllDay) {
      startHour = startDate.getHours();
      endHour = endDate.getHours();
      if (endDate.getMinutes() > 0) endHour += 1;
      if (endHour <= startHour) endHour = startHour + 1;
      if (endHour > 24) endHour = 24;
    }
    return {
      id: ev.id,
      label: ev.summary || 'Busy',
      emoji: '📅',
      start_hour: startHour,
      end_hour: endHour,
      all_day: isAllDay
    };
  });

  return { blocks, connected: true };
}

// `feedUrl` has already been checked by safeFeedUrl — only that value reaches fetch.
async function fetchFeedBlocks(feedUrl, dateStr) {
  const res = await fetch(feedUrl, {
    headers: { Accept: 'text/calendar, text/plain, */*' },
    signal: AbortSignal.timeout(12000)
  });

  if (!res.ok) {
    console.log('ics_feed_error', res.status);
    return { blocks: [], error: `The calendar link answered with ${res.status}` };
  }

  const text = await res.text();
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    console.log('ics_feed_not_calendar');
    return { blocks: [], error: 'That link did not return a calendar file' };
  }

  return { blocks: expandIcsEvents(text, dateStr), error: null };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dateStr = body.date;
    if (!dateStr) return Response.json({ error: 'date is required' }, { status: 400 });

    // A read-only .ics feed the user pasted (iCloud / Apple Calendar public share link)
    const { items: profiles } = await base44.asServiceRole.entities.UserProfile.filter(
      { created_by_id: user.id },
      { limit: 1 }
    );
    const feedUrl = (profiles?.[0]?.calendar_feed_url || '').trim();
    // The stored link is user-typed, so it is validated here before any request leaves the server.
    const safeFeed = feedUrl ? safeFeedUrl(feedUrl) : null;
    if (feedUrl && !safeFeed) console.log('ics_feed_rejected', 'unsupported host');

    const [google, feed] = await Promise.allSettled([
      fetchGoogleBlocks(base44, dateStr),
      safeFeed
        ? fetchFeedBlocks(safeFeed, dateStr)
        : Promise.resolve(feedUrl ? { blocks: [], error: 'That link is not a supported calendar address. Paste the webcal:// link iCloud gives you.' } : null)
    ]);

    const googleResult = google.status === 'fulfilled' ? google.value : { blocks: [], connected: false };
    const feedResult = feed.status === 'fulfilled' && feed.value ? feed.value : { blocks: [], error: feed.status === 'rejected' ? 'Could not reach that calendar link' : null };

    if (!googleResult.connected && !feedUrl) {
      return Response.json({ error: 'not_connected', blocks: [], ics_connected: false }, { status: 401 });
    }

    return Response.json({
      blocks: [...googleResult.blocks, ...feedResult.blocks],
      google_connected: googleResult.connected,
      ics_connected: !!feedUrl,
      ics_error: feedResult.error
    });
  } catch (error) {
    console.log('getCalendarEvents_error', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}