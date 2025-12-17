'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Product } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Loader2, Plus, Edit2, Eye, ShoppingCart, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const [categories, setCategories] = useState<Record<number, string>>({});
    const [specialEffectsMap, setSpecialEffectsMap] = useState<Record<number, string>>({});

    useEffect(() => {
        fetchResources();
        fetchProducts();
    }, [debouncedSearch]);

    async function fetchResources() {
        // Fetch Categories
        const { data: catData } = await supabase.from('category').select('id, name');
        if (catData) {
            const catMap: Record<number, string> = {};
            catData.forEach((c: any) => { catMap[c.id] = c.name; });
            setCategories(catMap);
        }

        // Fetch Special Effects
        const { data: fxData } = await supabase.from('special_effects').select('id, name');
        if (fxData) {
            const fxMap: Record<number, string> = {};
            fxData.forEach((fx: any) => { fxMap[fx.id] = fx.name; });
            setSpecialEffectsMap(fxMap);
        }
    }

    async function handleDelete(id: string) {
        if (!window.confirm('Are you sure you want to delete this product?')) return;

        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            // Optimistic update or refetch
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete product.');
        }
    }

    async function fetchProducts() {
        setLoading(true);
        try {
            let query = supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (debouncedSearch) {
                // Enhanced Search: Name, SKU, Dimension, Specs (which covers pasting, paper, etc.)
                const term = debouncedSearch.trim();
                query = query.or(`product_name.ilike.%${term}%,sku.ilike.%${term}%,dimension.ilike.%${term}%,specs.ilike.%${term}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching products:', error);
            } else {
                setProducts(data || []);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Products</h2>
                <Link
                    href="/products/new"
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Product
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-0 bg-white py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        placeholder="Search by name, dimension, pasting, specs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Product Info
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Category
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    U
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Specs
                                </th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    CDR/PDF
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                            <span>Loading products...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        {/* 1. Product Info */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                                                    {product.product_image ? (
                                                        <ImageIcon className="h-5 w-5 text-slate-400" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-400">IMG</span>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-slate-900">{product.product_name || 'Unnamed Product'}</div>
                                                    <div className="text-xs text-slate-500">Code: {product.artwork_code || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 2. Category */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                {product.category_id && categories[product.category_id]
                                                    ? categories[product.category_id]
                                                    : `Category ${product.category_id || '-'}`}
                                            </span>
                                        </td>

                                        {/* 2.5. U (Actual GSM) */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {product.actual_gsm_used || '-'}
                                        </td>

                                        {/* 3. Specs */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600 whitespace-pre-wrap">
                                                {product.specs || '-'}
                                            </div>
                                            {/* Dimensions as subtitle if needed, or if not in specs already */}
                                            {(!product.specs || !product.specs.includes(product.dimension || '')) && product.dimension && (
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Dim: {product.dimension}
                                                </div>
                                            )}
                                        </td>

                                        {/* 4. CDR/PDF */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {product.artwork_pdf ? (
                                                    <a
                                                        href={`/uploads/${product.artwork_pdf}`}
                                                        download
                                                        target="_blank"
                                                        className="group relative"
                                                        title={`Download ${product.artwork_pdf}`}
                                                    >
                                                        <FileText className="h-5 w-5 text-red-500 cursor-pointer hover:scale-110 transition-transform" />
                                                        <span className="sr-only">PDF Available</span>
                                                    </a>
                                                ) : <span className="w-5" />}

                                                {product.artwork_cdr ? (
                                                    <a
                                                        href={`/uploads/${product.artwork_cdr}`}
                                                        download
                                                        target="_blank"
                                                        className="group relative"
                                                        title={`Download ${product.artwork_cdr}`}
                                                    >
                                                        <div className="h-5 w-5 rounded bg-amber-500 text-[8px] font-bold text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                                            CDR
                                                        </div>
                                                    </a>
                                                ) : <span className="w-5" />}
                                            </div>
                                        </td>

                                        {/* 5. Action */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/products/${product.id}/edit`}>
                                                    <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors" title="Edit">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                </Link>
                                                <Link href={`/products/${product.id}`}>
                                                    <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors" title="View">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    title="Delete Product"
                                                >
                                                    <Trash2 className="h-4 w-4" />
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
    );
}
