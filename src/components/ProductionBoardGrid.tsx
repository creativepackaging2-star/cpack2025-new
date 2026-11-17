'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Loader2, ShoppingCart, Workflow } from 'lucide-react';
import Link from 'next/link';

const PROCESS_STEPS = [
    'Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'
];

const STAGE_COLORS: Record<string, string> = {
    'Paper': '#718A9E',
    'Plate': '#5999AF',
    'Print': '#036989',
    'Varnish': '#11395D',
    'Foil': '#FD9B6C',
    'Pasting': '#DA3D27',
    'Folding': '#8D2F18',
    'Ready': '#14804A',
    'Hold': '#8D2F18',
};

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

    const handleDragEnd = () => {
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

    const getCategoryStyles = (order: Order) => {
        const catName = (order.products?.category?.name || order.category_name || '').toLowerCase();

        if (catName.includes('carton')) {
            return {
                borderLeft: 'border-l-4 border-l-[#036989]',
                bg: 'bg-[#E4F3F7]/60 hover:bg-[#E4F3F7]',
                border: 'border-[#E2E8F0]',
                text: 'text-[#11253E]',
                badge: 'text-[#036989]',
            };
        } else if (catName.includes('insert')) {
            return {
                borderLeft: 'border-l-4 border-l-[#FD9B6C]',
                bg: 'bg-[#FFF1EB]/80 hover:bg-[#FFF1EB]',
                border: 'border-[#E2E8F0]',
                text: 'text-[#11253E]',
                badge: 'text-[#C95922]',
            };
        } else if (catName.includes('label')) {
            return {
                borderLeft: 'border-l-4 border-l-[#DA3D27]',
                bg: 'bg-[#FDECE9]/70 hover:bg-[#FDECE9]',
                border: 'border-[#E2E8F0]',
                text: 'text-[#11253E]',
                badge: 'text-[#DA3D27]',
            };
        }
        return {
            borderLeft: 'border-l-4 border-l-[#11395D]',
            bg: 'bg-white hover:bg-[#F4F6F9]',
            border: 'border-[#E2E8F0]',
            text: 'text-[#11253E]',
            badge: 'text-[#036989]',
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-[#036989] animate-spin mb-3" />
                <p className="text-[#718A9E] font-bold uppercase tracking-[0.3em] text-[10px]">Loading Pipeline...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-transparent font-sans text-[#11253E] overflow-hidden">
            {/* Header */}
            <header className="px-4 py-3 border-b border-[#E2E8F0] bg-white/70 backdrop-blur-xs shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#E6F2F7] rounded-xl border border-[#036989]/15 shadow-xs">
                            <Workflow className="w-5 h-5 text-[#036989]" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-[#11253E]">
                                Production <span className="text-[#036989]">Board</span>
                            </h1>
                            <p className="text-[11px] text-[#718A9E] font-medium">Real-time department pipeline tracking</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
                        {['All', 'Cartons', 'Inserts', 'Labels'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`
                                    px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all
                                    ${selectedCategory === cat
                                        ? 'bg-[#036989] text-white shadow-xs'
                                        : 'text-[#3B556E] hover:text-[#11253E] hover:bg-[#F4F6F9]'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-3 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full h-full min-h-0">
                    {PROCESS_STEPS.map((step) => {
                        const stepColor = STAGE_COLORS[step] || '#718A9E';
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
                                style={{ borderTop: `3px solid ${stepColor}` }}
                                className="flex flex-col min-h-[220px] lg:h-[calc((100vh-160px)/3)] border border-[#E2E8F0] bg-white shadow-xs hover:shadow-sm rounded-xl overflow-hidden transition-all duration-200"
                            >
                                <div className="px-3.5 py-2.5 border-b border-[#EDF2F7] flex items-center justify-between bg-white shrink-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: stepColor }}
                                        />
                                        <h3 className="font-bold text-[#11253E] text-xs uppercase tracking-wide truncate">{step}</h3>
                                    </div>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                        stepOrders.length > 0
                                            ? 'bg-[#E6F2F7] text-[#024B62]'
                                            : 'bg-[#F4F6F9] text-[#718A9E]'
                                    }`}>
                                        {stepOrders.length}
                                    </span>
                                </div>

                                <div className="p-2 flex-1 overflow-y-auto space-y-1.5 no-scrollbar min-h-0">
                                    {stepOrders.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-[11px] text-[#718A9E] italic">
                                            No jobs in {step}
                                        </div>
                                    ) : (
                                        stepOrders.map(order => {
                                            const styles = getCategoryStyles(order);
                                            return (
                                                <div
                                                    key={order.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, order.id)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`
                                                        p-2.5 rounded-lg transition-all cursor-grab active:cursor-grabbing group relative border
                                                        ${styles.borderLeft} ${styles.border} ${styles.bg}
                                                        ${updatingId === order.id ? 'opacity-50 ring-2 ring-[#036989]' : ''}
                                                        ${draggedOrderId === order.id ? 'opacity-25 translate-x-1' : ''}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <span className={`text-[11.5px] font-semibold leading-tight block truncate uppercase tracking-tight ${styles.text}`}>
                                                                {order.products?.product_name || order.product_name || 'Job'}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-[#718A9E]">
                                                                <span>Qty: <strong className="text-[#3B556E]">{Number(order.quantity || 0).toLocaleString()}</strong></span>
                                                                {order.total_print_qty ? (
                                                                    <span>• Print: <strong className="text-[#3B556E]">{Number(order.total_print_qty).toLocaleString()}</strong></span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <Link
                                                            href={`/orders?q=${encodeURIComponent(order.order_id || '')}`}
                                                            className="p-1 text-[#718A9E] hover:text-[#036989] transition-all shrink-0 rounded-md hover:bg-white"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="View Order"
                                                        >
                                                            <ShoppingCart className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>

                                                    {updatingId === order.id && (
                                                        <div className="absolute inset-0 rounded-md bg-white/70 backdrop-blur-xs flex items-center justify-center">
                                                            <Loader2 className="w-4 h-4 text-[#036989] animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
