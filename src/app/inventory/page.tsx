'use client';

import { useEffect, useState, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Box, ArrowUpRight, ArrowDownLeft, Database, Search, Filter, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface StockItem {
    gsm_id: number;
    paper_type_id: number;
    paper_order_size_id: number;
    printer_id: number;
    gsm_name: string;
    paper_type_name: string;
    size_name: string;
    warehouse_name: string;
    total_in: number;
    total_out: number;
    net_stock: number;
}

export default function InventoryPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stock, setStock] = useState<StockItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Performance: Fix for INP (Interaction to Next Paint)
    // Deferred value allows the search input to remain responsive while table filtering happens in the background
    const deferredSearchTerm = useDeferredValue(searchTerm);

    useEffect(() => {
        fetchStock();
    }, []);

    async function fetchStock() {
        setLoading(true);
        try {
            // Fetch everything we need for the summary
            const [txRes, ptRes, gsmRes, sizeRes, printerRes] = await Promise.all([
                supabase.from('paper_transactions').select('*'),
                supabase.from('paper_types').select('id, name'),
                supabase.from('gsm').select('id, name'),
                supabase.from('sizes').select('id, name'),
                supabase.from('printers').select('id, name')
            ]);

            if (txRes.error) throw txRes.error;

            const transactions = txRes.data || [];
            const paperTypeMap = Object.fromEntries((ptRes.data || []).map(i => [i.id, i.name]));
            const gsmMap = Object.fromEntries((gsmRes.data || []).map(i => [i.id, i.name]));
            const sizeMap = Object.fromEntries((sizeRes.data || []).map(i => [i.id, i.name]));
            const printerMap = Object.fromEntries((printerRes.data || []).map(i => [i.id, i.name]));

            // Group transactions
            const grouping: Record<string, StockItem> = {};

            transactions.forEach(tx => {
                const key = `${tx.gsm_id}-${tx.paper_type_id}-${tx.paper_order_size_id}-${tx.printer_id}`;

                if (!grouping[key]) {
                    grouping[key] = {
                        gsm_id: tx.gsm_id,
                        paper_type_id: tx.paper_type_id,
                        paper_order_size_id: tx.paper_order_size_id,
                        printer_id: tx.printer_id,
                        gsm_name: gsmMap[tx.gsm_id] || '-',
                        paper_type_name: paperTypeMap[tx.paper_type_id] || '-',
                        size_name: sizeMap[tx.paper_order_size_id] || '-',
                        warehouse_name: printerMap[tx.printer_id] || 'Stock',
                        total_in: 0,
                        total_out: 0,
                        net_stock: 0
                    };
                }

                const qty = Number(tx.qty) || 0;
                if (tx.tx_type === 'IN') {
                    grouping[key].total_in += qty;
                } else if (tx.tx_type === 'OUT') {
                    grouping[key].total_out += qty;
                }
            });

            // Calculate Net Stock and convert to array
            const finalStock = Object.values(grouping).map(item => ({
                ...item,
                net_stock: item.total_in - item.total_out
            })).sort((a, b) => b.net_stock - a.net_stock);

            setStock(finalStock);
        } catch (err: any) {
            console.error('Inventory Fetch Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const filteredStock = useMemo(() => {
        if (!deferredSearchTerm) return stock;
        const s = deferredSearchTerm.toLowerCase();
        return stock.filter(item =>
            item.gsm_name.toLowerCase().includes(s) ||
            item.paper_type_name.toLowerCase().includes(s) ||
            item.size_name.toLowerCase().includes(s) ||
            item.warehouse_name.toLowerCase().includes(s)
        );
    }, [stock, deferredSearchTerm]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Calculating Live Stock Levels...</p>
            </div>
        );
    }

    return (
        <div className="font-montserrat">
            <PageHeader
                title="Paper Stock Summary"
                icon={<Database className="w-6 h-6" />}
                actions={
                    <div className="relative w-64 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search GSM, Type, Size..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm text-sm text-white placeholder:text-slate-500 font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                }
            />

            <div className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold flex items-center gap-2 animate-pulse">
                        <X className="w-5 h-5" />
                        <span>Error: {error}</span>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Warehouse</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Paper Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">GSM</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Size</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 bg-indigo-50/30">Stock</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">IN</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">OUT</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                                {filteredStock.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic font-medium">No inventory records found matching your search.</td>
                                    </tr>
                                ) : (
                                    filteredStock.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors group cursor-default border-b border-slate-200 last:border-0">
                                            <td className="px-6 py-2">
                                                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.warehouse_name}</span>
                                            </td>
                                            <td className="px-6 py-2 text-sm text-slate-600 font-medium">
                                                {item.paper_type_name}
                                            </td>
                                            <td className="px-6 py-2 text-sm font-semibold text-slate-700">
                                                {item.gsm_name}
                                            </td>
                                            <td className="px-6 py-2 text-sm text-slate-500 tracking-tight font-medium">
                                                {item.size_name}
                                            </td>
                                            <td className="px-6 py-2 text-right bg-indigo-50/10 font-mono">
                                                <span className={`text-sm font-semibold tracking-tight ${item.net_stock < 0 ? 'text-rose-700' : 'text-indigo-900'}`}>
                                                    {item.net_stock.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right border-l border-slate-100 font-mono">
                                                <div className="text-slate-500 font-medium text-[11px]">
                                                    {item.total_in.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                                <div className="text-slate-400 font-medium text-[11px]">
                                                    {item.total_out.toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
