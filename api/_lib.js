export const DURATION_MS  = 5 * 60 * 1000;
export const ENDPOINT     = 'https://ik.imagekit.io/8gt8xhlts';
export const STATE_FOLDER = '/ianwc-state';
export const STATE_FILE   = 'alert.json';

export function ikAuth() {
  return 'Basic ' + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64');
}

export async function readState() {
  try {
    const res = await fetch(`${ENDPOINT}${STATE_FOLDER}/${STATE_FILE}?v=${Date.now()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function writeState(state) {
  const form = new FormData();
  form.append('file', `data:application/json;base64,${Buffer.from(JSON.stringify(state)).toString('base64')}`);
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

export async function clearAlert(state) {
  // Delete car and plate images from ImageKit
  const ids = [state?.carFileId, state?.plateFileId].filter(Boolean);
  await Promise.all(ids.map(id =>
    fetch(`https://api.imagekit.io/v1/files/${id}`, {
      method: 'DELETE',
      headers: { Authorization: ikAuth() },
    })
  ));
  // Mark state inactive
  await writeState({ active: false });
}
