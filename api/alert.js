// api/alert.js
// State stored as a tiny SVG image in Cloudinary (works with image-only presets).
// JSON is base64-encoded inside the SVG <desc> tag and read back on GET.
// Images are uploaded directly from the browser — this function never handles them.

const CLOUD_NAME    = 'dvoigihv4';
const UPLOAD_PRESET = 'qe91hdkq';
const STATE_ID      = 'ianwc-parking-state';
const DURATION_MS   = 90 * 1000;

function makeStateSvg(data) {
  const b64 = Buffer.from(JSON.stringify(data)).toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><desc>${b64}</desc></svg>`;
}

async function readState() {
  try {
    const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${STATE_ID}.svg?t=${Date.now()}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const svg = await r.text();
    const match = svg.match(/<desc>([A-Za-z0-9+/=]+)<\/desc>/);
    if (!match) return null;
    return JSON.parse(Buffer.from(match[1], 'base64').toString());
  } catch {
    return null;
  }
}

async function writeState(data) {
  const svg = makeStateSvg(data);
  const body = new URLSearchParams({
    file:           `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    upload_preset:  UPLOAD_PRESET,
    public_id:      STATE_ID,
    overwrite:      'true',
    invalidate:     'true',
  });

  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!r.ok) {
    const text = await r.text();
    let msg = 'Failed to save state';
    try { msg = JSON.parse(text).error.message; } catch {}
    throw new Error(msg);
  }
}

export const config = { api: { bodyParser: true } };

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
