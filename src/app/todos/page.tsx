'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import { CheckSquare, Loader2, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronRight, RefreshCw, Package, Plus, Zap, LayoutList, ListChecks } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Direct REST fetch — bypasses PostgREST schema cache entirely
async function restFetch(path: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || SUPA_KEY;
    const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
        ...options,
        headers: {
            'apikey': SUPA_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...(options.headers || {}),
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodoItem {
    id: number;
    order_id: number;
    task_key: string;
    label: string;
    done: boolean;
    skipped: boolean;
    parent_key: string | null;
    sort_order: number;
    meta: Record<string, any>;
    orders?: {
        id: number;
        order_id: string;
        product_name: string;
        printer_name: string;
        quantity: number;
        progress: string;
        ink: string;
        plate_no: string;
        products?: { product_name: string; ink: string; plate_no: string };
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHECK_TYPES: Record<string, { yes: string; no: string }> = {
    ink:   { yes: 'Ink available — no action needed',   no: 'Ink not available — order required' },
    plate: { yes: 'Plate available — no action needed', no: 'Plate not available — must send for plate' },
    punch: { yes: 'Punch available — no action needed', no: 'Punch not available — must send for punch' },
};

function makeCheckKey(orderId: number, taskKey: string) {
    return `${orderId}::${taskKey}`;
}

function inkNeedsCheck(ink: string | null | undefined): boolean {
    if (!ink) return false;
    const clean = ink.trim();
    if (/^(CMYK|4C|4\s*COLOU?R)$/i.test(clean)) return false;
    if (/\d/.test(clean)) return true;
    return true;
}

async function generateOrderTodos(orderId: number, ink: string | null, plateNo: string | null, printerName: string | null) {
    // Check existing
    try {
        const existing = await restFetch(`order_todos?order_id=eq.${orderId}&select=id&limit=1`);
        if (existing && existing.length > 0) {
            await restFetch(`order_todos?order_id=eq.${orderId}`, { method: 'DELETE' });
        }
    } catch {}

    const printer = printerName || 'Printer';
    const needsInkCheck = inkNeedsCheck(ink);
    const todos: Record<string, any>[] = [];
    let sort = 1;

    todos.push({ order_id: orderId, task_key: 'send_artwork',    label: 'Send artwork for approval',           sort_order: sort++, parent_key: null,          meta: {} });
    todos.push({ order_id: orderId, task_key: 'order_paper',     label: 'Order paper',                         sort_order: sort++, parent_key: null,          meta: {} });

    if (needsInkCheck) {
        todos.push({ order_id: orderId, task_key: 'check_ink',    label: 'Check ink availability',              sort_order: sort++, parent_key: null,          meta: { ink, is_check: true, check_type: 'ink' } });
        todos.push({ order_id: orderId, task_key: 'order_ink',    label: 'Order ink',                           sort_order: sort++, parent_key: 'check_ink',   meta: { hidden: true } });
        todos.push({ order_id: orderId, task_key: 'followup_ink', label: 'Follow up for ink',                   sort_order: sort++, parent_key: 'check_ink',   meta: { hidden: true } });
        todos.push({ order_id: orderId, task_key: 'rec_ink',      label: 'Rec ink',                             sort_order: sort++, parent_key: 'check_ink',   meta: { hidden: true } });
    }

    todos.push({ order_id: orderId, task_key: 'rec_artwork',      label: 'Rec artwork approval',                sort_order: sort++, parent_key: null,          meta: {} });
    todos.push({ order_id: orderId, task_key: 'check_plate',      label: 'Plate there?',                        sort_order: sort++, parent_key: null,          meta: { plate_no: plateNo, is_check: true, check_type: 'plate' } });
    todos.push({ order_id: orderId, task_key: 'send_for_plate',   label: 'Send for plate',                      sort_order: sort++, parent_key: 'check_plate', meta: { hidden: true } });
    todos.push({ order_id: orderId, task_key: 'rec_plate',        label: 'Rec plate',                           sort_order: sort++, parent_key: 'check_plate', meta: { hidden: true } });
    todos.push({ order_id: orderId, task_key: 'send_to_printer',  label: `Send order details to ${printer}`,    sort_order: sort++, parent_key: null,          meta: { printer_name: printer } });
    todos.push({ order_id: orderId, task_key: 'send_to_punching', label: 'Send qty to punching/pasting vendor', sort_order: sort++, parent_key: null,          meta: {} });
    todos.push({ order_id: orderId, task_key: 'check_punch',      label: 'Check if punch there',                sort_order: sort++, parent_key: null,          meta: { is_check: true, check_type: 'punch' } });
    todos.push({ order_id: orderId, task_key: 'send_for_punch',   label: 'Send for punch',                      sort_order: sort++, parent_key: 'check_punch', meta: { hidden: true } });
    todos.push({ order_id: orderId, task_key: 'followup_punch',   label: 'Follow up for punch',                 sort_order: sort++, parent_key: 'check_punch', meta: { hidden: true } });
    todos.push({ order_id: orderId, task_key: 'rec_punch',        label: 'Rec punch',                           sort_order: sort++, parent_key: 'check_punch', meta: { hidden: true } });

    await restFetch('order_todos', { method: 'POST', body: JSON.stringify(todos) });
}

// ─── By Task View ─────────────────────────────────────────────────────────────

// Canonical task order for display
const TASK_ORDER = [
    'send_artwork', 'order_paper', 'check_ink', 'order_ink', 'followup_ink', 'rec_ink',
    'rec_artwork', 'check_plate', 'send_for_plate', 'rec_plate',
    'send_to_printer', 'send_to_punching',
    'check_punch', 'send_for_punch', 'followup_punch', 'rec_punch',
];

function ByTaskView({ todos, onToggleDone }: {
    todos: TodoItem[];
    onToggleDone: (id: number, done: boolean) => void;
}) {
    // Only show top-level (non-child) pending tasks
    const pendingTopLevel = todos.filter(t => !t.parent_key && !t.done && !t.skipped);

    // Group by task_key
    const byTask = useMemo(() => {
        const map = new Map<string, { label: string; items: TodoItem[] }>();
        pendingTopLevel.forEach(t => {
            if (!map.has(t.task_key)) map.set(t.task_key, { label: t.label, items: [] });
            map.get(t.task_key)!.items.push(t);
        });
        // Sort by canonical order
        const sorted: [string, { label: string; items: TodoItem[] }][] = [];
        TASK_ORDER.forEach(key => { if (map.has(key)) sorted.push([key, map.get(key)!]); });
        // Any extra keys not in TASK_ORDER
        map.forEach((val, key) => { if (!TASK_ORDER.includes(key)) sorted.push([key, val]); });
        return sorted;
    }, [pendingTopLevel]);

    if (byTask.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                <p className="text-base font-semibold text-slate-500">All caught up! No pending tasks.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {byTask.map(([taskKey, { label, items }]) => (
                <div key={taskKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Task header */}
                    <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ListChecks className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-sm font-bold text-slate-800">{label}</span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                            {items.length} order{items.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {/* Products list */}
                    <div className="divide-y divide-slate-50">
                        {items.map(item => {
                            const productName = item.orders?.products?.product_name
                                || item.orders?.product_name
                                || `Order #${item.order_id}`;
                            const orderId = item.orders?.order_id || item.order_id;
                            return (
                                <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 transition-colors">
                                    <button
                                        onClick={() => onToggleDone(item.id, !item.done)}
                                        className="shrink-0 hover:scale-110 transition-transform"
                                    >
                                        <Circle className="w-4 h-4 text-slate-300 hover:text-indigo-400" />
                                    </button>
                                    <span className="flex-1 text-[13px] text-slate-700 font-medium">{productName}</span>
                                    {orderId && (
                                        <Link
                                            href={`/orders/${item.order_id}`}
                                            className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors shrink-0"
                                        >
                                            {typeof orderId === 'string' ? orderId : `#${orderId}`}
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}


function TodoCheckItem({ item, checkAnswer, onToggleDone, onSetCheck, isChild }: {
    item: TodoItem;
    checkAnswer: 'yes' | 'no' | null;
    onToggleDone: (id: number, done: boolean) => void;
    onSetCheck: (orderId: number, taskKey: string, answer: 'yes' | 'no') => void;
    isChild?: boolean;
}) {
    const isCheck = !!item.meta?.is_check;
    const checkType = item.meta?.check_type as keyof typeof CHECK_TYPES | undefined;

    return (
        <div className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-all ${
            isChild ? 'ml-7 bg-orange-50/60 border border-orange-100' :
            item.done || item.skipped ? 'opacity-50' : 'hover:bg-slate-50'
        }`}>
            {isCheck ? (
                <div className="mt-0.5 shrink-0">
                    {item.skipped
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <AlertCircle className="w-4 h-4 text-amber-400" />}
                </div>
            ) : (
                <button onClick={() => onToggleDone(item.id, !item.done)} className="mt-0.5 shrink-0 hover:scale-110 transition-transform">
                    {item.done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <Circle className="w-4 h-4 text-slate-300 hover:text-indigo-400" />}
                </button>
            )}

            <div className="flex-1 min-w-0">
                <span className={`text-[13px] ${item.done || item.skipped ? 'line-through text-slate-400' : isCheck ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                    {item.label}
                </span>

                {isCheck && !item.skipped && checkType && (
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <button
                            onClick={() => onSetCheck(item.order_id, item.task_key, 'yes')}
                            className={`px-3 py-0.5 rounded-full text-[11px] font-bold border transition-all ${checkAnswer === 'yes' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50'}`}
                        >✓ Yes</button>
                        <button
                            onClick={() => onSetCheck(item.order_id, item.task_key, 'no')}
                            className={`px-3 py-0.5 rounded-full text-[11px] font-bold border transition-all ${checkAnswer === 'no' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-rose-600 border-rose-300 hover:bg-rose-50'}`}
                        >✗ No</button>
                        {checkAnswer && (
                            <span className={`text-[11px] font-medium ${checkAnswer === 'yes' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {CHECK_TYPES[checkType]?.[checkAnswer]}
                            </span>
                        )}
                    </div>
                )}
                {item.skipped && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Available ✓</span>
                )}
            </div>
        </div>
    );
}

// ─── OrderTodoCard ────────────────────────────────────────────────────────────

function OrderTodoCard({ orderId, todos, checkAnswers, onToggleDone, onSetCheck, onRegenerate }: {
    orderId: number;
    todos: TodoItem[];
    checkAnswers: Record<string, 'yes' | 'no'>;
    onToggleDone: (id: number, done: boolean) => void;
    onSetCheck: (orderId: number, taskKey: string, answer: 'yes' | 'no') => void;
    onRegenerate: (orderId: number) => Promise<void>;
}) {
    const [expanded, setExpanded] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const firstTodo = todos[0];
    const order = firstTodo?.orders;
    const orderName = order?.products?.product_name || order?.product_name || `Order #${orderId}`;
    const printerName = order?.printer_name || '-';

    const topLevel = todos.filter(t => !t.parent_key);
    const childMap = todos.reduce<Record<string, TodoItem[]>>((acc, t) => {
        if (t.parent_key) { if (!acc[t.parent_key]) acc[t.parent_key] = []; acc[t.parent_key].push(t); }
        return acc;
    }, {});

    const total = topLevel.length;
    const done = topLevel.filter(t => t.done || t.skipped).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const handleRegen = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setRegenerating(true);
        try { await onRegenerate(orderId); } finally { setRegenerating(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none bg-gradient-to-r from-slate-50 to-white border-b border-slate-100" onClick={() => setExpanded(e => !e)}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="shrink-0 h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 truncate">{orderName}</span>
                            {order?.order_id && (
                                <Link href={`/orders/${orderId}`} onClick={e => e.stopPropagation()}
                                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors">
                                    {order.order_id}
                                </Link>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-500">🖨 {printerName}</span>
                            {order?.progress && (
                                <span className="text-[10px] font-semibold uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{order.progress}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={handleRegen} title="Regenerate todos" className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all" disabled={regenerating}>
                        {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-[11px] font-bold ${pct === 100 ? 'text-emerald-600' : 'text-slate-500'}`}>{done}/{total}</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
            </div>

            {/* Tasks */}
            {expanded && (
                <div className="px-4 py-2 divide-y divide-slate-50">
                    {topLevel.map(item => {
                        const checkKey = makeCheckKey(item.order_id, item.task_key);
                        const checkAnswer = checkAnswers[checkKey] || null;
                        const children = childMap[item.task_key] || [];
                        const showChildren = item.meta?.is_check && checkAnswer === 'no';
                        return (
                            <div key={item.id}>
                                <TodoCheckItem item={item} checkAnswer={checkAnswer} onToggleDone={onToggleDone} onSetCheck={onSetCheck} />
                                {showChildren && children.map(child => (
                                    <TodoCheckItem key={child.id} item={child} checkAnswer={null} onToggleDone={onToggleDone} onSetCheck={onSetCheck} isChild />
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Generate for Existing Orders Modal ──────────────────────────────────────

function GenerateModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (orderId: number) => Promise<void> }) {
    const [orderId, setOrderId] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderId) return;
        setLoading(true);
        setMsg('');
        try {
            // Fetch order details first
            const { data: order } = await supabase
                .from('orders')
                .select('id, ink, plate_no, printer_name, products(ink, plate_no)')
                .eq('id', parseInt(orderId))
                .single();
            if (!order) { setMsg('❌ Order not found'); setLoading(false); return; }
            const ink = (order as any).products?.ink || (order as any).ink;
            const plateNo = (order as any).products?.plate_no || (order as any).plate_no;
            await generateOrderTodos((order as any).id, ink, plateNo, (order as any).printer_name);
            setMsg('✅ Todos generated! Refresh to see them.');
        } catch (err: any) {
            setMsg('❌ Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold text-slate-800 mb-1">Generate Todos for Existing Order</h3>
                <p className="text-[12px] text-slate-400 mb-4">Enter the numeric order DB ID (not order code)</p>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="number"
                        placeholder="e.g. 42"
                        value={orderId}
                        onChange={e => setOrderId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    {msg && <p className="text-[12px] font-semibold text-slate-600">{msg}</p>}
                    <div className="flex gap-2">
                        <button type="submit" disabled={loading || !orderId}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
                        </button>
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TodosPage() {
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'pending' | 'all' | 'done'>('pending');
    const [view, setView] = useState<'order' | 'task'>('order');
    const [checkAnswers, setCheckAnswers] = useState<Record<string, 'yes' | 'no'>>({});
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    const fetchTodos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch todos and orders separately to avoid FK relationship schema cache issue
            const [todosData, ordersData] = await Promise.all([
                restFetch(`order_todos?select=*&order=order_id.desc,sort_order.asc`),
                restFetch(`orders?select=id,order_id,product_name,printer_name,ink,plate_no,quantity,progress,product_id`),
            ]);

            // Merge orders into todos client-side
            const ordersMap = new Map<number, any>();
            (ordersData || []).forEach((o: any) => ordersMap.set(o.id, o));

            const merged = (todosData || []).map((t: any) => ({
                ...t,
                orders: ordersMap.get(t.order_id) || null,
            }));

            setTodos(merged as TodoItem[]);
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    }, []);


    useEffect(() => { fetchTodos(); }, [fetchTodos]);

    const handleToggleDone = useCallback(async (id: number, done: boolean) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, done } : t));
        await restFetch(`order_todos?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ done, updated_at: new Date().toISOString() }),
        });
    }, []);

    const handleSetCheck = useCallback(async (orderId: number, taskKey: string, answer: 'yes' | 'no') => {
        const key = makeCheckKey(orderId, taskKey);
        setCheckAnswers(prev => ({ ...prev, [key]: answer }));
        const checkTodo = todos.find(t => t.order_id === orderId && t.task_key === taskKey);
        if (checkTodo) {
            const skipped = answer === 'yes';
            setTodos(prev => prev.map(t => t.id === checkTodo.id ? { ...t, skipped, done: false } : t));
            await restFetch(`order_todos?id=eq.${checkTodo.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ skipped, done: false, updated_at: new Date().toISOString() }),
            });
        }
    }, [todos]);

    const handleRegenerate = useCallback(async (orderId: number) => {
        const orderTodos = todos.filter(t => t.order_id === orderId);
        const order = orderTodos[0]?.orders;
        const ink = order?.products?.ink || order?.ink || null;
        const plateNo = order?.products?.plate_no || order?.plate_no || null;
        const printerName = order?.printer_name || null;
        await generateOrderTodos(orderId, ink, plateNo, printerName);
        await fetchTodos();
    }, [todos, fetchTodos]);

    const handleModalGenerate = useCallback(async (orderId: number) => {
        await generateOrderTodos(orderId, null, null, null);
        await fetchTodos();
    }, [fetchTodos]);

    const grouped = useMemo(() => {
        const map = new Map<number, TodoItem[]>();
        todos.forEach(t => { if (!map.has(t.order_id)) map.set(t.order_id, []); map.get(t.order_id)!.push(t); });
        return map;
    }, [todos]);

    const filteredGroups = useMemo(() => {
        const result: [number, TodoItem[]][] = [];
        grouped.forEach((items, orderId) => {
            const topLevel = items.filter(t => !t.parent_key);
            const hasPending = topLevel.some(t => !t.done && !t.skipped);
            const hasDone = topLevel.some(t => t.done || t.skipped);
            if (filter === 'pending' && !hasPending) return;
            if (filter === 'done' && !hasDone) return;
            result.push([orderId, items]);
        });
        return result;
    }, [grouped, filter]);

    const totalPending = useMemo(() =>
        todos.filter(t => !t.done && !t.skipped && !t.parent_key).length, [todos]);

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-16">
            <PageHeader
                title="To-Do"
                icon={<CheckSquare className="w-6 h-6" />}
                actions={
                    <div className="flex items-center gap-2">
                        {totalPending > 0 && (
                            <span className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
                                {totalPending} pending
                            </span>
                        )}
                        <button onClick={() => setShowGenerateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-[12px] font-bold hover:bg-indigo-500 transition-all"
                            title="Generate todos for an existing order">
                            <Plus className="w-3.5 h-3.5" /> Generate
                        </button>
                        <button onClick={fetchTodos} className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 transition-all" title="Refresh">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                }
            />

            {/* View toggle + Filter tabs */}
            <div className="flex flex-wrap items-center gap-3">
                {/* View toggle */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button
                        onClick={() => setView('order')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                            view === 'order' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <Package className="w-3.5 h-3.5" /> By Order
                    </button>
                    <button
                        onClick={() => setView('task')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                            view === 'task' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        <ListChecks className="w-3.5 h-3.5" /> By Task
                    </button>
                </div>

                {/* Filter tabs — only shown in By Order view */}
                {view === 'order' && (
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {(['pending', 'all', 'done'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${filter === f ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
                    ❌ Error loading todos: {error}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <Loader2 className="animate-spin w-8 h-8 text-indigo-400" />
                    <span className="text-sm font-medium">Loading tasks...</span>
                </div>
            ) : view === 'task' ? (
                <ByTaskView todos={todos} onToggleDone={handleToggleDone} />
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                    <p className="text-base font-semibold text-slate-500 mb-2">
                        {filter === 'pending' ? 'No pending tasks.' : 'No tasks found.'}
                    </p>
                    <p className="text-[12px] text-slate-400">
                        Create a new order, or click <strong>Generate</strong> to add todos for an existing order.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredGroups.map(([orderId, items]) => (
                        <OrderTodoCard key={orderId} orderId={orderId} todos={items}
                            checkAnswers={checkAnswers} onToggleDone={handleToggleDone}
                            onSetCheck={handleSetCheck} onRegenerate={handleRegenerate} />
                    ))}
                </div>
            )}

            {showGenerateModal && (
                <GenerateModal onClose={() => setShowGenerateModal(false)} onGenerate={handleModalGenerate} />
            )}
        </div>
    );
}
