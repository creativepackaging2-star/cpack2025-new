'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Product } from '@/types';
import { Loader2, ArrowLeft, Download, RefreshCw, Upload } from 'lucide-react';
import Link from 'next/link';

export default function AuditPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('product_name', { ascending: true });

        if (error) {
            console.error('Error fetching:', error);
            alert('Error fetching data');
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    };

    const downloadCSV = () => {
        const headers = ['Product Name', 'Artwork Code', 'Special Effects (DB)', 'Specs (DB)', 'Google Drive Value (Check)'];
        const rows = products.map(p => [
            `"${p.product_name || ''}"`,
            `"${p.artwork_code || ''}"`,
            `"${p.special_effects || ''}"`,
            `"${p.specs || ''}"`,
            '' // Empty column for them to fill
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'special_effects_audit.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/products" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">Data Audit: Special Effects</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium text-sm shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%]">
                                    Product Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[10%]">
                                    Code
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-indigo-600 uppercase tracking-wider w-[20%] bg-indigo-50/50">
                                    Special Effects (DB)
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">
                                    Specs (Ref)
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-emerald-600 uppercase tracking-wider w-[20%] bg-emerald-50/50 border-l border-emerald-100">
                                    Google Drive Value
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-500">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Loading audit data...
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product, idx) => (
                                    <tr key={product.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        <td className="px-6 py-3 text-sm font-medium text-slate-900">
                                            {product.product_name}
                                        </td>
                                        <td className="px-6 py-3 text-xs font-mono text-slate-500">
                                            {product.artwork_code}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-indigo-700 font-medium bg-indigo-50/30">
                                            {product.special_effects || <span className="text-slate-400 italic">Null</span>}
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-600 line-clamp-2" title={product.specs || ''}>
                                            {product.specs || '-'}
                                        </td>
                                        <td className="px-6 py-3 text-sm border-l border-emerald-100 bg-emerald-50/30">
                                            {/* Placeholder for visual check */}
                                            <div className="h-6 w-full border-b border-dashed border-emerald-200"></div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
