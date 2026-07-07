'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import { CheckSquare, Loader2, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronRight, RefreshCw, Package } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

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
        products?: {
            product_name: string;
            ink: string;
            plate_no: string;
        };
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHECK_TYPES: Record<string, { yes: string; no: string }> = {
    ink:   { yes: 'Ink available — no action needed',   no: 'Ink not available — order required' },
    plate: { yes: 'Plate available — no action needed', no: 'Plate not available — must send for plate' },
    punch: { yes: 'Punch available — no action needed', no: 'Punch not available — must send for punch' },
};

// Map parent_key → answer stored in state
function makeCheckKey(orderId: number, taskKey: string) {
    return `${orderId}::${taskKey}`;
}

// ─── Components ──────────────────────────────────────────────────────────────

function TodoCheckItem({
    item,
    checkAnswer,
    onToggleDone,
    onSetCheck,
    isChild,
}: {
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
            item.done || item.skipped ? 'opacity-55' : 'hover:bg-slate-50'
        }`}>
            {/* Checkbox / status icon */}
            {isCheck ? (
                <div className="flex items-center mt-0.5">
                    {item.skipped ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                </div>
            ) : (
                <button
                    onClick={() => onToggleDone(item.id, !item.done)}
                    className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                    title={item.done ? 'Mark as pending' : 'Mark as done'}
                >
                    {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <Circle className="w-4 h-4 text-slate-300 hover:text-indigo-400" />
                    )}
                </button>
            )}

            {/* Label */}
            <div className="flex-1 min-w-0">
                <span className={`text-[13px] ${
                    item.done || item.skipped
                        ? 'line-through text-slate-400'
                        : isCheck ? 'font-semibold text-slate-800' : 'text-slate-700'
                }`}>
                    {item.label}
                </span>

                {/* Check Yes/No buttons */}
                {isCheck && !item.skipped && !item.done && checkType && (
                    <div className="flex items-center gap-2 mt-1.5">
                        <button
                            onClick={() => onSetCheck(item.order_id, item.task_key, 'yes')}
                            className={`px-3 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                                checkAnswer === 'yes'
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                    : 'bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50'
                            }`}
                        >
                            ✓ Yes
                        </button>
                        <button
                            onClick={() => onSetCheck(item.order_id, item.task_key, 'no')}
                            className={`px-3 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                                checkAnswer === 'no'
                                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                    : 'bg-white text-rose-600 border-rose-300 hover:bg-rose-50'
                            }`}
                        >
                            ✗ No
                        </button>
                        {checkAnswer && (
                            <span className={`text-[11px] font-medium ${checkAnswer === 'yes' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {CHECK_TYPES[checkType]?.[checkAnswer]}
                            </span>
                        )}
                    </div>
                )}

                {/* Skipped label */}
                {item.skipped && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        Available ✓
                    </span>
                )}
            </div>
        </div>
    );
}

function OrderTodoCard({
    orderId,
    todos,
    checkAnswers,
    onToggleDone,
    onSetCheck,
}: {
    orderId: number;
    todos: TodoItem[];
    checkAnswers: Record<string, 'yes' | 'no'>;
    onToggleDone: (id: number, done: boolean) => void;
    onSetCheck: (orderId: number, taskKey: string, answer: 'yes' | 'no') => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const firstTodo = todos[0];
    const order = firstTodo?.orders;
    const orderName = order?.products?.product_name || order?.product_name || 'Unknown Product';
    const printerName = order?.printer_name || '-';

    const total = todos.length;
    const done = todos.filter(t => t.done || t.skipped).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // Organize: separate top-level and child tasks
    const topLevel = todos.filter(t => !t.parent_key);
    const childMap = todos.reduce<Record<string, TodoItem[]>>((acc, t) => {
        if (t.parent_key) {
            if (!acc[t.parent_key]) acc[t.parent_key] = [];
            acc[t.parent_key].push(t);
        }
        return acc;
    }, {});

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none bg-gradient-to-r from-slate-50 to-white border-b border-slate-100"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">{orderName}</span>
                            {order?.order_id && (
                                <Link
                                    href={`/orders/${orderId}`}
                                    onClick={e => e.stopPropagation()}
                                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors"
                                >
                                    {order.order_id}
                                </Link>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-slate-500">
                                🖨 {printerName}
                            </span>
                            {order?.progress && (
                                <span className="text-[10px] font-semibold uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                    {order.progress}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress pill */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-[11px] font-bold ${pct === 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {done}/{total}
                        </span>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                    {expanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Task List */}
            {expanded && (
                <div className="px-4 py-2 divide-y divide-slate-50">
                    {topLevel.map(item => {
                        const checkKey = makeCheckKey(item.order_id, item.task_key);
                        const checkAnswer = checkAnswers[checkKey] || null;
                        const children = childMap[item.task_key] || [];
                        const showChildren = item.meta?.is_check && checkAnswer === 'no';

                        return (
                            <div key={item.id}>
                                <TodoCheckItem
                                    item={item}
                                    checkAnswer={checkAnswer}
                                    onToggleDone={onToggleDone}
                                    onSetCheck={onSetCheck}
                                />
                                {/* Conditional child tasks */}
                                {showChildren && children.map(child => (
                                    <TodoCheckItem
                                        key={child.id}
                                        item={child}
                                        checkAnswer={null}
                                        onToggleDone={onToggleDone}
                                        onSetCheck={onSetCheck}
                                        isChild
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TodosPage() {
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'all' | 'done'>('pending');
    // Stores Yes/No answers for check tasks: key = "orderId::taskKey"
    const [checkAnswers, setCheckAnswers] = useState<Record<string, 'yes' | 'no'>>({});

    const fetchTodos = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('order_todos')
            .select(`
                *,
                orders (
                    id,
                    order_id,
                    product_name,
                    printer_name,
                    quantity,
                    progress,
                    products (
                        product_name,
                        ink,
                        plate_no
                    )
                )
            `)
            .order('order_id', { ascending: false })
            .order('sort_order', { ascending: true });

        if (!error && data) {
            setTodos(data as TodoItem[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

    const handleToggleDone = useCallback(async (id: number, done: boolean) => {
        // Optimistic update
        setTodos(prev => prev.map(t => t.id === id ? { ...t, done } : t));
        await supabase.from('order_todos').update({ done, updated_at: new Date().toISOString() }).eq('id', id);
    }, []);

    const handleSetCheck = useCallback(async (orderId: number, taskKey: string, answer: 'yes' | 'no') => {
        const key = makeCheckKey(orderId, taskKey);
        setCheckAnswers(prev => ({ ...prev, [key]: answer }));

        // If YES → mark the check task as "skipped" (available, no action)
        // If NO → mark it back to not skipped, reveal children
        const checkTodo = todos.find(t => t.order_id === orderId && t.task_key === taskKey);
        if (checkTodo) {
            const skipped = answer === 'yes';
            setTodos(prev => prev.map(t => t.id === checkTodo.id ? { ...t, skipped, done: false } : t));
            await supabase.from('order_todos').update({ skipped, done: false, updated_at: new Date().toISOString() }).eq('id', checkTodo.id);
        }
    }, [todos]);

    // Group todos by order_id
    const grouped = useMemo(() => {
        const map = new Map<number, TodoItem[]>();
        todos.forEach(t => {
            if (!map.has(t.order_id)) map.set(t.order_id, []);
            map.get(t.order_id)!.push(t);
        });
        return map;
    }, [todos]);

    // Filter logic — applied at the group level
    const filteredGroups = useMemo(() => {
        const result: [number, TodoItem[]][] = [];
        grouped.forEach((items, orderId) => {
            const hasPending = items.some(t => !t.done && !t.skipped);
            const hasDone = items.some(t => t.done || t.skipped);

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
                        <button
                            onClick={fetchTodos}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 transition-all"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                }
            />

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
                {(['pending', 'all', 'done'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                            filter === f
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <Loader2 className="animate-spin w-8 h-8 text-indigo-400" />
                    <span className="text-sm font-medium">Loading tasks...</span>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                    <p className="text-base font-semibold text-slate-500">
                        {filter === 'pending' ? 'All caught up! No pending tasks.' : 'No tasks found.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredGroups.map(([orderId, items]) => (
                        <OrderTodoCard
                            key={orderId}
                            orderId={orderId}
                            todos={items}
                            checkAnswers={checkAnswers}
                            onToggleDone={handleToggleDone}
                            onSetCheck={handleSetCheck}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
