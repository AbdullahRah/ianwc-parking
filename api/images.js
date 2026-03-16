export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { data, fileName } = req.body;
    if (!data) return res.status(400).json({ error: 'data is required' });

    const form = new FormData();
    form.append('file', data);
    form.append('fileName', fileName || 'photo.jpg');
    form.append('folder', '/parking-alerts');
    form.append('useUniqueFileName', 'true');

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64'),
      },
      body: form,
    });

    const result = await response.json();
    if (!response.ok) return res.status(500).json({ error: result.message || 'Upload failed' });

    return res.json({ url: result.url, fileId: result.fileId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
