import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Turns a voice note the member just recorded into text. The recording sits in private
// storage, so both the signed URL and the transcription happen here — the browser only
// hands over the storage path it uploaded.
//
// Two passes: a raw machine transcript, then a model that listens to the recording itself
// and rewrites it using what the app already knows about this person (names, buckets,
// goals) so the words that come out are the words they said.
export default async function(req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUri = typeof body.file_uri === 'string' ? body.file_uri.trim() : '';
    // A storage path, never an address — anything with a scheme is refused.
    if (!fileUri || fileUri.length > 500 || /^[a-z][a-z0-9+.-]*:\/\//i.test(fileUri)) {
      return Response.json({ error: 'file_uri is required' }, { status: 400 });
    }

    // Only transcribe a recording this member uploaded. Owning the VoiceNote row is the
    // proof — the user-scoped client applies the entity's own ownership rule, so another
    // member's path simply reads as nothing.
    const { items } = await base44.entities.VoiceNote.filter({ file_uri: fileUri }, { limit: 1 });
    if (!items?.length) {
      console.log('transcribeAudio_not_owner');
      return Response.json({ error: 'That recording is not yours.' }, { status: 403 });
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 300,
    });

    const raw = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: signed_url });
    const draft = (typeof raw === 'string' ? raw : raw?.text || '').trim();

    // What the app knows about them, so the right names and words land.
    const { items: profiles } = await base44.asServiceRole.entities.UserProfile
      .filter({ created_by_id: user.id }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const profile = profiles?.[0] || null;

    const contextLines = [
      profile?.partner_name ? `Their AI partner is called ${profile.partner_name}.` : '',
      profile?.goals?.length ? `Goals: ${profile.goals.slice(0, 6).join('; ')}` : '',
      profile?.existing_habits?.length ? `Habits they already keep: ${profile.existing_habits.slice(0, 8).join('; ')}` : '',
      profile?.bucket_settings?.length
        ? `The names they use for their life buckets: ${profile.bucket_settings.filter((b) => !b.hidden).map((b) => b.label || b.key).join(', ')}`
        : '',
      profile?.extra_notes?.length ? `Things about their life: ${profile.extra_notes.slice(0, 6).join('; ')}` : '',
    ].filter(Boolean);

    const prompt = [
      'You are cleaning up a spoken voice note. The words are theirs — never summarise, never shorten, never add advice, never answer what they said.',
      draft ? `A raw automatic transcript of it (may contain errors):\n"""\n${draft}\n"""` : 'There is no usable transcript yet — write it from the recording.',
      'The recording is attached. Listen to it and write out what they actually said:',
      '- correct misheard words, names, apps, places and numbers',
      '- keep their own wording, slang, tone and first person voice',
      '- drop filler and false starts ("um", "uh", "you know")',
      '- add punctuation and line breaks where they pause',
      '- keep every real thought, at full length',
      contextLines.length ? `What is known about this person, so terms come out right:\n${contextLines.join('\n')}` : '',
      'Reply with the cleaned transcript only — no preamble, no quotes, no notes.',
    ].filter(Boolean).join('\n\n');

    let text = draft;
    try {
      const cleaned = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: 'gemini_3_8_flash',
        prompt,
        file_urls: [signed_url],
      });
      const next = (typeof cleaned === 'string' ? cleaned : cleaned?.text || '').trim();
      // A rewrite that threw most of the note away is worse than the raw transcript.
      if (next && (!draft || next.length >= draft.length * 0.6)) text = next;
    } catch (e) {
      console.log('transcribeAudio_cleanup_failed', e?.message);
    }

    return Response.json({ transcript: text });
  } catch (error) {
    console.log('transcribeAudio_error', error?.message);
    return Response.json({ error: error?.message || 'Could not transcribe that recording' }, { status: 500 });
  }
}