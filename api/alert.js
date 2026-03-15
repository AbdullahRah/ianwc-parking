import { neon } from '@neondatabase/serverless';

const DURATION_MS = 90 * 1000;

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const sql = neon(process.env.storage_POSTGRES_URL);

  try {
    // GET
    if (req.method === 'GET') {
      const rows = await sql('SELECT * FROM alert_state WHERE id = 1');
      const state = rows[0];

      if (!state?.active) { res.json({ active: false }); return; }

      const elapsed = Date.now() - Number(state.fired_at);
      if (elapsed > DURATION_MS) {
        await sql('UPDATE alert_state SET active = false WHERE id = 1');
        res.json({ active: false });
        return;
      }

      res.json({
        active:      true,
        secondsLeft: Math.ceil((DURATION_MS - elapsed) / 1000),
        firedAt:     Number(state.fired_at),
        carData:     state.car_data,
        plateData:   state.plate_data || null,
      });
      return;
    }

    // POST
    if (req.method === 'POST') {
      const { carData, plateData } = req.body;
      if (!carData) { res.status(400).json({ error: 'carData is required' }); return; }

      await sql(
        'UPDATE alert_state SET active = true, fired_at = $1, car_data = $2, plate_data = $3 WHERE id = 1',
        [Date.now(), carData, plateData || null]
      );
      res.json({ success: true, secondsLeft: 90 });
      return;
    }

    // DELETE
    if (req.method === 'DELETE') {
      await sql('UPDATE alert_state SET active = false WHERE id = 1');
      res.json({ success: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
