'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order, Product } from '@/types';
import { Loader2, Save, X, FileText, CheckCircle, Truck, User, DollarSign, Settings, Layers, Image as ImageIcon, Link as LinkIcon, Edit3 } from 'lucide-react';
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
    const [product, setProduct] = useState<any>(null);
    const [productList, setProductList] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    const [formData, setFormData] = useState<Partial<Order>>(
        initialData || {
            order_id: '',
            product_id: productId || '',
            quantity: 0,
            status: 'In Production',
            progress: 'Paper',
            order_date: new Date().toISOString().split('T')[0],
            printer_name: '',
            printer_mobile: '',
            paperwala_name: '',
            paperwala_mobile: '',
            rate: 0,
            value: 0,
            gross_print_qty: 0,
            paper_ups: 1,
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
            from_our_company: 'Packaging',
            billed: 'false' as any,
            shade_card: '',
            automation: '',
            file_no: '',
            folding_dimension: '',
            // Snapshot fields
            customer_name: '',
            paper_type_name: '',
            gsm_value: '',
            print_size: '',
            dimension: '',
            ink: '',
            plate_no: '',
            coating: '',
            special_effects: '',
            pasting_type: '',
            construction_type: '',
            specification: '',
            artwork_code: '',
            delivery_address: '',
            artwork_pdf: '',
            artwork_cdr: ''
        }
    );

    useEffect(() => {
        fetchProductList();
        if (productId) {
            fetchProduct(productId);
        }
    }, [productId]);

    async function fetchProductList() {
        const { data, error } = await supabase
            .from('products')
            .select('id, product_name, artwork_code, sku')
            .order('product_name');
        if (data) setProductList(data);
    }

    const filteredProducts = useMemo(() => {
        if (!productSearch) return productList;
        const s = productSearch.toLowerCase();
        return productList.filter(p =>
            p.product_name?.toLowerCase().includes(s) ||
            p.artwork_code?.toLowerCase().includes(s) ||
            p.sku?.toLowerCase().includes(s)
        ).slice(0, 10);
    }, [productList, productSearch]);

    async function fetchProduct(id: string) {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                customer:customer_id(name),
                category:category_id(name),
                paper_type:paper_type_id(name),
                gsm:gsm_id(name),
                size:size_id(name),
                construction:construction_id(name),
                specification:specification_id(name),
                pasting:pasting_id(name),
                delivery_address:delivery_address_id(address)
            `)
            .eq('id', id)
            .single();

        if (data) {
            setProduct(data);
            setFormData(prev => ({
                ...prev,
                product_id: data.id,
                // Snapshot values from linked product
                customer_name: prev.customer_name || data.customer?.name || '',
                paper_type_name: prev.paper_type_name || data.paper_type?.name || '',
                gsm_value: prev.gsm_value || data.gsm?.name || '',
                print_size: prev.print_size || data.size?.name || '',
                dimension: prev.dimension || data.dimension || '',
                ink: prev.ink || data.ink || '',
                plate_no: prev.plate_no || data.plate_no || '',
                coating: prev.coating || data.coating || '',
                special_effects: prev.special_effects || data.special_effects || '',
                pasting_type: prev.pasting_type || data.pasting?.name || '',
                construction_type: prev.construction_type || data.construction?.name || '',
                specification: prev.specification || data.specification?.name || '',
                artwork_code: prev.artwork_code || data.artwork_code || '',
                delivery_address: prev.delivery_address || data.delivery_address?.address || '',
                artwork_pdf: prev.artwork_pdf || data.artwork_pdf || '',
                artwork_cdr: prev.artwork_cdr || data.artwork_cdr || '',
                // Auto-generate Batch No
                batch_no: prev.batch_no || generateBatchNo(data)
            }));
        }
        setLoading(false);
    }

    const generateBatchNo = (prod: any) => {
        if (!prod) return '';
        const name = (prod.product_name || '').replace(/\s+/g, '').substring(0, 6).toUpperCase();
        const cat = (prod.category?.name || 'X').substring(0, 1).toUpperCase();
        return `${name}${cat}`;
    };

    // --- Manufacturing Formulas ---

    useEffect(() => {
        const qty = parseFloat(String(formData.quantity)) || 0;
        const rate = parseFloat(String(formData.rate)) || 0;
        const ups = parseFloat(String(product?.ups)) || 1;
        const extra = parseFloat(String(formData.extra)) || 0;
        const paperUps = parseFloat(String(formData.paper_ups)) || 1;

        const value = parseFloat((qty * rate).toFixed(2));
        const grossPrint = Math.ceil(qty / ups);
        const totalPrint = Math.ceil(grossPrint + extra);
        const paperReq = Math.ceil(totalPrint / paperUps);

        setFormData(prev => {
            const updates: any = {};
            if (prev.value !== value) updates.value = value;
            if (prev.gross_print_qty !== grossPrint) updates.gross_print_qty = grossPrint;
            if (prev.total_print_qty !== totalPrint) updates.total_print_qty = totalPrint;
            if (prev.paper_required !== paperReq) updates.paper_required = paperReq;

            if (Object.keys(updates).length > 0) {
                return { ...prev, ...updates };
            }
            return prev;
        });
    }, [formData.quantity, formData.rate, formData.extra, formData.paper_ups, product?.ups]);

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
            const numFields = ['quantity', 'rate', 'value', 'gross_print_qty', 'paper_ups', 'total_print_qty', 'extra', 'paper_required', 'paper_order_qty', 'qty_delivered'];
            numFields.forEach(f => {
                const val = (payload as any)[f];
                if (val !== undefined && val !== null && val !== '') {
                    (payload as any)[f] = parseFloat(val) || 0;
                }
            });

            if (payload.billed === 'true') (payload as any).billed = true;
            else if (payload.billed === 'false') (payload as any).billed = false;

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

    const SectionHeader = ({ icon: Icon, title, className = "" }: { icon: any, title: string, className?: string }) => (
        <div className={`flex items-center gap-2 border-b border-slate-100 pb-2 mt-4 mb-4 col-span-full ${className}`}>
            <Icon className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
        </div>
    );

    if (loading) return <div className="p-20 flex flex-col items-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /><span className="text-slate-500 font-medium">Fetching Product Details...</span></div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 md:p-10 rounded-2xl border border-slate-200 shadow-xl max-w-7xl mx-auto mb-20">
            <div className="border-b border-slate-100 pb-6 flex justify-between items-center">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        {initialData ? 'Update Order' : 'Create New Order'}
                        <span className="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-tighter">v14:53 Advanced-Snapshot</span>
                    </h2>
                    {product && <p className="text-sm text-slate-500 font-medium italic">Configuring for product: <span className="text-indigo-600 font-bold underline decoration-indigo-200">{product.product_name}</span></p>}
                </div>
                <Link href="/orders" className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="h-6 w-6" /></Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* 1. Core Order Inputs */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">

                    <SectionHeader icon={FileText} title="Product Selection" />
                    <div className="lg:col-span-12 relative">
                        <label className="label">Select Product (Search by Name, Code or SKU)</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="input-field border-indigo-200 bg-white"
                                placeholder="Start typing product name..."
                                value={productSearch || (product?.product_name || '')}
                                onChange={(e) => {
                                    setProductSearch(e.target.value);
                                    setShowProductDropdown(true);
                                }}
                                onFocus={() => setShowProductDropdown(true)}
                            />
                            {showProductDropdown && filteredProducts.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                    {filteredProducts.map(p => (
                                        <div
                                            key={p.id}
                                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0"
                                            onClick={() => {
                                                setProductSearch(p.product_name);
                                                setShowProductDropdown(false);
                                                fetchProduct(p.id);
                                            }}
                                        >
                                            <div className="text-sm font-bold text-slate-800">{p.product_name}</div>
                                            <div className="text-[10px] text-slate-500 flex gap-2">
                                                <span>Code: {p.artwork_code}</span>
                                                <span>SKU: {p.sku}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <SectionHeader icon={Layers} title="Order Details" />
                    <div>
                        <label className="label">Order ID / Job No</label>
                        <input name="order_id" value={formData.order_id || ''} onChange={handleChange} className="input-field" placeholder="JOB-001" required />
                    </div>
                    <div>
                        <label className="label">Order Date</label>
                        <input type="date" name="order_date" value={formData.order_date || ''} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Quantity</label>
                        <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleNumberChange} className="input-field border-indigo-100 bg-indigo-50/20" required />
                    </div>
                    <div>
                        <label className="label">Status</label>
                        <select name="status" value={formData.status || ''} onChange={handleChange} className="input-field font-bold">
                            <option value="In Production">⚙️ In Production</option>
                            <option value="Complete">✅ Complete</option>
                            <option value="Hold">🛑 Hold</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Manufacturing Stage</label>
                        <select name="progress" value={formData.progress || ''} onChange={handleChange} className="input-field font-medium text-indigo-700">
                            {['Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Emboss', 'Punching', 'Pasting', 'Ready'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Batch / Lot No</label>
                        <input name="batch_no" value={formData.batch_no || ''} onChange={handleChange} className="input-field font-bold text-indigo-600" />
                    </div>

                    <SectionHeader icon={DollarSign} title="Costs & Values" />
                    <div>
                        <label className="label">Rate (₹)</label>
                        <input type="number" step="0.01" name="rate" value={formData.rate || ''} onChange={handleNumberChange} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Total Value (Auto)</label>
                        <input type="number" value={formData.value || 0} readOnly className="input-field bg-slate-100/50 font-bold" />
                    </div>
                    <div>
                        <label className="label">Billed Status</label>
                        <select name="billed" value={String(formData.billed)} onChange={handleChange} className="input-field">
                            <option value="false">Non-Billed</option>
                            <option value="true">Billed</option>
                        </select>
                    </div>

                    <SectionHeader icon={Layers} title="Manufacturing Formulas" />
                    <div>
                        <label className="label">Gross Print Qty</label>
                        <input type="number" value={formData.gross_print_qty || 0} readOnly className="input-field bg-slate-100/50" />
                    </div>
                    <div>
                        <label className="label">Extra Allowance</label>
                        <input type="number" name="extra" value={formData.extra || 0} onChange={handleNumberChange} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Total Print Qty</label>
                        <input type="number" value={formData.total_print_qty || 0} readOnly className="input-field bg-indigo-50 font-bold text-indigo-600" />
                    </div>
                    <div>
                        <label className="label">Paper UPS</label>
                        <input type="number" name="paper_ups" value={formData.paper_ups || 1} onChange={handleNumberChange} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Required Sheets</label>
                        <input type="number" value={formData.paper_required || 0} readOnly className="input-field bg-slate-100/50 font-bold" />
                    </div>
                    <div>
                        <label className="label">Paper Order Qty</label>
                        <input type="number" name="paper_order_qty" value={formData.paper_order_qty || 0} onChange={handleNumberChange} className="input-field" />
                    </div>

                    <SectionHeader icon={Settings} title="Product Specification Snapshot" />
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                        <div>
                            <label className="label">Customer</label>
                            <input name="customer_name" value={formData.customer_name || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                        <div>
                            <label className="label">GSM</label>
                            <input name="gsm_value" value={formData.gsm_value || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                        <div>
                            <label className="label">Paper Type</label>
                            <input name="paper_type_name" value={formData.paper_type_name || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                        <div>
                            <label className="label">Dimension</label>
                            <input name="dimension" value={formData.dimension || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                        <div>
                            <label className="label">Ink</label>
                            <input name="ink" value={formData.ink || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                        <div>
                            <label className="label">Coating</label>
                            <input name="coating" value={formData.coating || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                        <div>
                            <label className="label">Plate No</label>
                            <input name="plate_no" value={formData.plate_no || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                        <div>
                            <label className="label">Special Effects</label>
                            <input name="special_effects" value={formData.special_effects || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                        <div>
                            <label className="label">Pasting</label>
                            <input name="pasting_type" value={formData.pasting_type || ''} onChange={handleChange} className="input-field bg-white" />
                        </div>
                    </div>

                    <SectionHeader icon={Truck} title="Partners & Logistics" />
                    <div>
                        <label className="label">Printer</label>
                        <input name="printer_name" value={formData.printer_name || ''} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                        <label className="label">Paper Wala</label>
                        <input name="paperwala_name" value={formData.paperwala_name || ''} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                        <label className="label">From Company</label>
                        <select name="from_our_company" value={formData.from_our_company || ''} onChange={handleChange} className="input-field">
                            <option value="Printers">Printers</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Enterprise">Enterprise</option>
                        </select>
                    </div>
                </div>

                {/* Right Column: Assets & Reference */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl sticky top-6">
                        <SectionHeader icon={LinkIcon} title="Live Product Reference" className="border-indigo-800/50 text-indigo-200" />

                        {product?.product_image && (
                            <div className="mb-6 rounded-xl overflow-hidden bg-white/10 backdrop-blur-md p-2 border border-white/20">
                                <img src={`/uploads/${product.product_image}`} alt="Product" className="w-full h-48 object-contain" />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Artwork Code</span>
                                <span className="text-sm font-mono bg-black/20 p-2 rounded-lg border border-white/10">{product?.artwork_code || '---'}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 mt-6">
                                {product?.artwork_pdf && (
                                    <a href={`/uploads/${product.artwork_pdf}`} target="_blank" className="flex items-center justify-between group bg-white/10 hover:bg-white/20 p-3 rounded-xl border border-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <FileText className="text-red-400" />
                                            <span className="text-xs font-bold uppercase">Artwork PDF</span>
                                        </div>
                                        <LinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                                {product?.artwork_cdr && (
                                    <a href={`/uploads/${product.artwork_cdr}`} download className="flex items-center justify-between group bg-white/10 hover:bg-white/20 p-3 rounded-xl border border-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <Edit3 className="text-blue-400" />
                                            <span className="text-xs font-bold uppercase">Source CDR</span>
                                        </div>
                                        <LinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-10 gap-4 border-t border-slate-100">
                <Link href="/orders" className="btn-secondary">Discard Changes</Link>
                <button type="submit" disabled={saving} className="btn-primary min-w-[200px]">
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Recording Order...
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
                .label { font-size: 0.65rem; font-weight: 800; color: #64748b; display: block; margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.075em; }
                .input-field { display: block; width: 100%; border-radius: 0.75rem; border: 1.5px solid #f1f5f9; padding: 0.625rem 0.875rem; font-size: 0.875rem; background-color: #f8fafc; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); color: #0f172a; }
                .input-field:focus { border-color: #6366f1; background-color: #fff; box-shadow: 0 4px 12px -4px rgba(99, 102, 241, 0.15); outline: none; }
                .btn-primary { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.875rem; background-color: #4f46e5; padding: 0.75rem 1.75rem; font-size: 0.9375rem; font-weight: 700; color: white; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); transition: all 0.3s; }
                .btn-primary:hover { background-color: #4338ca; transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.35); }
                .btn-primary:active { transform: translateY(0); }
                .btn-secondary { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.875rem; border: 1.5px solid #e2e8f0; background-color: white; padding: 0.75rem 1.75rem; font-size: 0.9375rem; font-weight: 600; color: #64748b; transition: all 0.2s; }
                .btn-secondary:hover { background-color: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
            `}</style>
        </form>
    );
}
