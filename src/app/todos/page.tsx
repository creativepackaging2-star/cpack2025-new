'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import {
    CheckSquare,
    Loader2,
    CheckCircle2,
    Circle,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    RefreshCw,
    Package,
    Plus,
    Zap,
    Table2,
    ExternalLink,
    Search,
    SlidersHorizontal,
    Check
} from 'lucide-react';
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
        status: string;
        ink: string;
        plate_no: string;
        customer_name?: string;
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

export function isLabelCategory(categoryName?: string | null, productName?: string | null, categoryId?: number | null): boolean {
    const cat = (categoryName || '').toLowerCase().trim();
    if (cat.includes('label') || cat === 'lbl') return true;
    if (categoryId === 4) return true;
    const prod = (productName || '').toLowerCase().trim();
    if (/\blabels?\b/i.test(prod) || /\blbl\b/i.test(prod)) return true;
    return false;
}

/**
 * Determines if an ink string is CMYK or standard process ink (no check needed).
 * Rule: Skip check if ink is CMYK, process colors, Black, or standard varnish.
 * Only require ink check if there is a specific Pantone/PMS code or special spot ink.
 */
export function isCmykOrStandardInk(ink: string | null | undefined): boolean {
    if (!ink) return true;
    const clean = ink.trim();
    if (!clean || clean === '-' || clean.toLowerCase() === 'null') return true;

    const s = clean.toUpperCase();
    const stripped = s
        .replace(/CMYK/g, '')
        .replace(/CYAN/g, '')
        .replace(/MAGENTA/g, '')
        .replace(/YELLOW/g, '')
        .replace(/BLACK/g, '')
        .replace(/WHITE/g, '')
        .replace(/PROCESS/g, '')
        .replace(/4\s*COLOU?R/g, '')
        .replace(/4C/g, '')
        .replace(/1C/g, '')
        .replace(/UV/g, '')
        .replace(/INK/g, '')
        .replace(/AQUA/g, '')
        .replace(/VARNISH/g, '')
        .replace(/[\s,\+\/\-\(\)]/g, '');

    return (!stripped || !/\d/.test(stripped));
}

function inkNeedsCheck(ink: string | null | undefined): boolean {
    return !isCmykOrStandardInk(ink);
}

async function generateOrderTodos(
    orderId: number, 
    ink: string | null, 
    plateNo: string | null, 
    printerName: string | null,
    categoryName?: string | null,
    productName?: string | null,
    categoryId?: number | null
) {
    // Check existing
    try {
        const existing = await restFetch(`order_todos?order_id=eq.${orderId}&select=id&limit=1`);
        if (existing && existing.length > 0) {
            await restFetch(`order_todos?order_id=eq.${orderId}`, { method: 'DELETE' });
        }
    } catch {}

    let isLabel = isLabelCategory(categoryName, productName, categoryId);
    if (!categoryName && !productName && !categoryId) {
        try {
            const ordData = await restFetch(`orders?id=eq.${orderId}&select=category_name,product_name,products(category_id)&limit=1`);
            if (ordData && ordData[0]) {
                isLabel = isLabelCategory(
                    ordData[0].category_name,
                    ordData[0].product_name,
                    ordData[0].products?.category_id
                );
            }
        } catch {}
    }

    const todos: Record<string, any>[] = [];
    let sort = 1;

    // For Label category orders, task steps are strictly:
    // 1. send for approval
    // 2. rec approval
    // 3. send for printing
    // 4. send box label
    if (isLabel) {
        todos.push({ order_id: orderId, task_key: 'send_for_approval', label: 'Send for approval', sort_order: sort++, parent_key: null, meta: {} });
        todos.push({ order_id: orderId, task_key: 'rec_approval',      label: 'Rec approval',        sort_order: sort++, parent_key: null, meta: {} });
        todos.push({ order_id: orderId, task_key: 'send_for_printing', label: 'Send for printing',   sort_order: sort++, parent_key: null, meta: {} });
        todos.push({ order_id: orderId, task_key: 'send_box_label',    label: 'Send box label',      sort_order: sort++, parent_key: null, meta: {} });
    } else {
        const printer = printerName || 'Printer';
        const needsInkCheck = inkNeedsCheck(ink);

        todos.push({ order_id: orderId, task_key: 'send_artwork',    label: 'Send artwork for approval',           sort_order: sort++, parent_key: null,          meta: {} });
        todos.push({ order_id: orderId, task_key: 'order_paper',     label: 'Order paper',                         sort_order: sort++, parent_key: null,          meta: {} });

        // In ink if CMYK - don't add as task at all!
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
    }

    await restFetch('order_todos', { method: 'POST', body: JSON.stringify(todos) });
}

// ─── Table View (Product Name 1st, Not Grouped Product Wise) ──────────────────

function TodoTableView({
    todos,
    checkAnswers,
    onToggleDone,
    onSetCheck
}: {
    todos: TodoItem[];
    checkAnswers: Record<string, 'yes' | 'no'>;
    onToggleDone: (id: number, done: boolean) => void;
    onSetCheck: (orderId: number, taskKey: string, answer: 'yes' | 'no') => void;
}) {
    if (todos.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                <p className="text-base font-bold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No tasks matching your current filter.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-[#E6E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#F3F4FB] border-b border-[#E6E8F0] text-[11px] font-bold uppercase text-[#4B5068] tracking-wider">
                            <th className="py-3 px-4 w-[280px]">Product Name</th>
                            <th className="py-3 px-4">Task / Requirement</th>
                            <th className="py-3 px-4 w-[160px] text-center">Status</th>
                            <th className="py-3 px-4 w-[140px]">Printer</th>
                            <th className="py-3 px-4 w-[120px] text-right">Quantity</th>
                            <th className="py-3 px-4 w-[70px] text-center">Link</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                        {todos.map(item => {
                            const ord = item.orders;
                            const productName = ord?.products?.product_name || ord?.product_name || `Order #${item.order_id}`;
                            const orderCode = ord?.order_id || `#${item.order_id}`;
                            const isCheck = !!item.meta?.is_check;
                            const checkType = item.meta?.check_type as keyof typeof CHECK_TYPES | undefined;
                            const checkKey = makeCheckKey(item.order_id, item.task_key);
                            const checkAnswer = checkAnswers[checkKey] || null;
                            const isDone = item.done || item.skipped;

                            return (
                                <tr
                                    key={item.id}
                                    className={`transition-colors hover:bg-slate-50/80 ${
                                        isDone ? 'bg-slate-50/40 text-slate-400' : 'text-slate-800'
                                    }`}
                                >
                                    {/* 1. PRODUCT NAME (1st column) */}
                                    <td className="py-3 px-4 align-middle">
                                        <div className="flex flex-col">
                                            <span className={`font-bold text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                {productName}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <Link
                                                    href={`/orders/${item.order_id}`}
                                                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors"
                                                    title="View order"
                                                >
                                                    <span>{orderCode}</span>
                                                </Link>
                                                {ord?.progress && (
                                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                                        {ord.progress}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* 2. TASK / REQUIREMENT */}
                                    <td className="py-3 px-4 align-middle">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                {item.parent_key && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                                        Action Required
                                                    </span>
                                                )}
                                                <span className={`text-[13px] ${isDone ? 'line-through text-slate-400' : isCheck ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                                                    {item.label}
                                                </span>
                                            </div>

                                            {/* Interactive check buttons if task is a check type */}
                                            {isCheck && !item.skipped && checkType && (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onSetCheck(item.order_id, item.task_key, 'yes')}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                                            checkAnswer === 'yes'
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                                : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                                                        }`}
                                                    >
                                                        ✓ Yes (Available)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onSetCheck(item.order_id, item.task_key, 'no')}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                                            checkAnswer === 'no'
                                                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                                                : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                                                        }`}
                                                    >
                                                        ✗ No (Required)
                                                    </button>
                                                    {checkAnswer && (
                                                        <span className={`text-[11px] font-medium ${checkAnswer === 'yes' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                            {CHECK_TYPES[checkType]?.[checkAnswer]}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {item.skipped && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                                                    <Check className="w-3 h-3" /> Available — Skipped
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* 3. STATUS / TOGGLE */}
                                    <td className="py-3 px-4 align-middle text-center">
                                        {isCheck ? (
                                            item.skipped ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                                                    Available ✓
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800">
                                                    Needs Check
                                                </span>
                                            )
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => onToggleDone(item.id, !item.done)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                                    item.done
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
                                                }`}
                                            >
                                                {item.done ? (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                        <span>Done</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Circle className="w-4 h-4 text-slate-400" />
                                                        <span>Pending</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </td>

                                    {/* 4. PRINTER */}
                                    <td className="py-3 px-4 align-middle">
                                        <span className="font-semibold text-slate-700">
                                            {ord?.printer_name || '-'}
                                        </span>
                                    </td>

                                    {/* 5. QUANTITY */}
                                    <td className="py-3 px-4 align-middle text-right">
                                        <span className="font-extrabold text-slate-800">
                                            {(ord?.quantity || 0).toLocaleString()} pcs
                                        </span>
                                    </td>

                                    {/* 6. LINK */}
                                    <td className="py-3 px-4 align-middle text-center">
                                        <Link
                                            href={`/orders/${item.order_id}`}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg inline-flex items-center justify-center transition-colors"
                                            title="Open order page"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── OrderTodoCard (Group by Product View) ────────────────────────────────────

function OrderTodoCard({
    orderId,
    todos,
    checkAnswers,
    onToggleDone,
    onSetCheck,
    onRegenerate
}: {
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
        if (t.parent_key) {
            if (!acc[t.parent_key]) acc[t.parent_key] = [];
            acc[t.parent_key].push(t);
        }
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
            <div
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none bg-gradient-to-r from-slate-50 to-white border-b border-slate-100"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="shrink-0 h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-500">🖨 {printerName}</span>
                            {order?.progress && (
                                <span className="text-[10px] font-semibold uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                    {order.progress}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleRegen}
                        title="Regenerate todos"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer"
                        disabled={regenerating}
                    >
                        {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-[11px] font-bold ${pct === 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {done}/{total}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${pct}%` }}
                            />
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
                        const isCheck = !!item.meta?.is_check;
                        const checkType = item.meta?.check_type as keyof typeof CHECK_TYPES | undefined;

                        return (
                            <div key={item.id}>
                                <div className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-all ${
                                    item.done || item.skipped ? 'opacity-50' : 'hover:bg-slate-50'
                                }`}>
                                    {isCheck ? (
                                        <div className="mt-0.5 shrink-0">
                                            {item.skipped
                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                : <AlertCircle className="w-4 h-4 text-amber-400" />}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onToggleDone(item.id, !item.done)}
                                            className="mt-0.5 shrink-0 hover:scale-110 transition-transform cursor-pointer"
                                        >
                                            {item.done
                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                : <Circle className="w-4 h-4 text-slate-300 hover:text-indigo-400" />}
                                        </button>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <span className={`text-[13px] ${
                                            item.done || item.skipped ? 'line-through text-slate-400' : isCheck ? 'font-semibold text-slate-800' : 'text-slate-700'
                                        }`}>
                                            {item.label}
                                        </span>

                                        {isCheck && !item.skipped && checkType && (
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <button
                                                    onClick={() => onSetCheck(item.order_id, item.task_key, 'yes')}
                                                    className={`px-3 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                                        checkAnswer === 'yes' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50'
                                                    }`}
                                                >
                                                    ✓ Yes
                                                </button>
                                                <button
                                                    onClick={() => onSetCheck(item.order_id, item.task_key, 'no')}
                                                    className={`px-3 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                                        checkAnswer === 'no' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-rose-600 border-rose-300 hover:bg-rose-50'
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
                                        {item.skipped && (
                                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                Available ✓
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {showChildren && children.map(child => (
                                    <div
                                        key={child.id}
                                        className="ml-7 py-2 px-3 my-1 rounded-lg bg-orange-50/70 border border-orange-100 flex items-center justify-between"
                                    >
                                        <span className="text-xs font-semibold text-orange-900">{child.label}</span>
                                        <button
                                            onClick={() => onToggleDone(child.id, !child.done)}
                                            className="px-2 py-0.5 text-[11px] font-bold rounded bg-orange-200 text-orange-800 hover:bg-orange-300 transition-colors"
                                        >
                                            {child.done ? 'Done ✓' : 'Mark Done'}
                                        </button>
                                    </div>
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
            const { data: order } = await supabase
                .from('orders')
                .select('id, category_name, product_name, ink, plate_no, printer_name, status, products(category_id, product_name, ink, plate_no)')
                .eq('id', parseInt(orderId))
                .single();

            if (!order) {
                setMsg('❌ Order not found');
                setLoading(false);
                return;
            }
            if ((order.status || '').toLowerCase() === 'complete') {
                setMsg('❌ Order is already Complete. Only open orders can have tasks.');
                setLoading(false);
                return;
            }

            const ink = (order as any).products?.ink || (order as any).ink;
            const plateNo = (order as any).products?.plate_no || (order as any).plate_no;
            const catName = (order as any).category_name || null;
            const prodName = (order as any).product_name || (order as any).products?.product_name || null;
            const catId = (order as any).products?.category_id || null;
            await generateOrderTodos((order as any).id, ink, plateNo, (order as any).printer_name, catName, prodName, catId);
            setMsg('✅ Todos generated! Refreshing tasks...');
            setTimeout(() => {
                onClose();
            }, 800);
        } catch (err: any) {
            setMsg('❌ Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold text-slate-800 mb-1">Generate Todos for Open Order</h3>
                <p className="text-[12px] text-slate-400 mb-4">Enter numeric DB ID of an open order</p>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                        type="number"
                        placeholder="e.g. 1765"
                        value={orderId}
                        onChange={e => setOrderId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    {msg && <p className="text-[12px] font-semibold text-slate-600">{msg}</p>}
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={loading || !orderId}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                        >
                            Cancel
                        </button>
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
    // Default is TABLE view!
    const [viewMode, setViewMode] = useState<'table' | 'product'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [checkAnswers, setCheckAnswers] = useState<Record<string, 'yes' | 'no'>>({});
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    const fetchTodos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch only OPEN orders (status is not Complete)
            const openOrdersData = await restFetch(
                `orders?status=neq.Complete&status=neq.complete&select=id,order_id,product_name,category_name,printer_name,ink,plate_no,quantity,progress,product_id,status,customer_name,products(category_id,product_name,ink,plate_no)`
            );

            const openOrdersMap = new Map<number, any>();
            const openOrderIds = new Set<number>();
            (openOrdersData || []).forEach((o: any) => {
                openOrdersMap.set(o.id, o);
                openOrderIds.add(o.id);
            });

            // 2. Fetch todos from DB
            const todosData = await restFetch(`order_todos?select=*&order=order_id.desc,sort_order.asc`);

            // 3. Process todos:
            // - Exclude any task belonging to a completed order
            // - For label category orders, only allow the 4 label task steps:
            //   1. send for approval, 2. rec approval, 3. send for printing, 4. send box label
            // - If ink is CMYK / standard, exclude ink tasks!
            const tasksToDeleteForCompleted: number[] = [];
            const validTodos: TodoItem[] = [];

            (todosData || []).forEach((t: any) => {
                // If order is completed or deleted -> remove task
                if (!openOrderIds.has(t.order_id)) {
                    tasksToDeleteForCompleted.push(t.id);
                    return;
                }

                const ord = openOrdersMap.get(t.order_id);
                const isLabel = isLabelCategory(ord?.category_name, ord?.product_name || ord?.products?.product_name, ord?.products?.category_id);

                if (isLabel) {
                    const LABEL_ALLOWED_KEYS = ['send_for_approval', 'rec_approval', 'send_for_printing', 'send_box_label'];
                    if (!LABEL_ALLOWED_KEYS.includes(t.task_key)) {
                        tasksToDeleteForCompleted.push(t.id);
                        return; // Remove legacy carton tasks from label orders
                    }
                } else {
                    const orderInk = ord?.products?.ink || ord?.ink;

                    // "in ink if cmyk - dont show as a task at all in ink availabilty."
                    if (['check_ink', 'order_ink', 'followup_ink', 'rec_ink'].includes(t.task_key)) {
                        if (isCmykOrStandardInk(orderInk)) {
                            return; // Skip completely!
                        }
                    }
                }

                validTodos.push({
                    ...t,
                    orders: ord || null
                });
            });

            setTodos(validTodos);

            // Clean up tasks of completed orders asynchronously in background
            if (tasksToDeleteForCompleted.length > 0) {
                for (let i = 0; i < tasksToDeleteForCompleted.length; i += 50) {
                    const chunk = tasksToDeleteForCompleted.slice(i, i + 50);
                    restFetch(`order_todos?id=in.(${chunk.join(',')})`, { method: 'DELETE' }).catch(() => {});
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

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
        const categoryName = (order as any)?.category_name || null;
        const productName = (order as any)?.product_name || (order as any)?.products?.product_name || null;
        const categoryId = (order as any)?.products?.category_id || null;
        await generateOrderTodos(orderId, ink, plateNo, printerName, categoryName, productName, categoryId);
        await fetchTodos();
    }, [todos, fetchTodos]);

    const handleModalGenerate = useCallback(async (orderId: number) => {
        await generateOrderTodos(orderId, null, null, null);
        await fetchTodos();
    }, [fetchTodos]);

    // Filter todos by Status & Search Query
    const filteredTodos = useMemo(() => {
        return todos.filter(t => {
            // Status Filter
            if (filter === 'pending') {
                if (t.done || t.skipped) return false;
            } else if (filter === 'done') {
                if (!t.done && !t.skipped) return false;
            }

            // In Table View: don't show hidden sub-tasks unless explicitly active
            if (viewMode === 'table' && t.meta?.hidden) {
                // If it's a child task of check_plate and check_plate is 'no', show it!
                if (t.parent_key) {
                    const checkKey = makeCheckKey(t.order_id, t.parent_key);
                    if (checkAnswers[checkKey] !== 'no') return false;
                } else {
                    return false;
                }
            }

            // Search Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const pName = (t.orders?.products?.product_name || t.orders?.product_name || '').toLowerCase();
                const oCode = (t.orders?.order_id || '').toLowerCase();
                const label = (t.label || '').toLowerCase();
                const printer = (t.orders?.printer_name || '').toLowerCase();
                if (!pName.includes(q) && !oCode.includes(q) && !label.includes(q) && !printer.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [todos, filter, viewMode, checkAnswers, searchQuery]);

    // Grouping for "Group by Product" view
    const groupedByProduct = useMemo(() => {
        const map = new Map<number, TodoItem[]>();
        filteredTodos.forEach(t => {
            if (!map.has(t.order_id)) map.set(t.order_id, []);
            map.get(t.order_id)!.push(t);
        });
        return Array.from(map.entries());
    }, [filteredTodos]);

    const pendingCount = useMemo(() => {
        return todos.filter(t => !t.done && !t.skipped && !t.parent_key).length;
    }, [todos]);

    const openOrdersCount = useMemo(() => {
        const set = new Set<number>();
        todos.forEach(t => set.add(t.order_id));
        return set.size;
    }, [todos]);

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-16">
            <PageHeader
                title="To-Do"
                icon={<CheckSquare className="w-6 h-6" />}
                actions={
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                            {openOrdersCount} Open Orders
                        </span>
                        {pendingCount > 0 && (
                            <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                                {pendingCount} Pending Tasks
                            </span>
                        )}
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Generate todos for an open order"
                        >
                            <Plus className="w-3.5 h-3.5" /> Generate
                        </button>
                        <button
                            onClick={fetchTodos}
                            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-all cursor-pointer"
                            title="Refresh Tasks"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                }
            />

            {/* View Controls & Filter Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                {/* Left: View Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === 'table'
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Display flat table with Product Name 1st"
                    >
                        <Table2 className="w-3.5 h-3.5" />
                        <span>Table View</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setViewMode('product')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === 'product'
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Group tasks by Product / Order card"
                    >
                        <Package className="w-3.5 h-3.5" />
                        <span>Group by Product</span>
                    </button>
                </div>

                {/* Middle: Status Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {(['pending', 'all', 'done'] as const).map(f => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                                filter === f
                                    ? 'bg-slate-800 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Right: Search Input */}
                <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="Search product, order, task..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Error loading tasks: {error}</span>
                </div>
            )}

            {/* Main Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
                    <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-600">Loading open order tasks...</span>
                </div>
            ) : viewMode === 'table' ? (
                <TodoTableView
                    todos={filteredTodos}
                    checkAnswers={checkAnswers}
                    onToggleDone={handleToggleDone}
                    onSetCheck={handleSetCheck}
                />
            ) : groupedByProduct.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                    <p className="text-sm font-bold text-slate-700">No tasks found for open orders</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or search.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groupedByProduct.map(([orderId, items]) => (
                        <OrderTodoCard
                            key={orderId}
                            orderId={orderId}
                            todos={items}
                            checkAnswers={checkAnswers}
                            onToggleDone={handleToggleDone}
                            onSetCheck={handleSetCheck}
                            onRegenerate={handleRegenerate}
                        />
                    ))}
                </div>
            )}

            {/* Generate Modal */}
            {showGenerateModal && (
                <GenerateModal
                    onClose={() => setShowGenerateModal(false)}
                    onGenerate={handleModalGenerate}
                />
            )}
        </div>
    );
}
