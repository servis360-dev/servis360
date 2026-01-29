'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase'; // Yoluna dikkat et
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[]; // ['admin', 'patron'] gibi
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // 1. Oturum kontrolü
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // Giriş yapmamışsa login'e at
                router.push('/login');
                return;
            }

            // 2. Rol kontrolü (Veritabanından profilini çek)
            try {
                const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
                const profileSnap = await getDoc(profileRef);

                if (profileSnap.exists()) {
                    const userData = profileSnap.data();
                    const userRole = userData.role || 'user';

                    if (allowedRoles.includes(userRole)) {
                        setAuthorized(true); // Geçiş izni ver
                    } else {
                        // Yetkisi yoksa ana sayfaya at
                        router.push('/dashboard');
                        alert("Bu sayfaya erişim yetkiniz yok!");
                    }
                } else {
                    router.push('/login');
                }
            } catch (error) {
                console.error("Yetki kontrolü hatası:", error);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router, allowedRoles]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-500">Yetkiler kontrol ediliyor...</p>
                </div>
            </div>
        );
    }

    // Eğer yetkili değilse (ve yönlendirme henüz gerçekleşmediyse) hiçbir şey gösterme
    if (!authorized) return null;

    // Yetkiliyse sayfayı göster
    return <>{children}</>;
}