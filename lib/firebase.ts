import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// .env.local dosyasındaki gizli bilgileri burayaa çekiyoruz
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Next.js çalışırken bazen sayfayı yenilediğinde Firebase'i tekrar başlatmaya çalışır.
// Bu kod, "Eğer zaten başladıysa yenisini başlatma, mevcut olanı kullan" der.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Kimlik Doğrulama (Giriş/Çıkış) servisi
const auth = getAuth(app);

// Veritabanı (Firestore) servisi
const db = getFirestore(app);

export { app, auth, db };