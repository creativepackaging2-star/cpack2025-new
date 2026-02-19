'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Loader2, Printer, Layers, ShoppingCart, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useDataStore } from './DataStoreProvider';

export default function PrinterBoardGrid() {
    const { printers: masterPrinters, refreshData } = useDataStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    products (
                        id,
                        product_name,
                        artwork_code,
                        category_id,
                        category!fk_category (name)
                    )
                `)
                .not('status', 'ilike', '%complete%')
                .not('status', 'ilike', '%delivered%')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setOrders(data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }

    // Combine master list with "Unassigned" and any other printers found in orders
    const allPrinters = useMemo(() => {
        const uniquePrinters = new Set<string>();
        // Add master list first
        masterPrinters.forEach(p => {
            if (p.name && p.name.toLowerCase() !== 'pramesh') {
                uniquePrinters.add(p.name);
            }
        });
        // Add any from active orders (fallback)
        orders.forEach(o => {
            if (o.printer_name && o.printer_name.toLowerCase() !== 'pramesh') {
                uniquePrinters.add(o.printer_name);
            }
        });

        const sorted = Array.from(uniquePrinters).sort((a, b) => a.localeCompare(b));
        // Add "Unassigned" at the end
        return [...sorted, 'Unassigned'];
    }, [orders, masterPrinters]);

    const handleDragStart = (e: React.DragEvent, orderId: number) => {
        setDraggedOrderId(orderId);
        e.dataTransfer.setData('orderId', orderId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetPrinterName: string) => {
        e.preventDefault();
        setDraggedOrderId(null);

        const orderIdStr = e.dataTransfer.getData('orderId');
        const orderId = parseInt(orderIdStr);
        if (isNaN(orderId)) return;

        const order = orders.find(o => o.id === orderId);

        // Handle "Unassigned" logic
        let newPrinterId: number | null = null;
        let newPrinterName: string | null = null;

        if (targetPrinterName !== 'Unassigned') {
            const targetPrinter = masterPrinters.find(p => p.name === targetPrinterName);
            newPrinterId = targetPrinter ? targetPrinter.id : null;
            newPrinterName = targetPrinterName;
        }

        // Prevent unnecessary updates
        if (!order || (order.printer_name === newPrinterName) || (targetPrinterName === 'Unassigned' && !order.printer_name)) return;

        // Optimistic Update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, printer_name: newPrinterName, printer_id: newPrinterId } : o));
        setUpdatingId(orderId);

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    printer_name: newPrinterName,
                    printer_id: newPrinterId
                })
                .eq('id', orderId);

            if (error) throw error;
        } catch (err) {
            console.error('Update error:', err);
            fetchOrders(); // Revert on failure
        } finally {
            setUpdatingId(null);
        }
    };

    const getCategoryStyles = (order: Order) => {
        const catName = (order.products?.category?.name || order.category_name || '').toLowerCase();

        if (catName.includes('carton')) {
            return {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                text: 'text-blue-900',
                badge: 'bg-blue-100 text-blue-700',
                hover: 'hover:border-blue-400 hover:shadow-md'
            };
        } else if (catName.includes('insert')) {
            return {
                bg: 'bg-pink-50',
                border: 'border-pink-200',
                text: 'text-pink-900',
                badge: 'bg-pink-100 text-pink-700',
                hover: 'hover:border-pink-400 hover:shadow-md'
            };
        } else if (catName.includes('label')) {
            return {
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
                text: 'text-emerald-900',
                badge: 'bg-emerald-100 text-emerald-700',
                hover: 'hover:border-emerald-400 hover:shadow-md'
            };
        }
        // Default
        return {
            bg: 'bg-white',
            border: 'border-slate-200',
            text: 'text-slate-900',
            badge: 'bg-slate-100 text-slate-700',
            hover: 'hover:border-indigo-400 hover:shadow-md'
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Loading Printer Pipeline</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {/* Header / Sub-header for Printer View */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <Printer className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">Printer <span className="text-emerald-600">Distribution</span></h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Drag to Reassign • Active Jobs grouped by Printer</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-lg">
                    {['All', 'Cartons', 'Inserts', 'Labels'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`
                                px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all
                                ${selectedCategory === cat
                                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-indigo-600'}
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-2 no-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 w-full h-full min-h-0 pb-16">
                    {allPrinters.map((printer) => {
                        const isUnassigned = printer === 'Unassigned';
                        const printerOrders = orders.filter(o => {
                            const matchesPrinter = isUnassigned ? !o.printer_name : o.printer_name === printer;
                            if (selectedCategory === 'All') return matchesPrinter;

                            const catName = o.products?.category?.name || o.category_name || '';
                            const target = selectedCategory.toLowerCase();
                            const isMatch = catName.toLowerCase().includes(target.slice(0, -1));

                            return matchesPrinter && isMatch;
                        });

                        return (
                            <section
                                key={printer}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, printer)}
                                className={`
                                    flex flex-col min-h-[150px] rounded-xl border transition-all duration-300
                                    overflow-hidden
                                    ${printerOrders.length > 0
                                        ? 'bg-white border-slate-200 shadow-sm'
                                        : 'bg-slate-50/50 border-slate-200 border-dashed opacity-70 hover:opacity-100 hover:bg-white'}
                                `}
                            >
                                <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 ${isUnassigned ? 'bg-amber-50 border-amber-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm shrink-0 ${isUnassigned ? 'bg-amber-100 border-amber-200' : 'bg-indigo-50 border-indigo-100'}`}>
                                            {isUnassigned ? <AlertCircle className="w-4 h-4 text-amber-600" /> : <User className="w-4 h-4 text-indigo-600" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className={`font-bold text-[13px] uppercase tracking-tight truncate ${isUnassigned ? 'text-amber-700' : 'text-slate-900'}`}>{isUnassigned ? printer : printer.split('').reverse().join('')}</h3>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{isUnassigned ? 'Requires Assignment' : 'Manufacturing Partner'}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm ${printerOrders.length > 0 ? (isUnassigned ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white') : 'bg-slate-200 text-slate-400'}`}>
                                        {printerOrders.length}
                                    </span>
                                </div>

                                <div className="p-3 flex-1 overflow-y-auto space-y-2 no-scrollbar min-h-[100px]">
                                    {printerOrders.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 pointer-events-none">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-center">Drop Orders Here</p>
                                        </div>
                                    )}
                                    {printerOrders.map(order => {
                                        const styles = getCategoryStyles(order);
                                        return (
                                            <div
                                                key={order.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, order.id)}
                                                className={`
                                                    p-2.5 rounded-xl transition-all border group relative
                                                    ${styles.bg} ${styles.border} ${styles.hover}
                                                    ${updatingId === order.id ? 'opacity-50 pointer-events-none ring-2 ring-indigo-500' : ''}
                                                    cursor-grab active:cursor-grabbing
                                                `}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                                                        {order.progress === 'Ready' && (
                                                            <span className="shrink-0 text-[8px] font-black bg-emerald-500 text-white px-1 py-0.5 rounded leading-none shadow-sm animate-pulse">RDY</span>
                                                        )}
                                                        <div className={`text-[11px] font-bold leading-tight uppercase tracking-tight truncate ${styles.text}`}>
                                                            {order.products?.product_name || order.product_name || 'Job'} | {order.quantity || 0} | {order.total_print_qty || 0}
                                                        </div>
                                                    </div>
                                                    <Link
                                                        href={`/orders?q=${encodeURIComponent(order.order_id || '')}`}
                                                        className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shrink-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ShoppingCart className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
