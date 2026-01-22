'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Product } from '@/types';
import { useAuth } from './AuthProvider';

type DataStoreContextType = {
    products: Product[];
    categories: Record<number, string>;
    specialEffects: Record<number, string>;
    pastings: Record<number, string>;
    sizes: any[];
    printers: any[];
    paperwalas: any[];
    loading: boolean;
    lastSync: Date | null;
    refreshData: () => Promise<void>;
};

const DataStoreContext = createContext<DataStoreContextType>({
    products: [],
    categories: {},
    specialEffects: {},
    pastings: {},
    sizes: [],
    printers: [],
    paperwalas: [],
    loading: true,
    lastSync: null,
    refreshData: async () => { },
});

export const DataStoreProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Record<number, string>>({});
    const [specialEffects, setSpecialEffects] = useState<Record<number, string>>({});
    const [pastings, setPastings] = useState<Record<number, string>>({});
    const [sizes, setSizes] = useState<any[]>([]);
    const [printers, setPrinters] = useState<any[]>([]);
    const [paperwalas, setPaperwalas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const loadFromLocalStorage = () => {
        try {
            const cached = localStorage.getItem('cpack_datastore_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                setProducts(parsed.products || []);
                setCategories(parsed.categories || {});
                setSpecialEffects(parsed.specialEffects || {});
                setPastings(parsed.pastings || {});
                setSizes(parsed.sizes || []);
                setPrinters(parsed.printers || []);
                setPaperwalas(parsed.paperwalas || []);
                if (parsed.lastSync) setLastSync(new Date(parsed.lastSync));
                // If we have cached data, we can set loading to false immediately for "instant" feel
                if (parsed.products?.length > 0) {
                    setLoading(false);
                }
            }
        } catch (e) {
            console.error('Failed to load cache:', e);
        }
    };

    const saveToLocalStorage = (data: any) => {
        try {
            localStorage.setItem('cpack_datastore_cache', JSON.stringify({
                ...data,
                lastSync: new Date().toISOString()
            }));
        } catch (e) {
            console.error('Failed to save cache:', e);
        }
    };

    const fetchAllData = useCallback(async () => {
        if (!user) return;

        try {
            const [
                prodRes,
                catRes,
                fxRes,
                pastRes,
                sizeRes,
                printRes,
                paperRes
            ] = await Promise.all([
                supabase.from('products').select('*').order('created_at', { ascending: false }),
                supabase.from('category').select('id, name'),
                supabase.from('special_effects').select('id, name'),
                supabase.from('pasting').select('id, name'),
                supabase.from('sizes').select('id, name').order('name'),
                supabase.from('printers').select('id, name, phone').order('name'),
                supabase.from('paperwala').select('id, name, phone').order('name')
            ]);

            const newCategories: Record<number, string> = {};
            catRes.data?.forEach(c => { newCategories[c.id] = c.name; });

            const newFx: Record<number, string> = {};
            fxRes.data?.forEach(f => { newFx[f.id] = f.name; });

            const newPastings: Record<number, string> = {};
            pastRes.data?.forEach(p => { newPastings[p.id] = p.name; });

            const freshData = {
                products: prodRes.data || [],
                categories: newCategories,
                specialEffects: newFx,
                pastings: newPastings,
                sizes: sizeRes.data || [],
                printers: printRes.data || [],
                paperwalas: paperRes.data || []
            };

            setProducts(freshData.products);
            setCategories(freshData.categories);
            setSpecialEffects(freshData.specialEffects);
            setPastings(freshData.pastings);
            setSizes(freshData.sizes);
            setPrinters(freshData.printers);
            setPaperwalas(freshData.paperwalas);
            setLastSync(new Date());
            setLoading(false);

            saveToLocalStorage(freshData);
        } catch (error) {
            console.error('Background sync failed:', error);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadFromLocalStorage();
            fetchAllData();
        } else {
            // Clear data on logout
            setProducts([]);
            setLoading(true);
        }
    }, [user, fetchAllData]);

    return (
        <DataStoreContext.Provider value={{
            products,
            categories,
            specialEffects,
            pastings,
            sizes,
            printers,
            paperwalas,
            loading,
            lastSync,
            refreshData: fetchAllData
        }}>
            {children}
        </DataStoreContext.Provider>
    );
};

export const useDataStore = () => useContext(DataStoreContext);
