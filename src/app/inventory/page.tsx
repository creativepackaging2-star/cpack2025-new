'use client';

import { useEffect, useState, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Box, ArrowUpRight, ArrowDownLeft, Database, Search, Filter, X, Plus, Trash2, History, Save, Calendar, Printer } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { format } from 'date-fns';

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
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [entryData, setEntryData] = useState({
        gsm_id: '',
        paper_type_id: '',
        paper_order_size_id: '',
        printer_id: '',
        qty: '',
        tx_type: 'IN',
        reference: 'Manual Entry',
        notes: ''
    });

    // Resources for dropdowns
    const [resources, setResources] = useState({
        gsms: [] as any[],
        paperTypes: [] as any[],
        sizes: [] as any[],
        printers: [] as any[]
    });

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

            setResources({
                gsms: gsmRes.data || [],
                paperTypes: ptRes.data || [],
                sizes: sizeRes.data || [],
                printers: printerRes.data || []
            });

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

    const [showHistory, setShowHistory] = useState<any>(null); // { key, transactions }

    const handleManualSubmit = async () => {
        if (!entryData.gsm_id || !entryData.paper_type_id || !entryData.paper_order_size_id || !entryData.qty) {
            alert('Please fill all mandatory fields (GSM, Type, Size, Qty)');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                gsm_id: parseInt(entryData.gsm_id),
                paper_type_id: parseInt(entryData.paper_type_id),
                paper_order_size_id: parseInt(entryData.paper_order_size_id),
                printer_id: parseInt(entryData.printer_id) || null,
                qty: parseFloat(entryData.qty),
                tx_type: entryData.tx_type,
                reference: entryData.reference,
                notes: entryData.notes
            };

            const { error: insErr } = await supabase.from('paper_transactions').insert([payload]);
            if (insErr) throw insErr;

            alert('✅ Stock updated successfully.');
            setShowEntryForm(false);
            setEntryData({
                gsm_id: '',
                paper_type_id: '',
                paper_order_size_id: '',
                printer_id: '',
                qty: '',
                tx_type: 'IN',
                reference: 'Manual Entry',
                notes: ''
            });
            fetchStock();
        } catch (err: any) {
            console.error('Submit Error:', err);
            alert('Error: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteTransaction = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this transaction? This will adjust the stock levels.')) return;

        try {
            const { error: delErr } = await supabase.from('paper_transactions').delete().eq('id', id);
            if (delErr) throw delErr;
            alert('✅ Transaction deleted.');
            if (showHistory) {
                // Refresh history view
                const { data } = await supabase.from('paper_transactions')
                    .select('*')
                    .eq('gsm_id', showHistory.gsm_id)
                    .eq('paper_type_id', showHistory.paper_type_id)
                    .eq('paper_order_size_id', showHistory.paper_order_size_id)
                    .eq('printer_id', showHistory.printer_id);
                setShowHistory((prev: any) => ({ ...prev, transactions: data || [] }));
            }
            fetchStock();
        } catch (err: any) {
            alert('Delete Error: ' + err.message);
        }
    };

    const fetchHistory = async (item: StockItem) => {
        setLoading(true);
        try {
            const { data, error: hErr } = await supabase.from('paper_transactions')
                .select('*')
                .eq('gsm_id', item.gsm_id)
                .eq('paper_type_id', item.paper_type_id)
                .eq('paper_order_size_id', item.paper_order_size_id)
                .eq('printer_id', item.printer_id)
                .order('created_at', { ascending: false });

            if (hErr) throw hErr;
            setShowHistory({ ...item, transactions: data || [] });
        } catch (err: any) {
            alert('History Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

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
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowEntryForm(!showEntryForm)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${showEntryForm ? 'bg-slate-100 text-slate-700 shadow-slate-200' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'}`}
                        >
                            {showEntryForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {showEntryForm ? 'Close Form' : 'Update Stock'}
                        </button>
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

                {/* MANUAL ENTRY FORM */}
                {showEntryForm && (
                    <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-xl animate-in zoom-in-95 fade-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                                    <Plus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase">Add Manual Stock Adjustment</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Update warehouse inventory levels</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEntryForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Warehouse</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                                    value={entryData.printer_id}
                                    onChange={e => setEntryData(p => ({ ...p, printer_id: e.target.value }))}
                                >
                                    <option value="">Select Warehouse...</option>
                                    <option value="0">General Stock</option>
                                    {resources.printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paper Type</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                                    value={entryData.paper_type_id}
                                    onChange={e => setEntryData(p => ({ ...p, paper_type_id: e.target.value }))}
                                >
                                    <option value="">Select Type...</option>
                                    {resources.paperTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSM</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                                    value={entryData.gsm_id}
                                    onChange={e => setEntryData(p => ({ ...p, gsm_id: e.target.value }))}
                                >
                                    <option value="">Select GSM...</option>
                                    {resources.gsms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Size</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                                    value={entryData.paper_order_size_id}
                                    onChange={e => setEntryData(p => ({ ...p, paper_order_size_id: e.target.value }))}
                                >
                                    <option value="">Select Size...</option>
                                    {resources.sizes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setEntryData(p => ({ ...p, tx_type: 'IN' }))}
                                        className={`flex-1 py-2 text-xs font-black uppercase tracking-tighter rounded-lg transition-all ${entryData.tx_type === 'IN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Stock IN
                                    </button>
                                    <button
                                        onClick={() => setEntryData(p => ({ ...p, tx_type: 'OUT' }))}
                                        className={`flex-1 py-2 text-xs font-black uppercase tracking-tighter rounded-lg transition-all ${entryData.tx_type === 'OUT' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Stock OUT
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity (Sheets)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-base"
                                    value={entryData.qty}
                                    onChange={e => setEntryData(p => ({ ...p, qty: e.target.value }))}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes / Reference</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Purchase Invoice #123"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                                    value={entryData.notes}
                                    onChange={e => setEntryData(p => ({ ...p, notes: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowEntryForm(false)}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleManualSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                SAVE TRANSACTION
                            </button>
                        </div>
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
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.warehouse_name}</span>
                                                    <button
                                                        onClick={() => fetchHistory(item)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                        title="View Transaction History"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                </div>
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

            {/* TRANSACTION HISTORY MODAL */}
            {showHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase">Stock History</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                                    {showHistory.paper_type_name} | {showHistory.gsm_name} | {showHistory.size_name} | {showHistory.warehouse_name}
                                </p>
                            </div>
                            <button onClick={() => setShowHistory(null)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white">
                                    <tr className="text-left border-b border-slate-100">
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                        <th className="py-3 pl-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference / Notes</th>
                                        <th className="py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {showHistory.transactions.map((tx: any) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 text-sm font-bold text-slate-600">
                                                {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${tx.tx_type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {tx.tx_type}
                                                </span>
                                            </td>
                                            <td className={`py-3 text-right text-sm font-black ${tx.tx_type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.tx_type === 'IN' ? '+' : '-'}{Number(tx.qty).toLocaleString()}
                                            </td>
                                            <td className="py-3 pl-6">
                                                <div className="text-sm font-bold text-slate-900">{tx.reference || '-'}</div>
                                                <div className="text-[11px] text-slate-400 font-medium">{tx.notes}</div>
                                            </td>
                                            <td className="py-3 text-right text-slate-900">
                                                <button
                                                    onClick={() => deleteTransaction(tx.id)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete Transaction"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {showHistory.transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 italic">No transaction history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setShowHistory(null)}
                                className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
