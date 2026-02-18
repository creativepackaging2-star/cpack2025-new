'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { ArrowLeft, Loader2, GripVertical, Info, Workflow, Layers } from 'lucide-react';
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
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 group">
                            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-black tracking-tight uppercase italic text-slate-900 flex items-center gap-2">
                                <Workflow className="w-5 h-5 text-indigo-600" />
                                Production Board
                            </h1>
                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1 ml-7">Active Process Flow</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {['All', 'Cartons', 'Inserts', 'Labels'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`
                                    px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border
                                    ${selectedCategory === cat
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                            : 'bg-white text-slate-400 border-slate-300 hover:border-indigo-400 hover:text-indigo-600'}
                                `}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 w-full space-y-4 overflow-y-auto">
                {PROCESS_STEPS.map((step, idx) => {
                    const stepOrders = orders.filter(o => {
                        const prog = o.progress || 'Paper';
                        const matchesStep = prog.toLowerCase() === step.toLowerCase();
                        if (selectedCategory === 'All') return matchesStep;

                        // Using property access that should already exist on Order type or snapshot
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
                                rounded-3xl border transition-all duration-300 overflow-hidden
                                ${stepOrders.length > 0
                                    ? 'bg-white border-slate-300 shadow-sm'
                                    : 'bg-slate-50 border-slate-200 opacity-30 hover:opacity-50'}
                            `}
                        >
                            {/* Process Header - More Compact */}
                            <div className="px-5 py-2 border-b border-slate-300 flex items-center justify-between bg-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${step === 'Ready' ? 'bg-emerald-500' :
                                        step === 'Hold' ? 'bg-rose-500' : 'bg-indigo-500'
                                        }`} />
                                    <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">{step}</h3>
                                </div>
                                <span className="text-slate-400 text-[10px] font-black">
                                    {stepOrders.length}
                                </span>
                            </div>

                            {/* Jobs Container - Vertical Stack */}
                            <div className="p-2 min-h-[50px] flex flex-col gap-1.5">
                                {stepOrders.length === 0 ? (
                                    <div className="w-full py-4 text-center text-slate-300 text-[8px] font-black uppercase tracking-[0.3em]">
                                        Empty
                                    </div>
                                ) : (
                                    stepOrders.map(order => (
                                        <div
                                            key={order.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, order.id)}
                                            onDragEnd={handleDragEnd}
                                            className={`
                                                flex items-center gap-4 px-4 py-2 rounded-xl transition-all cursor-grab active:cursor-grabbing group relative
                                                bg-white border border-slate-300 hover:border-indigo-400 hover:shadow-md
                                                w-full
                                                ${updatingId === order.id ? 'bg-indigo-50 border-indigo-200' : ''}
                                                ${draggedOrderId === order.id ? 'opacity-20 translate-x-1' : ''}
                                            `}
                                        >
                                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />

                                            <div className="flex-1 min-w-0 flex items-center justify-between gap-6">
                                                {/* Left Section: Product Name & Specs */}
                                                <div className="flex flex-col min-w-0 flex-[2]">
                                                    <span className="text-[13px] font-bold text-black truncate uppercase tracking-tight leading-tight">
                                                        {order.products?.product_name || order.product_name || 'Anonymous Job'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-700 truncate uppercase mt-0.5 font-medium tracking-wide">
                                                        {order.specs || order.dimension || 'NO SPECS'}
                                                    </span>
                                                </div>

                                                {/* Middle Section: Stats */}
                                                <div className="flex items-center gap-8 shrink-0">
                                                    <div className="flex flex-col items-end min-w-[70px]">
                                                        <span className="text-slate-500 uppercase text-[8px] font-bold tracking-widest">Order Qty</span>
                                                        <span className="text-emerald-700 font-bold text-[14px]">{(order.quantity || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end min-w-[70px]">
                                                        <span className="text-slate-500 uppercase text-[8px] font-bold tracking-widest">Print Qty</span>
                                                        <span className="text-indigo-700 font-bold text-[14px]">{(order.total_print_qty || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* Right Section: Action */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <Link
                                                        href={`/orders?q=${encodeURIComponent(order.order_id || '')}`}
                                                        className="flex items-center gap-2 px-4 py-2 bg-black/70 hover:bg-indigo-600 text-white rounded-lg transition-all shadow-sm group/btn"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <span className="text-[11px] font-bold uppercase tracking-widest hidden md:inline">View Order</span>
                                                        <Info className="w-4 h-4" />
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
