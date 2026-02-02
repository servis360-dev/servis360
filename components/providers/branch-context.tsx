'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface BranchContextType {
    branches: any[];
    selectedBranch: string | null; // null = Tüm Şubeler
    setBranch: (branchId: string | null) => void;
    loading: boolean;
    isHeadquarters: boolean; // Seçili şube merkez mi?
}

const BranchContext = createContext<BranchContextType>({
    branches: [],
    selectedBranch: null,
    setBranch: () => { },
    loading: true,
    isHeadquarters: false
});

export const BranchProvider = ({ children }: { children: React.ReactNode }) => {
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isHeadquarters, setIsHeadquarters] = useState(false);
    const [user, setUser] = useState<any>(null);

    // 1. Kullanıcı Oturumunu Dinle
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setBranches([]);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // 2. Şubeleri Dinle ve Hafızayı (LocalStorage) Kontrol Et
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches'),
            orderBy('createdAt', 'asc') // İlk açılan şube en başta gelsin
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setBranches(data);

            // LocalStorage'dan son seçimi al
            const savedBranch = localStorage.getItem('servis360_last_branch');

            // Eğer kaydedilmiş şube hala geçerliyse (silinmemişse) onu seç
            if (savedBranch && savedBranch !== 'all') {
                const found = data.find(b => b.id === savedBranch);
                if (found) {
                    setBranch(savedBranch);
                } else {
                    setBranch(null); // Kayıtlı şube silinmişse genele dön
                }
            } else {
                // Kayıt yoksa veya 'all' ise varsayılan olarak null (Tüm Şubeler)
                setBranch(null);
            }

            setLoading(false);
        });

        return () => unsub();
    }, [user]);

    const setBranch = (branchId: string | null) => {
        setSelectedBranch(branchId);

        // LocalStorage Kaydı
        if (branchId) {
            localStorage.setItem('servis360_last_branch', branchId);
            const branch = branches.find(b => b.id === branchId);
            setIsHeadquarters(branch?.isHeadquarters || false);
        } else {
            localStorage.setItem('servis360_last_branch', 'all');
            setIsHeadquarters(false);
        }
    };

    return (
        <BranchContext.Provider value={{ branches, selectedBranch, setBranch, loading, isHeadquarters }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext);