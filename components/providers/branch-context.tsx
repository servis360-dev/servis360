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

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                // Şubeleri Dinle
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'branches'),
                    orderBy('createdAt', 'asc') // İlk açılan şube en başta gelsin
                );

                const unsub = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setBranches(data);

                    // Şube listesi yüklendiğinde, eğer daha önce seçim yapılmadıysa varsayılanı ayarla
                    // İstersen burada localStorage'dan son seçimi okuyabilirsin.

                    setLoading(false);
                });
                return () => unsub();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const setBranch = (branchId: string | null) => {
        setSelectedBranch(branchId);
        if (branchId) {
            const branch = branches.find(b => b.id === branchId);
            setIsHeadquarters(branch?.isHeadquarters || false);
        } else {
            setIsHeadquarters(false); // "Tüm Şubeler" modunda merkez özelliği aranmaz
        }
    };

    return (
        <BranchContext.Provider value={{ branches, selectedBranch, setBranch, loading, isHeadquarters }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext);