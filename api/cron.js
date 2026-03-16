const DURATION_MS  = 5 * 60 * 1000;
const STATE_FOLDER = '/ianwc-state';
const STATE_FILE   = 'alert.json';
const ENDPOINT     = 'https://ik.imagekit.io/8gt8xhlts';

function ikAuth() {
  return 'Basic ' + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64');
}

async function readState() {
  try {
    const res = await fetch(`${ENDPOINT}${STATE_FOLDER}/${STATE_FILE}?v=${Date.now()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function writeState(state) {
  const b64  = Buffer.from(JSON.stringify(state)).toString('base64');
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

async function deleteFile(fileId) {
  await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: ikAuth() },
  });
}

export default async function handler(req, res) {
  try {
    const state = await readState();

    if (!state?.active) { res.json({ message: 'No active alert' }); return; }

    const age = Date.now() - state.firedAt;
    if (age < DURATION_MS) {
      res.json({ message: `Still active — ${Math.ceil((DURATION_MS - age) / 1000)}s remaining` });
      return;
    }

    // Delete images
    const ids = [state.carFileId, state.plateFileId].filter(Boolean);
    await Promise.all(ids.map(deleteFile));

    // Clear state
    await writeState({ active: false });

    res.json({ message: 'Alert cleared and images deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
