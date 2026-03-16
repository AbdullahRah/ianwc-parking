import { DURATION_MS, readState, clearAlert } from './_lib.js';

export default async function handler(req, res) {
  try {
    const state = await readState();

    if (!state?.active) { res.json({ message: 'No active alert' }); return; }

    const age = Date.now() - state.firedAt;
    if (age < DURATION_MS) {
      res.json({ message: `Still active — ${Math.ceil((DURATION_MS - age) / 1000)}s remaining` });
      return;
    }

    await clearAlert(state); // deletes images + marks inactive
    res.json({ message: 'Alert cleared and images deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
