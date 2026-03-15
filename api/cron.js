import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zhhbcwcaucmmcwgtghfn.supabase.co';
const FIVE_MIN     = 5 * 60 * 1000;
const BUCKET       = 'parking-alerts';

export default async function handler(req, res) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });
    return;
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  try {
    const { data, error } = await supabase
      .from('alert_state').select('*').eq('id', 1).single();

    if (error) throw new Error(error.message);
    if (!data?.active) { res.json({ message: 'No active alert' }); return; }

    const age = Date.now() - data.fired_at;
    if (age < FIVE_MIN) {
      res.json({ message: `Still active — ${Math.ceil((FIVE_MIN - age) / 1000)}s remaining` });
      return;
    }

    // Delete images
    const toDelete = [data.car_path, data.plate_path].filter(Boolean);
    if (toDelete.length) await supabase.storage.from(BUCKET).remove(toDelete);

    // Clear alert
    await supabase.from('alert_state').update({ active: false }).eq('id', 1);

    res.json({ message: 'Alert cleared and images deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
