
'use client';

import { supabase } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Trash2, Edit2, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchQuotations();
    }, []);

    async function fetchQuotations() {
        setLoading(true);
        const { data, error } = await supabase
            .from('quotations')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setQuotations(data);
        setLoading(false);
    }

    const filteredQuotations = quotations.filter(q =>
        q.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string, e: any) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this quotation?')) {
            const { error } = await supabase.from('quotations').delete().eq('id', id);
            if (!error) fetchQuotations();
        }
    };

    return (
        <div className="font-montserrat">
            <PageHeader
                title="Quotations"
                icon={<FileText className="w-6 h-6" />}
                actions={
                    <Link
                        href="/quotations/new"
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        New Quote
                    </Link>
                }
            />

            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-slate-300 bg-slate-50 flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by customer or product..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Quote Details</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-indigo-600 bg-indigo-50/30 font-semibold">Rate / Pc</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Total Amt</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Loading quotations...</td>
                                    </tr>
                                ) : filteredQuotations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">No quotations found.</td>
                                    </tr>
                                ) : (
                                    filteredQuotations.map((q) => (
                                        <tr
                                            key={q.id}
                                            className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-300 last:border-0"
                                            onClick={() => router.push(`/quotations/${q.id}`)}
                                        >
                                            <td className="px-6 py-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{q.product_name || 'Unnamed Job'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono font-bold whitespace-nowrap">
                                                            <Calendar className="w-2.5 h-2.5" />
                                                            {new Date(q.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{q.customer}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2">
                                                <span className="text-sm font-semibold text-slate-700">{q.qty?.toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-2 font-mono bg-indigo-50/10">
                                                <span className="text-sm font-semibold text-indigo-700">₹{q.rate_pcs?.toFixed(4)}</span>
                                            </td>
                                            <td className="px-6 py-2 font-mono">
                                                <span className="text-sm font-medium text-slate-900">₹{q.total_amt?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </td>
                                            <td className="px-6 py-2 text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => router.push(`/quotations/${q.id}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95 shadow-sm border border-transparent hover:border-indigo-100 bg-white">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={(e) => handleDelete(q.id, e)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 shadow-sm border border-transparent hover:border-rose-100 bg-white">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
