'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText,
    ReceiptText,
    Search,
    Download,
    Mail,
    ExternalLink,
    Loader2,
    AlertCircle,
    Building2,
    Calendar,
    Package,
    RefreshCw,
    CheckCircle2,
    Eye,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Trash2,
    ShoppingBag
} from 'lucide-react';
import SendInvoiceEmailModal, { formatToDDMMYYYY } from '@/components/SendInvoiceEmailModal';

interface SalesInvoiceRecord {
    invoice_number: string;
    zoho_id?: string;
    date: string;
    customer_name: string;
    delivery_address?: string;
    company: string;
    orders: {
        id: number;
        order_id: string;
        product_name: string;
        artwork_code?: string;
        quantity: number;
        qty_delivered: number;
        packing_detail?: string;
        rate: number;
        amount: number;
        remarks?: string;
    }[];
    total_delivered_qty: number;
    total_amount: number;
    status: string;
    source: string;
    pdf_available: boolean;
    pdf_url: string;
    invoice_url: string;
}

export type SortField = 'date' | 'invoice_number' | 'customer_name' | 'company' | 'total_amount' | 'status';
export type SortOrder = 'asc' | 'desc';

function parseDateToTimestamp(dateStr?: string | null): number {
    if (!dateStr) return 0;
    const s = dateStr.trim();

    // 1. ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        return new Date(s.slice(0, 10)).getTime() || 0;
    }

    // 2. Separated by - or /
    const parts = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (parts) {
        let p1 = parseInt(parts[1], 10);
        let p2 = parseInt(parts[2], 10);
        let year = parseInt(parts[3], 10);
        if (year < 100) year += 2000;

        let day = p1;
        let month = p2;

        if (p2 > 12) {
            // p2 is day, p1 is month (e.g. 5/31/2025 -> May 31, 2025)
            month = p1;
            day = p2;
        } else if (p1 > 12) {
            // p1 is day, p2 is month (e.g. 31-05-2025 -> May 31, 2025)
            day = p1;
            month = p2;
        } else if (s.includes('/')) {
            // Slash format typically M/D/YYYY
            month = p1;
            day = p2;
        } else {
            // Dash format typically D-M-YYYY
            day = p1;
            month = p2;
        }

        return new Date(year, month - 1, day).getTime() || 0;
    }

    const parsed = new Date(s).getTime();
    return isNaN(parsed) ? 0 : parsed;
}

const CACHE_STORAGE_KEY = 'cpack_cached_sales_invoices_v1';

export default function SalesInvoicesPage() {
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [invoices, setInvoices] = useState<SalesInvoiceRecord[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [companyFilter, setCompanyFilter] = useState<'All' | 'Creative Printers' | 'Creative Packaging' | 'Creative Enterprise'>('All');

    // Sorting state (default: latest dispatch at top)
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Email Modal state
    const [emailModalInvoice, setEmailModalInvoice] = useState<SalesInvoiceRecord | null>(null);

    // View Loading state
    const [viewingInvoiceNo, setViewingInvoiceNo] = useState<string | null>(null);

    const fetchInvoices = async (forceRefresh = false) => {
        if (invoices.length === 0) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setErrorMsg(null);
        try {
            const url = forceRefresh ? '/api/invoices?refresh=true' : '/api/invoices';
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load invoices.');
            const list = data.invoices || [];
            setInvoices(list);
            try {
                localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(list));
            } catch {}
        } catch (err: any) {
            console.error('Error fetching invoices:', err);
            if (invoices.length === 0) {
                setErrorMsg(err.message || 'Failed to fetch sales invoices.');
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        // 1. Immediately hydrate from cache for instantaneous 0ms display
        try {
            const cached = localStorage.getItem(CACHE_STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setInvoices(parsed);
                    setLoading(false);
                }
            }
        } catch {}

        // 2. Fetch fresh data in the background
        fetchInvoices(false);
    }, []);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            // Default descending for date and amount, ascending for text
            setSortOrder(field === 'date' || field === 'total_amount' ? 'desc' : 'asc');
        }
    };

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const num = (inv.invoice_number || '').trim().toUpperCase();
            if (companyFilter === 'Creative Printers') {
                if (num.startsWith('U-') || num.startsWith('P-')) return false;
                if (!inv.company.toLowerCase().includes('print') && !num.startsWith('S-')) return false;
            } else if (companyFilter === 'Creative Packaging') {
                if (num.startsWith('S-') || num.startsWith('P-')) return false;
                if (!inv.company.toLowerCase().includes('pack') && !num.startsWith('U-')) return false;
            } else if (companyFilter === 'Creative Enterprise') {
                if (num.startsWith('S-') || num.startsWith('U-')) return false;
                if (!inv.company.toLowerCase().includes('enter') && !num.startsWith('P-')) return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const invNoMatch = inv.invoice_number.toLowerCase().includes(q);
                const custMatch = inv.customer_name.toLowerCase().includes(q);
                const prodMatch = (inv.orders || []).some(o => (o.product_name || '').toLowerCase().includes(q) || (o.artwork_code || '').toLowerCase().includes(q));
                if (!invNoMatch && !custMatch && !prodMatch) return false;
            }

            return true;
        });
    }, [invoices, companyFilter, searchQuery]);

    // Sorted invoices based on sortField and sortOrder
    const sortedInvoices = useMemo(() => {
        const list = [...filteredInvoices];
        list.sort((a, b) => {
            let res = 0;
            if (sortField === 'date') {
                const timeA = parseDateToTimestamp(a.date);
                const timeB = parseDateToTimestamp(b.date);
                res = timeA - timeB;
                // Secondary tie-breaker: invoice number descending
                if (res === 0) {
                    const numA = parseInt(a.invoice_number.replace(/\D/g, '') || '0', 10);
                    const numB = parseInt(b.invoice_number.replace(/\D/g, '') || '0', 10);
                    res = numA - numB;
                }
            } else if (sortField === 'invoice_number') {
                const numA = parseInt(a.invoice_number.replace(/\D/g, '') || '0', 10);
                const numB = parseInt(b.invoice_number.replace(/\D/g, '') || '0', 10);
                res = numA - numB;
                if (res === 0) {
                    res = a.invoice_number.localeCompare(b.invoice_number);
                }
            } else if (sortField === 'total_amount') {
                res = (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
            } else if (sortField === 'customer_name') {
                res = (a.customer_name || '').localeCompare(b.customer_name || '');
            } else if (sortField === 'company') {
                res = (a.company || '').localeCompare(b.company || '');
            } else if (sortField === 'status') {
                res = (a.status || '').localeCompare(b.status || '');
            }

            return sortOrder === 'desc' ? -res : res;
        });
        return list;
    }, [filteredInvoices, sortField, sortOrder]);

    // KPI stats
    const stats = useMemo(() => {
        const totalCount = filteredInvoices.length;
        const totalQty = filteredInvoices.reduce((acc, inv) => acc + (inv.total_delivered_qty || 0), 0);
        const totalValue = filteredInvoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
        const readyPdfs = filteredInvoices.length;
        return { totalCount, totalQty, totalValue, readyPdfs };
    }, [filteredInvoices]);

    const handleViewInvoice = async (inv: SalesInvoiceRecord) => {
        if (inv.invoice_url) {
            window.open(inv.invoice_url, '_blank');
            return;
        }

        setViewingInvoiceNo(inv.invoice_number);
        try {
            const res = await fetch(`/api/zoho/invoice-url?invoiceNumber=${encodeURIComponent(inv.invoice_number)}`);
            const data = await res.json();
            if (data.invoiceUrl) {
                // Cache url in state
                setInvoices(prev => prev.map(item => item.invoice_number === inv.invoice_number ? { ...item, invoice_url: data.invoiceUrl } : item));
                window.open(data.invoiceUrl, '_blank');
            } else {
                alert(`Invoice URL not available from Zoho: ${data.error || 'Check Zoho Books configuration.'}`);
            }
        } catch (err: any) {
            alert('Failed to retrieve Zoho invoice link: ' + err.message);
        } finally {
            setViewingInvoiceNo(null);
        }
    };

    const handleUnlinkInvoice = async (inv: SalesInvoiceRecord) => {
        if (!confirm(`Are you sure you want to unlink invoice ${inv.invoice_number} from its orders?\n\nThis will remove it from the Sales Invoices list and allow its orders to be selected for a new invoice in Generate Documents.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/invoices?invoiceNumber=${encodeURIComponent(inv.invoice_number)}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to unlink invoice.');

            // Remove from state immediately
            setInvoices(prev => {
                const nextList = prev.filter(item => item.invoice_number !== inv.invoice_number);
                try {
                    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(nextList));
                } catch {}
                return nextList;
            });
            alert(`Invoice ${inv.invoice_number} unlinked successfully. You can now re-generate documents.`);
        } catch (err: any) {
            alert('Failed to unlink invoice: ' + err.message);
        }
    };

    const renderSortableHeader = (label: string, field: SortField, align: 'left' | 'right' | 'center' = 'left') => {
        const isActive = sortField === field;
        return (
            <th
                className={`py-2 px-2.5 cursor-pointer select-none transition-colors hover:bg-slate-100 ${
                    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                } ${isActive ? 'text-indigo-700 font-bold' : 'text-slate-500 font-semibold'}`}
                onClick={() => handleSort(field)}
                title={`Click to sort by ${label}`}
            >
                <div className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wider ${
                    align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : 'justify-start'
                }`}>
                    <span>{label}</span>
                    {isActive ? (
                        sortOrder === 'desc' ? (
                            <ArrowDown className="w-3 h-3 text-indigo-600 stroke-[2.5]" />
                        ) : (
                            <ArrowUp className="w-3 h-3 text-indigo-600 stroke-[2.5]" />
                        )
                    ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 hover:opacity-100" />
                    )}
                </div>
            </th>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-2.5 sm:p-3.5 space-y-2.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>

            {/* Ultra-compact Header & Quick Stats Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                            <ReceiptText className="w-4 h-4" />
                        </div>
                        <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Sales Invoices</h1>
                    </div>

                    {/* Compact KPI Pills in single horizontal strip */}
                    <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        <span><strong className="text-slate-900 font-bold">{stats.totalCount}</strong> Invoices</span>
                        <span className="text-slate-300">•</span>
                        <span><strong className="text-purple-700 font-bold">{stats.totalQty >= 1000000 ? (stats.totalQty / 1000000).toFixed(2) + 'M' : stats.totalQty.toLocaleString()}</strong> pcs</span>
                        <span className="text-slate-300">•</span>
                        <span><strong className="text-emerald-700 font-bold">₹{stats.totalValue >= 10000000 ? (stats.totalValue / 10000000).toFixed(2) + ' Cr' : stats.totalValue >= 100000 ? (stats.totalValue / 100000).toFixed(2) + ' L' : Math.round(stats.totalValue).toLocaleString()}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span><strong className="text-blue-700 font-bold">{stats.readyPdfs}</strong> PDFs Ready</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                    <a
                        href="https://zohoinvoicesync.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Open Zoho Purchases & InvoiceSync Portal"
                    >
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Purchases Portal</span>
                        <ExternalLink className="w-3 h-3 text-indigo-500" />
                    </a>

                    <button
                        type="button"
                        onClick={() => fetchInvoices(true)}
                        disabled={loading || isRefreshing}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        title="Force refresh invoices from Zoho Books & Database"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || (loading && invoices.length === 0) ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                </div>
            </div>

            {/* Filter & Sorting Toolbar */}
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap gap-2 items-center justify-between">
                {/* Company Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-bold overflow-x-auto">
                    {(['All', 'Creative Printers', 'Creative Packaging', 'Creative Enterprise'] as const).map(c => {
                        const active = companyFilter === c;
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCompanyFilter(c)}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap text-xs ${
                                    active
                                        ? 'bg-white text-slate-900 shadow-2xs font-black'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {c === 'All' ? 'All Billing Companies' : c}
                            </button>
                        );
                    })}
                </div>

                {/* Search & Sort Indicator */}
                <div className="flex items-center gap-2 ml-auto">
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        <span>Sort:</span>
                        <strong className="text-indigo-700 capitalize">
                            {sortField === 'date' ? 'Dispatch Date' : sortField.replace('_', ' ')}
                        </strong>
                        <span className="text-[10px] text-slate-400">({sortOrder === 'desc' ? 'Latest' : 'Oldest'})</span>
                    </span>

                    <div className="relative w-48 sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search invoice, product, customer..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                {loading && invoices.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mb-2" />
                        <p className="text-xs font-bold text-slate-600">Loading invoices from Zoho Books & Database...</p>
                    </div>
                ) : errorMsg && invoices.length === 0 ? (
                    <div className="p-6 text-center text-rose-600 bg-rose-50/50">
                        <AlertCircle className="w-7 h-7 mx-auto mb-2 text-rose-500" />
                        <p className="text-xs font-bold">{errorMsg}</p>
                    </div>
                ) : sortedInvoices.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">
                        <AlertCircle className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No matching invoices found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search query or company filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                                    {renderSortableHeader('Dispatch Date', 'date')}
                                    {renderSortableHeader('Invoice No', 'invoice_number')}
                                    {renderSortableHeader('Customer', 'customer_name')}
                                    <th className="py-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Products & Delivered Qty</th>
                                    {renderSortableHeader('Company', 'company')}
                                    {renderSortableHeader('Amount (₹)', 'total_amount', 'right')}
                                    {renderSortableHeader('Status', 'status', 'center')}
                                    <th className="py-2 px-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {sortedInvoices.map((inv, idx) => {
                                    const isViewing = viewingInvoiceNo === inv.invoice_number;
                                    return (
                                        <tr key={inv.invoice_number || idx} className="hover:bg-indigo-50/20 transition-colors border-b border-slate-100 last:border-b-0">
                                            {/* Date */}
                                            <td className="py-1.5 px-2.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    <span>{formatToDDMMYYYY(inv.date) || '-'}</span>
                                                </div>
                                            </td>

                                            {/* Invoice Number */}
                                            <td className="py-1.5 px-2.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-indigo-700 text-xs tracking-tight">
                                                        {inv.invoice_number}
                                                    </span>
                                                    {inv.orders && inv.orders.length > 0 && (
                                                        <a
                                                            href={`/orders/summary/coa?ids=${inv.orders.map(o => o.id).join(',')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-1.5 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded text-[9px] font-black flex items-center gap-0.5 transition-all"
                                                            title="Open official system COAs in your exact original layout"
                                                        >
                                                            <FileText className="w-2.5 h-2.5 text-sky-600" />
                                                            <span>COAs</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Customer */}
                                            <td className="py-1.5 px-2.5 max-w-[200px]">
                                                <div className="text-xs font-semibold text-slate-900 truncate" title={inv.customer_name}>
                                                    {inv.customer_name}
                                                </div>
                                            </td>

                                            {/* Products & Delivered Quantities */}
                                            <td className="py-1.5 px-2.5 max-w-[340px]">
                                                {inv.orders && inv.orders.length > 0 ? (
                                                    <div className="space-y-0.5">
                                                        {inv.orders.map((ord, oIdx) => (
                                                            <div key={ord.id || oIdx} className="flex items-center justify-between gap-2 text-xs leading-tight">
                                                                <span className="text-[11px] font-medium text-slate-800 truncate" title={ord.product_name}>
                                                                    {ord.product_name}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100/60 shrink-0 whitespace-nowrap">
                                                                    {Number(ord.qty_delivered || ord.quantity || 0).toLocaleString()} pcs
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 italic">Zoho line items</span>
                                                )}
                                            </td>

                                            {/* Company */}
                                            <td className="py-1.5 px-2.5 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                    <Building2 className="w-2.5 h-2.5 text-slate-500" />
                                                    {inv.company}
                                                </span>
                                            </td>

                                            {/* Total Amount */}
                                            <td className="py-1.5 px-2.5 text-right whitespace-nowrap font-bold text-slate-900 text-xs">
                                                ₹{Number(inv.total_amount || 0).toLocaleString()}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                    inv.status === 'deleted_in_zoho'
                                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                                        : inv.status === 'paid'
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        : inv.status === 'draft'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                }`}>
                                                    {inv.status === 'deleted_in_zoho' ? 'Deleted' : (inv.status || 'Active')}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* 1. View Invoice */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewInvoice(inv)}
                                                        disabled={isViewing}
                                                        className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded transition-all cursor-pointer"
                                                        title="View Invoice in Zoho Books"
                                                    >
                                                        {isViewing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>

                                                    {/* 2. Download Dispatch Package (3 Invoices + COAs) */}
                                                    <a
                                                        href={`/api/invoices/download?invoiceNumber=${encodeURIComponent(inv.invoice_number)}`}
                                                        download={`Dispatch_Documents_${inv.invoice_number}.pdf`}
                                                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded transition-all cursor-pointer inline-flex items-center"
                                                        title="Download Unified PDF (3 Invoices + COAs)"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>

                                                    {/* 3. Open Official System COAs */}
                                                    {inv.orders && inv.orders.length > 0 && (
                                                        <a
                                                            href={`/orders/summary/coa?ids=${inv.orders.map(o => o.id).join(',')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50 border border-sky-200 rounded transition-all cursor-pointer inline-flex items-center"
                                                            title="Open official system COAs in your exact original layout"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}

                                                    {/* 4. Email Invoice & COAs */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setEmailModalInvoice(inv)}
                                                        className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded transition-all cursor-pointer"
                                                        title="Email Invoice & COAs to Customer"
                                                    >
                                                        <Mail className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* 5. Unlink / Delete Invoice */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnlinkInvoice(inv)}
                                                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-all cursor-pointer"
                                                        title="Unlink Invoice from Orders (Use if deleted in Zoho)"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Email Sales Invoice Modal */}
            {emailModalInvoice && (
                <SendInvoiceEmailModal
                    isOpen={Boolean(emailModalInvoice)}
                    onClose={() => setEmailModalInvoice(null)}
                    invoice={emailModalInvoice}
                />
            )}

        </div>
    );
}
