// api/alert.js
// Vercel Serverless Function — stores alert state in Vercel KV (free Redis)
// GET  /api/alert  → returns current active alert
// POST /api/alert  → fires a new alert (multipart with car + plate images)
// DELETE /api/alert → clears the alert

import { kv } from '@vercel/kv';

const ALERT_KEY     = 'parking:alert';
const CAR_IMG_KEY   = 'parking:car_img';
const PLATE_IMG_KEY = 'parking:plate_img';
const DURATION_MS   = 90 * 1000; // 90 seconds

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: poll for current alert ─────────────────────────
  if (req.method === 'GET') {
    const alert = await kv.get(ALERT_KEY);
    if (!alert) { res.json({ active: false }); return; }

    const now = Date.now();
    const elapsed = now - alert.firedAt;

    if (elapsed > DURATION_MS) {
      // Expired — clean up
      await kv.del(ALERT_KEY);
      await kv.del(CAR_IMG_KEY);
      await kv.del(PLATE_IMG_KEY);
      res.json({ active: false });
      return;
    }

    const secondsLeft = Math.ceil((DURATION_MS - elapsed) / 1000);
    const carImg   = await kv.get(CAR_IMG_KEY);
    const plateImg = await kv.get(PLATE_IMG_KEY);

    res.json({ active: true, secondsLeft, carImg, plateImg, firedAt: alert.firedAt });
    return;
  }

  // ── POST: fire a new alert ───────────────────────────────
  if (req.method === 'POST') {
    const { carImg, plateImg } = req.body;

    if (!carImg) { res.status(400).json({ error: 'carImg is required' }); return; }

    const firedAt = Date.now();
    const ttlSec  = 120; // store for 2min to be safe

    await kv.set(ALERT_KEY,     { firedAt }, { ex: ttlSec });
    await kv.set(CAR_IMG_KEY,   carImg,      { ex: ttlSec });
    if (plateImg) {
      await kv.set(PLATE_IMG_KEY, plateImg,  { ex: ttlSec });
    } else {
      await kv.del(PLATE_IMG_KEY);
    }

    res.json({ success: true, firedAt, secondsLeft: 90 });
    return;
  }

  // ── DELETE: cancel alert ─────────────────────────────────
  if (req.method === 'DELETE') {
    await kv.del(ALERT_KEY);
    await kv.del(CAR_IMG_KEY);
    await kv.del(PLATE_IMG_KEY);
    res.json({ success: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
