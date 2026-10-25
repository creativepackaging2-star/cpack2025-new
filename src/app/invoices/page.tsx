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
    ArrowDown
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

export default function SalesInvoicesPage() {
    const [loading, setLoading] = useState(true);
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

    const fetchInvoices = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/api/invoices');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load invoices.');
            setInvoices(data.invoices || []);
        } catch (err: any) {
            console.error('Error fetching invoices:', err);
            setErrorMsg(err.message || 'Failed to fetch sales invoices.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
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
        const readyPdfs = filteredInvoices.filter(inv => inv.pdf_available).length;
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

    const renderSortableHeader = (label: string, field: SortField, align: 'left' | 'right' | 'center' = 'left') => {
        const isActive = sortField === field;
        return (
            <th
                className={`py-3.5 px-4 cursor-pointer select-none transition-colors hover:bg-slate-100 ${
                    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                } ${isActive ? 'text-indigo-700 font-bold' : 'text-slate-500 font-medium'}`}
                onClick={() => handleSort(field)}
                title={`Click to sort by ${label} (${isActive && sortOrder === 'desc' ? 'currently descending' : 'currently ascending'})`}
            >
                <div className={`inline-flex items-center gap-1.5 ${
                    align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : 'justify-start'
                }`}>
                    <span>{label}</span>
                    {isActive ? (
                        sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                        ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                        )
                    ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60 hover:opacity-100" />
                    )}
                </div>
            </th>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>

            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
                        <ReceiptText className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Sales Invoices</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage generated invoices, view Zoho Books documents, download 3-copy packages + official COAs, and email client contacts.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchInvoices}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Refresh invoices from Zoho & Database"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh Invoices</span>
                    </button>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoices</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quantity</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalQty.toLocaleString()}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                        <Package className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced (₹)</p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1">₹{Math.round(stats.totalValue).toLocaleString()}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <span className="font-black text-base">₹</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unified PDFs Ready</p>
                        <h3 className="text-2xl font-black text-blue-600 mt-1">{stats.readyPdfs}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <Download className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter & Sorting Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Company Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold overflow-x-auto">
                    {(['All', 'Creative Printers', 'Creative Packaging', 'Creative Enterprise'] as const).map(c => {
                        const active = companyFilter === c;
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setCompanyFilter(c)}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                    active
                                        ? 'bg-white text-slate-900 shadow-xs font-black'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {c === 'All' ? 'All Billing Companies' : c}
                            </button>
                        );
                    })}
                </div>

                {/* Search & Sort Indicator */}
                <div className="flex items-center gap-2.5">
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        <span>Sorted by:</span>
                        <strong className="text-indigo-700 capitalize">
                            {sortField === 'date' ? 'Dispatch Date' : sortField.replace('_', ' ')}
                        </strong>
                        <span className="text-[10px] text-slate-400">({sortOrder === 'desc' ? 'Latest first' : 'Oldest first'})</span>
                    </span>

                    <div className="relative md:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search invoice #, product, customer..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                        <p className="text-xs font-bold text-slate-600">Loading invoices from Zoho Books & Database...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="p-8 text-center text-rose-600 bg-rose-50/50">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                        <p className="text-sm font-bold">{errorMsg}</p>
                    </div>
                ) : sortedInvoices.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700">No matching invoices found</p>
                        <p className="text-xs text-slate-400 mt-1">Try clearing your search query or company filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-300 bg-slate-50 text-xs font-medium uppercase text-slate-500 tracking-wider">
                                    {renderSortableHeader('Dispatch Date', 'date')}
                                    {renderSortableHeader('Invoice No', 'invoice_number')}
                                    {renderSortableHeader('Customer', 'customer_name')}
                                    <th className="py-3.5 px-4 text-xs font-medium uppercase tracking-wider text-slate-500">Products & Delivered Qty</th>
                                    {renderSortableHeader('Company', 'company')}
                                    {renderSortableHeader('Amount (₹)', 'total_amount', 'right')}
                                    {renderSortableHeader('Status', 'status', 'center')}
                                    <th className="py-3.5 px-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 text-xs">
                                {sortedInvoices.map((inv, idx) => {
                                    const isViewing = viewingInvoiceNo === inv.invoice_number;
                                    return (
                                        <tr key={inv.invoice_number || idx} className="hover:bg-slate-50/90 transition-colors border-b border-slate-300 last:border-b-0">
                                            {/* Date */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{formatToDDMMYYYY(inv.date) || '-'}</span>
                                                </div>
                                            </td>

                                            {/* Invoice Number */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="font-bold text-indigo-600 text-sm tracking-tight">
                                                    {inv.invoice_number}
                                                </span>
                                            </td>

                                            {/* Customer */}
                                            <td className="py-3.5 px-4 max-w-[200px]">
                                                <div className="text-sm font-semibold text-slate-900 truncate" title={inv.customer_name}>
                                                    {inv.customer_name}
                                                </div>
                                            </td>

                                            {/* Products & Delivered Quantities */}
                                            <td className="py-3.5 px-4 max-w-[320px]">
                                                {inv.orders && inv.orders.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {inv.orders.map((ord, oIdx) => (
                                                            <div key={ord.id || oIdx} className="flex items-center justify-between gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                                                <span className="text-xs font-semibold text-slate-800 truncate" title={ord.product_name}>
                                                                    {ord.product_name}
                                                                </span>
                                                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0 whitespace-nowrap">
                                                                    {Number(ord.qty_delivered || ord.quantity || 0).toLocaleString()} pcs
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Zoho line items</span>
                                                )}
                                            </td>

                                            {/* Company */}
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    <Building2 className="w-3 h-3 text-slate-500" />
                                                    {inv.company}
                                                </span>
                                            </td>

                                            {/* Total Amount */}
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-slate-900 text-sm">
                                                ₹{Number(inv.total_amount || 0).toLocaleString()}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    inv.status === 'paid'
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        : inv.status === 'draft'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                }`}>
                                                    {inv.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* 1. View Invoice */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewInvoice(inv)}
                                                        disabled={isViewing}
                                                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all cursor-pointer"
                                                        title="View Invoice in Zoho Books"
                                                    >
                                                        {isViewing ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <Eye className="w-4 h-4" />}
                                                    </button>

                                                    {/* 2. Download Dispatch Package (3 Invoices + COAs) */}
                                                    {inv.pdf_available ? (
                                                        <a
                                                            href={inv.pdf_url}
                                                            download={`Dispatch_Documents_${inv.invoice_number}.pdf`}
                                                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition-all cursor-pointer inline-flex items-center"
                                                            title="Download Unified PDF (3 Invoices + COAs)"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => alert(`Unified PDF has not been generated yet for ${inv.invoice_number}. You can generate it by clicking Generate Documents on the Orders page.`)}
                                                            className="p-1.5 text-slate-300 border border-slate-200 rounded-lg cursor-not-allowed opacity-50"
                                                            title="Unified PDF not yet generated"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {/* 3. Email Invoice & COAs */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setEmailModalInvoice(inv)}
                                                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-all cursor-pointer"
                                                        title="Email Invoice & COAs to Customer"
                                                    >
                                                        <Mail className="w-4 h-4" />
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
