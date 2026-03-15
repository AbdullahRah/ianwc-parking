// api/alert.js
// Vercel Serverless Function — stores alert state in Vercel KV
// Images are uploaded directly from the browser to Cloudinary.
// This function only ever handles tiny URLs, never image data.
//
// GET    /api/alert  → returns current active alert
// POST   /api/alert  → fires alert { carUrl, plateUrl }
// DELETE /api/alert  → clears the alert

import { kv } from '@vercel/kv';

const ALERT_KEY   = 'parking:alert';
const DURATION_MS = 90 * 1000; // 90 seconds

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: poll for current alert ─────────────────────────
  if (req.method === 'GET') {
    const alert = await kv.get(ALERT_KEY);
    if (!alert) { res.json({ active: false }); return; }

    const elapsed = Date.now() - alert.firedAt;
    if (elapsed > DURATION_MS) {
      await kv.del(ALERT_KEY);
      res.json({ active: false });
      return;
    }

    res.json({
      active:      true,
      secondsLeft: Math.ceil((DURATION_MS - elapsed) / 1000),
      carUrl:      alert.carUrl,
      plateUrl:    alert.plateUrl || null,
      firedAt:     alert.firedAt,
    });
    return;
  }

  // ── POST: fire a new alert ───────────────────────────────
  if (req.method === 'POST') {
    const { carUrl, plateUrl } = req.body;
    if (!carUrl) { res.status(400).json({ error: 'carUrl is required' }); return; }

    const firedAt = Date.now();
    await kv.set(ALERT_KEY, { firedAt, carUrl, plateUrl: plateUrl || null }, { ex: 120 });

    res.json({ success: true, firedAt, secondsLeft: 90 });
    return;
  }

  // ── DELETE: cancel alert ─────────────────────────────────
  if (req.method === 'DELETE') {
    await kv.del(ALERT_KEY);
    res.json({ success: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
