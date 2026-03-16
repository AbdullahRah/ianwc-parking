const DURATION_MS  = 5 * 60 * 1000;
const STATE_FOLDER = '/ianwc-state';
const STATE_FILE   = 'alert.json';
const ENDPOINT     = 'https://ik.imagekit.io/8gt8xhlts';

function ikAuth() {
  return 'Basic ' + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64');
}

async function readState() {
  try {
    const url = `${ENDPOINT}${STATE_FOLDER}/${STATE_FILE}?v=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function writeState(state) {
  const json = JSON.stringify(state);
  const b64  = Buffer.from(json).toString('base64');

  const form = new FormData();
  form.append('file', `data:application/json;base64,${b64}`);
  form.append('fileName', STATE_FILE);
  form.append('folder', STATE_FOLDER);
  form.append('useUniqueFileName', 'false');
  form.append('overwriteFile', 'true');

  await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: ikAuth() },
    body: form,
  });
}

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
        await writeState({ active: false });
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
      await writeState({ active: false });
      res.json({ success: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
