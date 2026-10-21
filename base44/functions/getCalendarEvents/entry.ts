import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const CONNECTOR_ID = '6ad815231cdd9de033a79a50';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dateStr = body.date;
    if (!dateStr) return Response.json({ error: 'date is required' }, { status: 400 });

    const dayStart = new Date(dateStr + 'T00:00:00');
    const dayEnd = new Date(dateStr + 'T23:59:59');

    let accessToken;
    try {
      ({ accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID));
    } catch (e) {
      return Response.json({ error: 'not_connected', message: e.message }, { status: 401 });
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
      const errText = await res.text();
      return Response.json({ error: 'google_api_error', details: errText }, { status: res.status });
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

    return Response.json({ blocks });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}