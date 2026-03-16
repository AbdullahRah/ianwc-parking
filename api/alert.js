import { DURATION_MS, readState, writeState, clearAlert } from './_lib.js';

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (req.method === 'GET') {
      const state = await readState();
      if (!state?.active) { res.json({ active: false }); return; }

      const elapsed = Date.now() - state.firedAt;
      if (elapsed > DURATION_MS) {
        await clearAlert(state); // deletes images + marks inactive
        res.json({ active: false });
        return;
      }

      res.json({
        active:      true,
        secondsLeft: Math.ceil((DURATION_MS - elapsed) / 1000),
        firedAt:     state.firedAt,
        carUrl:      state.carUrl,
        plateUrl:    state.plateUrl || null,
      });
      return;
    }

    if (req.method === 'POST') {
      const { carUrl, plateUrl, carFileId, plateFileId } = req.body;
      if (!carUrl) { res.status(400).json({ error: 'carUrl required' }); return; }
      await writeState({
        active:      true,
        firedAt:     Date.now(),
        carUrl,
        plateUrl:    plateUrl    || null,
        carFileId,
        plateFileId: plateFileId || null,
      });
      res.json({ success: true, secondsLeft: 300 });
      return;
    }

    if (req.method === 'DELETE') {
      const state = await readState();
      await clearAlert(state); // deletes images + marks inactive
      res.json({ success: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
