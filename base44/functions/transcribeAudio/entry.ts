import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Turns a voice note the member just recorded into text. The recording sits in private
// storage, so both the signed URL and the transcription happen here — the browser only
// hands over the storage path it uploaded.
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

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 300,
    });

    const transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: signed_url });
    const text = typeof transcript === 'string' ? transcript : transcript?.text || '';

    return Response.json({ transcript: text });
  } catch (error) {
    console.log('transcribeAudio_error', error?.message);
    return Response.json({ error: error?.message || 'Could not transcribe that recording' }, { status: 500 });
  }
}