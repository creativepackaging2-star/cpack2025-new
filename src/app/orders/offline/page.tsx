'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { ArrowLeft, Loader2, GripVertical, ShoppingCart, Workflow, Layers } from 'lucide-react';
import Link from 'next/link';

const PROCESS_STEPS = [
    'Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'
];

export default function OfflineOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});

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
                        product_name,
                        artwork_code,
                        specs,
                        category_id
                    )
                `)
                .not('status', 'ilike', '%complete%')
                .not('status', 'ilike', '%delivered%')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setOrders(data);

            // Fetch categories for mapping
            const { data: catData } = await supabase.from('category').select('id, name');
            if (catData) {
                const map: Record<number, string> = {};
                catData.forEach((c: any) => map[c.id] = c.name);
                setCategoryMap(map);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleDragStart = (e: React.DragEvent, orderId: number) => {
        setDraggedOrderId(orderId);
        e.dataTransfer.setData('orderId', orderId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedOrderId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetProcess: string) => {
        e.preventDefault();
        const orderIdStr = e.dataTransfer.getData('orderId');
        const orderId = parseInt(orderIdStr);
        if (isNaN(orderId)) return;

        const order = orders.find(o => o.id === orderId);
        if (!order || order.progress === targetProcess) return;

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, progress: targetProcess } : o));
        setUpdatingId(orderId);

        try {
            const { error } = await supabase
                .from('orders')
                .update({ progress: targetProcess })
                .eq('id', orderId);

            if (error) throw error;
        } catch (err) {
            console.error('Update error:', err);
            fetchOrders(); // Rollback
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Loading Pipeline</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white font-sans selection:bg-indigo-100 text-slate-900">
            {/* Clean Light Header */}
            <header className="bg-white px-4 py-3 sticky top-0 z-40 border-b border-slate-300 shadow-sm shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 group">
                                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                            </Link>
                            <h1 className="flex flex-col leading-none">
                                <span className="text-[12px] md:text-[14px] font-bold text-indigo-600 uppercase tracking-widest">Print</span>
                                <span className="text-lg md:text-xl font-bold tracking-tight text-black/80 mt-1">Mfg</span>
                            </h1>
                        </div>
                        <div className="h-8 w-[2px] bg-slate-200 hidden md:block"></div>
                        <p className="text-[10px] text-black/60 font-bold uppercase tracking-[0.4em] mt-2 hidden md:block">Real-time Pipeline</p>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
                        {['All', 'Cartons', 'Inserts', 'Labels'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`
                                    px-4 md:px-5 py-2 rounded-full text-[11px] md:text-[12px] font-bold uppercase tracking-wider transition-all border shrink-0
                                    ${selectedCategory === cat
                                        ? 'bg-black/80 text-white border-black/80 shadow-md'
                                        : 'bg-white text-black/80 border-black/80 hover:bg-slate-50'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 p-2 md:p-4 w-full space-y-4 overflow-y-auto">
                {PROCESS_STEPS.map((step, idx) => {
                    const stepOrders = orders.filter(o => {
                        const prog = o.progress || 'Paper';
                        const matchesStep = prog.toLowerCase() === step.toLowerCase();
                        if (selectedCategory === 'All') return matchesStep;

                        const catName = o.category_name || (o as any).products?.category_name || '';
                        const target = selectedCategory.toLowerCase();
                        const isMatch = catName.toLowerCase().includes(target.slice(0, -1));

                        return matchesStep && isMatch;
                    });

                    return (
                        <section
                            key={step}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, step)}
                            className={`
                                rounded-2xl md:rounded-3xl border transition-all duration-300 overflow-hidden
                                ${stepOrders.length > 0
                                    ? 'bg-white border-slate-300 shadow-sm'
                                    : 'bg-slate-50 border-slate-200 opacity-30 hover:opacity-50'}
                            `}
                        >
                            {/* Process Header */}
                            <div className="px-4 py-1.5 md:py-1 border-b border-slate-300 flex items-center justify-between bg-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${step === 'Ready' ? 'bg-emerald-500' :
                                        step === 'Hold' ? 'bg-rose-500' : 'bg-indigo-500'
                                        }`} />
                                    <h3 className="font-bold text-black/80 text-[11px] md:text-[12px] uppercase tracking-[0.1em]">{step}</h3>
                                </div>
                                <span className="text-black/80 text-[10px] md:text-[11px] font-bold">
                                    {stepOrders.length}
                                </span>
                            </div>

                            {/* Jobs Container */}
                            <div className="p-1 min-h-[40px] flex flex-col gap-1.5 md:gap-1">
                                {stepOrders.length === 0 ? (
                                    <div className="w-full py-2 text-center text-slate-300 text-[8px] font-normal uppercase tracking-[0.1em]">
                                        No active jobs
                                    </div>
                                ) : (
                                    stepOrders.map(order => (
                                        <div
                                            key={order.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, order.id)}
                                            onDragEnd={handleDragEnd}
                                            className={`
                                                flex flex-col md:flex-row md:items-center gap-2 px-3 py-2 md:px-2 md:py-1 rounded-xl md:rounded-lg transition-all cursor-grab active:cursor-grabbing group relative
                                                bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm
                                                w-full
                                                ${updatingId === order.id ? 'bg-indigo-50 border-indigo-200' : ''}
                                                ${draggedOrderId === order.id ? 'opacity-20 translate-x-1' : ''}
                                            `}
                                        >
                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                                                <div className="flex-1 min-w-0 md:hidden">
                                                    <span className="text-[12px] font-bold text-black/80 truncate uppercase tracking-tight block">
                                                        {order.products?.product_name || order.product_name || 'Anonymous Job'}
                                                    </span>
                                                </div>
                                                <Link
                                                    href={`/orders?q=${encodeURIComponent(order.order_id || '')}`}
                                                    className="md:hidden p-1.5 bg-black/80 text-white rounded-lg hover:bg-black transition-all shadow-md group/btn"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ShoppingCart className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>

                                            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
                                                {/* Desktop View (hidden on mobile) */}
                                                <div className="hidden md:flex items-center gap-2 min-w-0 flex-[3]">
                                                    <span className="text-[13px] font-bold text-black/80 truncate uppercase tracking-tight shrink-0">
                                                        {order.products?.product_name || order.product_name || 'Anonymous Job'}
                                                    </span>
                                                    <span className="text-[11px] text-black/60 truncate uppercase font-bold tracking-tight border-l border-black/20 pl-4">
                                                        {order.specs || order.dimension || '-'}
                                                    </span>
                                                </div>

                                                {/* Mobile View Specs (Only mobile) */}
                                                <div className="md:hidden">
                                                    <span className="text-[10px] text-black/60 truncate uppercase font-bold tracking-tight">
                                                        {order.specs || order.dimension || '-'}
                                                    </span>
                                                </div>

                                                {/* Stats Section */}
                                                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 shrink-0 mt-1 md:mt-0 pt-2 md:pt-0 border-t border-slate-100 md:border-0">
                                                    <div className="flex items-center gap-2 md:border-r md:border-black/10 md:pr-6">
                                                        <span className="text-black/50 uppercase text-[8px] md:text-[9px] font-bold tracking-widest">ORDER</span>
                                                        <span className="text-black/80 font-bold text-[12px] md:text-[13px]">{(order.quantity || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-black/50 uppercase text-[8px] md:text-[9px] font-bold tracking-widest">PRINT</span>
                                                        <span className="text-blue-600 font-bold text-[12px] md:text-[13px]">{(order.total_print_qty || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* Desktop View Action (hidden on mobile) */}
                                                <div className="hidden md:flex items-center shrink-0">
                                                    <Link
                                                        href={`/orders?q=${encodeURIComponent(order.order_id || '')}`}
                                                        className="p-2 bg-black/80 text-white rounded-md hover:bg-black transition-all shadow-md group/btn"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="View Order"
                                                    >
                                                        <ShoppingCart className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </div>

                                            {updatingId === order.id && (
                                                <div className="absolute inset-0 rounded-xl bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                                                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    );
                })}
            </main>
        </div>
    );
}
