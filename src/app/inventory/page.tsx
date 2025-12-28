'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Box, ArrowUpRight, ArrowDownLeft, Database, Search, Filter } from 'lucide-react';

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
        if (!searchTerm) return stock;
        const s = searchTerm.toLowerCase();
        return stock.filter(item =>
            item.gsm_name.toLowerCase().includes(s) ||
            item.paper_type_name.toLowerCase().includes(s) ||
            item.size_name.toLowerCase().includes(s) ||
            item.warehouse_name.toLowerCase().includes(s)
        );
    }, [stock, searchTerm]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Calculating Live Stock Levels...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Box className="w-8 h-8 text-indigo-600" />
                        Paper Stock Summary
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time inventory levels across all warehouses</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search GSM, Type, Size or Printer..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Warehouse</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Paper Type</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">GSM</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Size</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">IN</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">OUT</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-indigo-50/50">Current Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStock.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No inventory records found matching your search.</td>
                                </tr>
                            ) : (
                                filteredStock.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-white transition-colors">
                                                    <Database className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-900 uppercase tracking-tight">{item.warehouse_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.paper_type_name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold border border-indigo-100">
                                                {item.gsm_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 font-mono tracking-tighter">{item.size_name}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 text-emerald-600 font-mono font-bold text-xs">
                                                <ArrowUpRight className="w-3 h-3" />
                                                {item.total_in.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 text-rose-600 font-mono font-bold text-xs">
                                                <ArrowDownLeft className="w-3 h-3" />
                                                {item.total_out.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right bg-indigo-50/20">
                                            <span className={`text-sm font-black font-mono ${item.net_stock < 0 ? 'text-rose-700' : 'text-slate-900 underline decoration-indigo-200 underline-offset-4'}`}>
                                                {item.net_stock.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Total Inbound</p>
                    <p className="text-3xl font-black text-emerald-900 font-mono">
                        {stock.reduce((acc, curr) => acc + curr.total_in, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Total Consumed</p>
                    <p className="text-3xl font-black text-rose-900 font-mono">
                        {stock.reduce((acc, curr) => acc + curr.total_out, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 mb-1">Total Net Stock</p>
                    <p className="text-3xl font-black text-white font-mono">
                        {stock.reduce((acc, curr) => acc + curr.net_stock, 0).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
