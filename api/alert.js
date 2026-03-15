// api/alert.js
// State stored as a raw JSON file in Cloudinary — no Vercel KV or Blob needed.
// Images are uploaded directly from the browser to Cloudinary (never touch Vercel).
// Only the tiny state JSON (a few hundred bytes) is written here.

const CLOUD_NAME    = 'dvoigihv4';
const UPLOAD_PRESET = 'qe91hdkq';
const STATE_ID      = 'ianwc-parking-state';
const DURATION_MS   = 90 * 1000;

async function readState() {
  try {
    const r = await fetch(
      `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${STATE_ID}?t=${Date.now()}`
    );
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function writeState(data) {
  const fd = new FormData();
  fd.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }), 'state.json');
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('public_id', STATE_ID);
  fd.append('invalidate', 'true');

  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
    method: 'POST',
    body: fd,
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to save state');
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const state = await readState();
    if (!state?.active) { res.json({ active: false }); return; }

    const elapsed = Date.now() - state.firedAt;
    if (elapsed > DURATION_MS) {
      await writeState({ active: false });
      res.json({ active: false });
      return;
    }

    res.json({
      active:      true,
      secondsLeft: Math.ceil((DURATION_MS - elapsed) / 1000),
      carUrl:      state.carUrl,
      plateUrl:    state.plateUrl || null,
      firedAt:     state.firedAt,
    });
    return;
  }

  // ── POST ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { carUrl, plateUrl } = req.body;
    if (!carUrl) { res.status(400).json({ error: 'carUrl is required' }); return; }

    await writeState({ active: true, firedAt: Date.now(), carUrl, plateUrl: plateUrl || null });
    res.json({ success: true, secondsLeft: 90 });
    return;
  }

  // ── DELETE ───────────────────────────────────────────────
  if (req.method === 'DELETE') {
    await writeState({ active: false });
    res.json({ success: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
