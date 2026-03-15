import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage }   from 'firebase-admin/storage';

if (!getApps().length) {
  initializeApp({
    credential:    cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const FIVE_MIN = 5 * 60 * 1000;

export default async function handler(req, res) {
  try {
    const db       = getFirestore();
    const alertRef = db.collection('alerts').doc('current');
    const snap     = await alertRef.get();

    if (!snap.exists) { res.json({ message: 'No alert document found' }); return; }

    const data = snap.data();
    if (!data.active) { res.json({ message: 'No active alert' }); return; }

    const age = Date.now() - data.firedAt;
    if (age < FIVE_MIN) {
      const remaining = Math.ceil((FIVE_MIN - age) / 1000);
      res.json({ message: `Alert still active — ${remaining}s remaining` });
      return;
    }

    // Delete images from Storage
    const bucket = getStorage().bucket();
    if (data.carPath)   await bucket.file(data.carPath).delete().catch(() => {});
    if (data.platePath) await bucket.file(data.platePath).delete().catch(() => {});

    // Clear Firestore
    await alertRef.update({ active: false });

    res.json({ message: 'Alert cleared and images deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
