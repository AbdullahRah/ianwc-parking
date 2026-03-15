// api/alert.js
// Vercel Serverless Function — stores alert state & images in Vercel Blob
// GET    /api/alert  → returns current active alert
// POST   /api/alert  → fires a new alert (JSON body with base64 carImg + plateImg)
// DELETE /api/alert  → clears the alert

import { put, del, list } from '@vercel/blob';

const DURATION_MS = 90 * 1000; // 90 seconds

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

async function getBlobs() {
  const { blobs } = await list({ prefix: 'parking/' });
  return {
    state: blobs.find(b => b.pathname === 'parking/state.json'),
    car:   blobs.find(b => b.pathname === 'parking/car.jpg'),
    plate: blobs.find(b => b.pathname === 'parking/plate.jpg'),
  };
}

async function clearAll(found) {
  const urls = Object.values(found).filter(Boolean).map(b => b.url);
  if (urls.length) await del(urls);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: poll for current alert ─────────────────────────
  if (req.method === 'GET') {
    const found = await getBlobs();
    if (!found.state) { res.json({ active: false }); return; }

    const state = await fetch(found.state.url).then(r => r.json());
    const elapsed = Date.now() - state.firedAt;

    if (elapsed > DURATION_MS) {
      await clearAll(found);
      res.json({ active: false });
      return;
    }

    const secondsLeft = Math.ceil((DURATION_MS - elapsed) / 1000);
    res.json({
      active: true,
      secondsLeft,
      carImg:   found.car?.url   || null,
      plateImg: found.plate?.url || null,
      firedAt:  state.firedAt,
    });
    return;
  }

  // ── POST: fire a new alert ───────────────────────────────
  if (req.method === 'POST') {
    const { carImg, plateImg } = req.body;
    if (!carImg) { res.status(400).json({ error: 'carImg is required' }); return; }

    // Clear any existing blobs first
    const existing = await getBlobs();
    await clearAll(existing);

    const firedAt = Date.now();

    const carBuf = Buffer.from(carImg.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    await put('parking/car.jpg', carBuf, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false });

    if (plateImg) {
      const plateBuf = Buffer.from(plateImg.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await put('parking/plate.jpg', plateBuf, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: false });
    }

    await put('parking/state.json', JSON.stringify({ firedAt }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.json({ success: true, firedAt, secondsLeft: 90 });
    return;
  }

  // ── DELETE: cancel alert ─────────────────────────────────
  if (req.method === 'DELETE') {
    const found = await getBlobs();
    await clearAll(found);
    res.json({ success: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
