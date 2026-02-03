import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Ortam değişkenlerini kontrol et
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Vercel'de satır sonu (\n) sorununu çözen kritik ayar:
    privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
};

// Uygulama zaten varsa onu kullan, yoksa yeniden başlat (Next.js Hot Reload sorunu için)
const app = getApps().length === 0
    ? initializeApp({ credential: cert(serviceAccount) })
    : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);