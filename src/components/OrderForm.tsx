'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order, Product } from '@/types';
import { Loader2, Save, X, ShoppingCart, Calendar, Printer, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

type Props = {
    initialData?: Order | null;
    productId?: string | null;
};

export default function OrderForm({ initialData, productId: initialProductId }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = initialProductId || searchParams.get('product_id');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);

    const [formData, setFormData] = useState<Partial<Order>>(
        initialData || {
            order_id: '',
            product_id: productId || '',
            quantity: 0,
            status: 'Pending',
            progress: 'Paper',
            delivery_date: '',
            printer_name: '',
            total_print_qty: 0,
            // Add other fields as needed
        }
    );

    useEffect(() => {
        if (productId) {
            fetchProduct(productId);
        }
    }, [productId]);

    async function fetchProduct(id: string) {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            setProduct(data);
            setFormData(prev => ({ ...prev, product_id: data.id }));
        }
        setLoading(false);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : 0 }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (initialData?.id) {
                const { error } = await supabase.from('orders').update(formData).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('orders').insert([formData]);
                if (error) throw error;
            }
            router.refresh();
            router.push('/orders');
        } catch (error) {
            console.error('Error saving order:', error);
            alert('Failed to save order.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-4xl mx-auto">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {initialData ? 'Edit Order' : 'New Order'}
                    {product && <span className="text-sm font-normal text-slate-500 ml-2">for {product.product_name}</span>}
                    <span className="text-[9px] text-slate-400 font-mono ml-2 border border-slate-200 bg-slate-50 px-1 rounded">v11:07 Form</span>
                </h2>
                <Link href="/orders" className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Info (Read Only) */}
                {product && (
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Product Details</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><span className="text-slate-500">Name:</span> {product.product_name}</div>
                            <div><span className="text-slate-500">SKU:</span> {product.sku}</div>
                            <div><span className="text-slate-500">Code:</span> {product.artwork_code}</div>
                            <div><span className="text-slate-500">UPS:</span> {product.ups}</div>
                        </div>
                    </div>
                )}

                <div>
                    <label className="label">Order ID / Job No</label>
                    <input name="order_id" value={formData.order_id || ''} onChange={handleChange} className="input-field" required />
                </div>

                <div>
                    <label className="label">Quantity</label>
                    <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleNumberChange} className="input-field" required />
                </div>

                <div>
                    <label className="label">Process / Progress</label>
                    <select name="progress" value={formData.progress || ''} onChange={handleChange} className="input-field">
                        {['Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="label">Status</label>
                    <select name="status" value={formData.status || ''} onChange={handleChange} className="input-field">
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>

                <div>
                    <label className="label">Delivery Date</label>
                    <input type="date" name="delivery_date" value={formData.delivery_date || ''} onChange={handleChange} className="input-field" />
                </div>

                <div>
                    <label className="label">Printer Name</label>
                    <input name="printer_name" value={formData.printer_name || ''} onChange={handleChange} className="input-field" />
                </div>

                <div>
                    <label className="label">Total Print Qty</label>
                    <input type="number" name="total_print_qty" value={formData.total_print_qty || ''} onChange={handleNumberChange} className="input-field" />
                </div>

                {/* Potentially many more fields based on types/index.ts */}
            </div>

            <div className="flex justify-end pt-5">
                <Link href="/orders" className="btn-secondary mr-3">Cancel</Link>
                <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Order</>}
                </button>
            </div>

            <style jsx>{`
                .label { font-size: 0.875rem; font-weight: 500; color: #334155; display: block; margin-bottom: 0.25rem; }
                .input-field { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #cbd5e1; padding: 0.5rem; font-size: 0.875rem; }
                .input-field:focus { border-color: #6366f1; outline: 2px solid #6366f1; }
                .btn-primary { display: inline-flex; justify-content: center; border-radius: 0.375rem; background-color: #4f46e5; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: white; }
                .btn-primary:hover { background-color: #4338ca; }
                .btn-secondary { border-radius: 0.375rem; border: 1px solid #cbd5e1; background-color: white; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #334155; }
                .btn-secondary:hover { background-color: #f8fafc; }
            `}</style>
        </form>
    );
}
