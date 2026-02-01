'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface BranchContextType {
    branches: any[];
    selectedBranch: string | null; // null = Tüm Þubeler
    setBranch: (branchId: string | null) => void;
    loading: boolean;
    isHeadquarters: boolean; // Seçili þube merkez mi?
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
                // Þubeleri Dinle
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'branches'),
                    orderBy('createdAt', 'asc') // Ýlk açýlan þube en baþta gelsin
                );

                const unsub = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setBranches(data);

                    // Þube listesi yüklendiðinde, eðer daha önce seçim yapýlmadýysa varsayýlaný ayarla
                    // Ýstersen burada localStorage'dan son seçimi okuyabilirsin.

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
            setIsHeadquarters(false); // "Tüm Þubeler" modunda merkez özelliði aranmaz
        }
    };

    return (
        <BranchContext.Provider value={{ branches, selectedBranch, setBranch, loading, isHeadquarters }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext);