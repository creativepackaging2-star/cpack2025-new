'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Loader2, ShoppingCart, Workflow, Layers } from 'lucide-react';
import Link from 'next/link';

const PROCESS_STEPS = [
    'Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'
];

export default function ProductionBoardGrid() {
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
                        id,
                        product_name,
                        artwork_code,
                        specs,
                        dimension,
                        category_id,
                        category!fk_category (name)
                    )
                `)
                .not('status', 'ilike', '%complete%')
                .not('status', 'ilike', '%delivered%')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setOrders(data);

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
        setDraggedOrderId(null);

        const orderIdStr = e.dataTransfer.getData('orderId');
        const orderId = parseInt(orderIdStr);
        if (isNaN(orderId)) return;

        const order = orders.find(o => o.id === orderId);
        if (!order || order.progress === targetProcess) return;

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
            fetchOrders();
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
        <div className="flex flex-col h-full bg-slate-50 font-sans selection:bg-indigo-100 text-slate-900 overflow-hidden">
            <header className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Workflow className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h1 className="text-xl font-medium tracking-tight text-slate-900 uppercase">Production <span className="text-indigo-600">Board</span></h1>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                        {['All', 'Cartons', 'Inserts', 'Labels'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`
                                    px-4 py-2 rounded-md text-[13px] font-medium uppercase tracking-wider transition-all
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
            </header>

            <main className="flex-1 overflow-y-auto p-2 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 w-full h-full min-h-0">
                    {PROCESS_STEPS.map((step) => {
                        const stepOrders = orders.filter(o => {
                            const prog = o.progress || 'Paper';
                            const matchesStep = prog.toLowerCase() === step.toLowerCase();
                            if (selectedCategory === 'All') return matchesStep;

                            const catName = o.products?.category?.name || o.category_name || (o as any).products?.category_name || '';
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
                                    flex flex-col min-h-[200px] lg:h-[calc((100vh-140px)/3)] rounded-lg border transition-all duration-300
                                    flex-1
                                    ${stepOrders.length > 0
                                        ? 'bg-white border-slate-200 shadow-sm'
                                        : 'bg-slate-50 border-slate-200 opacity-95 hover:opacity-100'}
                                `}
                            >
                                <div className="px-2 py-2 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 rounded-t-lg">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Layers className={`w-4 h-4 ${step === 'Ready' ? 'text-emerald-500' :
                                            step === 'Hold' ? 'text-rose-500' : 'text-indigo-500'
                                            }`} />
                                        <h3 className="font-semibold text-slate-800 text-[13px] uppercase tracking-tight truncate">{step}</h3>
                                    </div>
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded shrink-0">
                                        {stepOrders.length}
                                    </span>
                                </div>

                                <div className="p-1.5 flex-1 overflow-y-auto space-y-1 no-scrollbar min-h-0">
                                    {stepOrders.length > 0 && stepOrders.map(order => (
                                        <div
                                            key={order.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, order.id)}
                                            onDragEnd={handleDragEnd}
                                            className={`
                                                p-2 rounded-md transition-all cursor-grab active:cursor-grabbing group relative
                                                bg-blue-50 border border-blue-200 hover:border-blue-400 hover:shadow-md
                                                ${updatingId === order.id ? 'bg-indigo-50 border-indigo-100' : ''}
                                                ${draggedOrderId === order.id ? 'opacity-20 translate-x-1' : ''}
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[11px] font-medium text-slate-900 leading-tight block truncate uppercase tracking-tight">
                                                        {order.products?.product_name || order.product_name || 'Job'}
                                                    </span>
                                                </div>
                                                <Link
                                                    href={`/orders?q=${encodeURIComponent(order.order_id || '')}`}
                                                    className="p-1 text-slate-300 hover:text-indigo-600 transition-all shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ShoppingCart className="w-3 h-3" />
                                                </Link>
                                            </div>

                                            {updatingId === order.id && (
                                                <div className="absolute inset-0 rounded-md bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                                                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
