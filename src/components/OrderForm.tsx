'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order, Product } from '@/types';
import { Loader2, Save, X, ShoppingCart, Calendar, Printer, FileText, CheckCircle, Truck, User, DollarSign, Settings, Layers } from 'lucide-react';
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
            order_date: new Date().toISOString().split('T')[0], // Default to today
            printer_name: '',
            printer_mobile: '',
            paperwala_name: '',
            paperwala_mobile: '',
            rate: 0,
            value: 0,
            gross_print_qty: 0,
            paper_ups: 0,
            total_print_qty: 0,
            extra: 0,
            paper_order_size: '',
            paper_required: 0,
            paper_order_qty: 0,
            ready_delivery: '',
            invoice_no: '',
            qty_delivered: 0,
            packing_detail: '',
            ready_date: '',
            delivery_date: '',
            batch_no: '',
            from_our_company: 'Print',
            billed: 'false' as any,
            shade_card: '',
            automation: '',
            file_no: '',
            folding_dimension: ''
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
            const payload = { ...formData };
            // Ensure numeric values are numbers
            const numFields = ['quantity', 'rate', 'value', 'gross_print_qty', 'paper_ups', 'total_print_qty', 'extra', 'paper_required', 'paper_order_qty', 'qty_delivered'];
            numFields.forEach(f => {
                const val = (payload as any)[f];
                if (val !== undefined && val !== null && val !== '') {
                    (payload as any)[f] = parseFloat(val) || 0;
                }
            });

            // Handle billed boolean if needed
            if (payload.billed === 'true') (payload as any).billed = true;
            if (payload.billed === 'false') (payload as any).billed = false;

            if (initialData?.id) {
                const { error } = await supabase.from('orders').update(payload).eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('orders').insert([payload]);
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

    const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mt-4 mb-4 col-span-full">
            <Icon className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
        </div>
    );

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-xl max-w-6xl mx-auto mb-20">
            <div className="border-b border-slate-100 pb-6 flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        {initialData ? 'Update Order' : 'Create New Order'}
                        <span className="text-[10px] text-indigo-500 font-mono bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">v12:25 PRO</span>
                    </h2>
                    {product && <p className="text-sm text-slate-500 font-medium italic">Assigning to: <span className="text-indigo-600 font-bold">{product.product_name}</span></p>}
                </div>
                <Link href="/orders" className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="h-6 w-6" /></Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">

                {/* 1. Basic Info */}
                <SectionHeader icon={FileText} title="Order & Product Basics" />
                <div className="lg:col-span-1">
                    <label className="label">Order ID / Job No</label>
                    <input name="order_id" value={formData.order_id || ''} onChange={handleChange} className="input-field" placeholder="JOB-001" required />
                </div>
                <div>
                    <label className="label">Order Date</label>
                    <input type="date" name="order_date" value={formData.order_date || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Order Quantity</label>
                    <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleNumberChange} className="input-field" required />
                </div>
                <div>
                    <label className="label">Status</label>
                    <select name="status" value={formData.status || ''} onChange={handleChange} className="input-field font-bold">
                        <option value="Plan">📋 Plan</option>
                        <option value="Pending">🕒 Pending</option>
                        <option value="Complete">✅ Complete</option>
                    </select>
                </div>
                <div>
                    <label className="label">Manufacturing Stage</label>
                    <select name="progress" value={formData.progress || ''} onChange={handleChange} className="input-field font-medium text-indigo-700">
                        {['Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Personnel */}
                <SectionHeader icon={User} title="Personnel & Logistics" />
                <div>
                    <label className="label">Printer Name</label>
                    <input name="printer_name" value={formData.printer_name || ''} onChange={handleChange} className="input-field" placeholder="Vendor Name" />
                </div>
                <div>
                    <label className="label">Printer Mobile</label>
                    <input name="printer_mobile" value={formData.printer_mobile || ''} onChange={handleChange} className="input-field" placeholder="+91..." />
                </div>
                <div>
                    <label className="label">Paperwala Name</label>
                    <input name="paperwala_name" value={formData.paperwala_name || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Paperwala Mobile</label>
                    <input name="paperwala_mobile" value={formData.paperwala_mobile || ''} onChange={handleChange} className="input-field" />
                </div>

                {/* 3. Financials */}
                <SectionHeader icon={DollarSign} title="Financial Details" />
                <div>
                    <label className="label">Rate (Per Unit)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs">₹</span>
                        <input type="number" step="0.01" name="rate" value={formData.rate || ''} onChange={handleNumberChange} className="input-field pl-6" />
                    </div>
                </div>
                <div>
                    <label className="label">Total Value</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs">₹</span>
                        <input type="number" name="value" value={formData.value || ''} onChange={handleNumberChange} className="input-field pl-6" />
                    </div>
                </div>
                <div>
                    <label className="label">Billed Status</label>
                    <select name="billed" value={String(formData.billed) || 'false'} onChange={handleChange} className="input-field">
                        <option value="true">Yes, Billed</option>
                        <option value="false">No, Not Billed</option>
                    </select>
                </div>

                {/* 4. Production Details */}
                <SectionHeader icon={Layers} title="Paper & Production Specs" />
                <div>
                    <label className="label">Paper Order Size</label>
                    <input name="paper_order_size" value={formData.paper_order_size || ''} onChange={handleChange} className="input-field" placeholder="23 x 36" />
                </div>
                <div>
                    <label className="label">UPS on Paper</label>
                    <input type="number" name="paper_ups" value={formData.paper_ups || ''} onChange={handleNumberChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Sheets Required</label>
                    <input type="number" name="paper_required" value={formData.paper_required || ''} onChange={handleNumberChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Paper Order Qty</label>
                    <input type="number" name="paper_order_qty" value={formData.paper_order_qty || ''} onChange={handleNumberChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Gross Print Qty</label>
                    <input type="number" name="gross_print_qty" value={formData.gross_print_qty || ''} onChange={handleNumberChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Total Print Qty</label>
                    <input type="number" name="total_print_qty" value={formData.total_print_qty || ''} onChange={handleNumberChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Extra Allowance</label>
                    <input type="number" name="extra" value={formData.extra || ''} onChange={handleNumberChange} className="input-field" />
                </div>

                {/* 5. Delivery */}
                <SectionHeader icon={Truck} title="Delivery & Dispatch" />
                <div>
                    <label className="label">Production Date</label>
                    <input type="date" name="ready_date" value={formData.ready_date || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Target Delivery</label>
                    <input type="date" name="delivery_date" value={formData.delivery_date || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Ready Delivery Status</label>
                    <input name="ready_delivery" value={formData.ready_delivery || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Invoice No</label>
                    <input name="invoice_no" value={formData.invoice_no || ''} onChange={handleChange} className="input-field" placeholder="INV-001" />
                </div>
                <div>
                    <label className="label">Qty Delivered</label>
                    <input type="number" name="qty_delivered" value={formData.qty_delivered || ''} onChange={handleNumberChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Batch / Lot No</label>
                    <input name="batch_no" value={formData.batch_no || ''} onChange={handleChange} className="input-field" />
                </div>
                <div className="md:col-span-2 lg:col-span-2">
                    <label className="label">Packing Instructions</label>
                    <textarea name="packing_detail" value={formData.packing_detail || ''} onChange={handleChange} className="input-field h-[42px] min-h-[42px]" />
                </div>

                {/* 6. Files & Extras */}
                <SectionHeader icon={Settings} title="Administrative & Files" />
                <div>
                    <label className="label">Source (Company)</label>
                    <input name="from_our_company" value={formData.from_our_company || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Automation Tag</label>
                    <input name="automation" value={formData.automation || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Office File No</label>
                    <input name="file_no" value={formData.file_no || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Folding Specs</label>
                    <input name="folding_dimension" value={formData.folding_dimension || ''} onChange={handleChange} className="input-field" />
                </div>
                <div>
                    <label className="label">Shade Card Ref</label>
                    <input name="shade_card" value={formData.shade_card || ''} onChange={handleChange} className="input-field" />
                </div>
            </div>

            <div className="flex justify-end pt-10 gap-4 border-t border-slate-100">
                <Link href="/orders" className="btn-secondary">Discard Changes</Link>
                <button type="submit" disabled={saving} className="btn-primary min-w-[200px]">
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-5 w-5" />
                            {initialData ? 'Save Changes' : 'Confirm Order'}
                        </>
                    )}
                </button>
            </div>

            <style jsx>{`
                .label { 
                    font-size: 0.7rem; 
                    font-weight: 700; 
                    color: #475569; 
                    display: block; 
                    margin-bottom: 0.4rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .input-field { 
                    display: block; 
                    width: 100%; 
                    border-radius: 0.75rem; 
                    border: 1.5px solid #f1f5f9; 
                    padding: 0.625rem 0.875rem; 
                    font-size: 0.875rem;
                    background-color: #f8fafc;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    color: #0f172a;
                }
                .input-field:focus { 
                    border-color: #6366f1; 
                    background-color: #fff;
                    box-shadow: 0 4px 12px -4px rgba(99, 102, 241, 0.15);
                    outline: none;
                }
                .input-field::placeholder {
                    color: #94a3b8;
                    opacity: 0.6;
                }
                .btn-primary { 
                    display: inline-flex; 
                    align-items: center;
                    justify-content: center; 
                    border-radius: 0.875rem; 
                    background-color: #4f46e5; 
                    padding: 0.75rem 1.75rem; 
                    font-size: 0.9375rem; 
                    font-weight: 700; 
                    color: white;
                    box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
                    transition: all 0.3s;
                }
                .btn-primary:hover { 
                    background-color: #4338ca;
                    transform: translateY(-2px);
                    box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.35);
                }
                .btn-primary:active {
                    transform: translateY(0);
                }
                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                .btn-secondary { 
                    display: inline-flex; 
                    align-items: center;
                    justify-content: center; 
                    border-radius: 0.875rem; 
                    border: 1.5px solid #e2e8f0; 
                    background-color: white; 
                    padding: 0.75rem 1.75rem; 
                    font-size: 0.9375rem; 
                    font-weight: 600; 
                    color: #64748b;
                    transition: all 0.2s;
                }
                .btn-secondary:hover { 
                    background-color: #f8fafc;
                    color: #0f172a;
                    border-color: #cbd5e1;
                }
            `}</style>
        </form>
    );
}
