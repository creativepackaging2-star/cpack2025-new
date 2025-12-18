'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order, Product } from '@/types';
import { Loader2, Save, X, FileText, CheckCircle, Truck, User, DollarSign, Settings, Layers, Image as ImageIcon, Link as LinkIcon, Edit3, Search } from 'lucide-react';
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
        <form onSubmit={handleSubmit} className="premium-form max-w-7xl mx-auto mb-20 space-y-8">
            {/* --- HEADER SECTION --- */}
            <div className="flex justify-between items-end border-b border-slate-200 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                        {initialData ? 'Update Order' : 'Precision Booking'}
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">
                        Manufacturing Logistics System <span className="text-indigo-600">v15:10 Premium</span>
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link href="/orders" className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all active:scale-90"><X className="w-6 h-6" /></Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* --- LEFT: MAIN FORM CONTENT --- */}
                <div className="lg:col-span-8 space-y-8">

                    {/* 1. PRODUCT SELECTION CARD */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                        <SectionHeader icon={Search} title="Inventory Linkage" />
                        <div className="relative mt-2">
                            <input
                                type="text"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-lg font-bold placeholder:text-slate-300 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                placeholder="Search by Product Name, Code, or SKU..."
                                value={productSearch || (product?.product_name || '')}
                                onChange={(e) => {
                                    setProductSearch(e.target.value);
                                    setShowProductDropdown(true);
                                }}
                                onFocus={() => setShowProductDropdown(true)}
                            />
                            {showProductDropdown && filteredProducts.length > 0 && (
                                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                    {filteredProducts.map(p => (
                                        <div
                                            key={p.id}
                                            className="px-6 py-4 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 group/item transition-colors"
                                            onClick={() => {
                                                setProductSearch(p.product_name);
                                                setShowProductDropdown(false);
                                                fetchProduct(p.id);
                                            }}
                                        >
                                            <div className="text-sm font-black text-slate-800 group-hover/item:text-indigo-700 uppercase tracking-tight">{p.product_name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold flex gap-4 mt-1">
                                                <span>CODE: {p.artwork_code}</span>
                                                <span className="text-indigo-400">SKU: {p.sku}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. CORE LOGISTICS CARD */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SectionHeader icon={Layers} title="Order Parameters" />
                        <div className="md:col-span-1">
                            <label className="premium-label">Job Identifier</label>
                            <input name="order_id" value={formData.order_id || ''} onChange={handleChange} className="premium-input font-black uppercase text-indigo-700" placeholder="e.g. CP-901" required />
                        </div>
                        <div className="md:col-span-1">
                            <label className="premium-label">Production Goal</label>
                            <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleNumberChange} className="premium-input font-black text-lg bg-indigo-50/50 border-indigo-100" placeholder="0" required />
                        </div>
                        <div className="md:col-span-1">
                            <label className="premium-label">Batch Designation</label>
                            <input name="batch_no" value={formData.batch_no || ''} onChange={handleChange} className="premium-input font-bold" />
                        </div>

                        <div>
                            <label className="premium-label">Booking Date</label>
                            <input type="date" name="order_date" value={formData.order_date || ''} onChange={handleChange} className="premium-input font-medium" />
                        </div>
                        <div>
                            <label className="premium-label">Current Status</label>
                            <select name="status" value={formData.status || ''} onChange={handleChange} className="premium-input font-bold">
                                <option value="In Production">In Production</option>
                                <option value="Complete">Complete</option>
                                <option value="Hold">On Hold</option>
                            </select>
                        </div>
                        <div>
                            <label className="premium-label">Active Stage</label>
                            <select name="progress" value={formData.progress || ''} onChange={handleChange} className="premium-input font-bold text-indigo-600">
                                {['Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Emboss', 'Punching', 'Pasting', 'Ready'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 3. CALCULATIONS & FORMULAS CARD */}
                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
                        <SectionHeader icon={Settings} title="Manufacturing Intelligence" className="text-slate-400 border-slate-800" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base Rate</span>
                                <div className="text-xl font-mono flex items-center gap-2">
                                    <span className="text-slate-600 text-sm">₹</span>
                                    <input type="number" step="0.01" name="rate" value={formData.rate || ''} onChange={handleNumberChange} className="bg-transparent border-b border-slate-700 focus:border-indigo-500 outline-none w-full py-1 font-black" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Net Value</span>
                                <div className="text-2xl font-black tabular-nums text-emerald-400">₹{formData.value?.toLocaleString() || '0'}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Print Load</span>
                                <div className="text-2xl font-black tabular-nums">{formData.total_print_qty?.toLocaleString() || '0'} <span className="text-[10px] text-slate-500 font-bold">IMP</span></div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Paper Req.</span>
                                <div className="text-2xl font-black tabular-nums text-indigo-400">{formData.paper_required?.toLocaleString() || '0'} <span className="text-[10px] text-slate-500 font-bold">SHT</span></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-800">
                            <div>
                                <label className="premium-label text-slate-500">Extra Allowance</label>
                                <input type="number" name="extra" value={formData.extra || 0} onChange={handleNumberChange} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm font-bold focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="premium-label text-slate-500">Paper UPS</label>
                                <input type="number" name="paper_ups" value={formData.paper_ups || 1} onChange={handleNumberChange} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm font-bold focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="premium-label text-slate-500">Billed Logic</label>
                                <select name="billed" value={String(formData.billed)} onChange={handleChange} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm font-bold focus:border-indigo-500 outline-none">
                                    <option value="false">Non-Billed</option>
                                    <option value="true">Professional Billing</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 4. TECHNICAL SNAPSHOT CARD */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative group">
                        <div className="absolute top-0 right-0 p-4">
                            <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest border border-indigo-100 px-2 py-1 rounded-full">Archive Snapshot</span>
                        </div>
                        <SectionHeader icon={FileText} title="Manufacturing Specifications" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6 mt-4">
                            {[
                                { label: 'Client', name: 'customer_name' },
                                { label: 'Fiber/GSM', name: 'gsm_value' },
                                { label: 'Paper Grade', name: 'paper_type_name' },
                                { label: 'Dimensions', name: 'dimension' },
                                { label: 'Chromatics (Ink)', name: 'ink' },
                                { label: 'Surface Coating', name: 'coating' },
                                { label: 'Matrix (Plate)', name: 'plate_no' },
                                { label: 'Specialized FX', name: 'special_effects' },
                                { label: 'Fixation (Pasting)', name: 'pasting_type' }
                            ].map(field => (
                                <div key={field.name}>
                                    <label className="premium-label text-[10px]">{field.label}</label>
                                    <input name={field.name} value={(formData as any)[field.name] || ''} onChange={handleChange} className="w-full border-b-2 border-slate-100 py-1 font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all text-sm uppercase" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: SIDEBAR ASSETS --- */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                            <ImageIcon size={200} />
                        </div>

                        <SectionHeader icon={LinkIcon} title="Digital Assets" className="text-indigo-200 border-indigo-500/30" />

                        {product?.product_image && (
                            <div className="mb-8 rounded-3xl overflow-hidden bg-white p-2 shadow-inner">
                                <img src={`/uploads/${product.product_image}`} alt="Reference" className="w-full h-56 object-contain rounded-2xl" />
                            </div>
                        )}

                        <div className="space-y-6 relative z-10">
                            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest block mb-2">Internal SKU Control</span>
                                <span className="text-xl font-mono font-black tracking-tighter">{product?.sku || 'PENDING'}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {product?.artwork_pdf && (
                                    <a href={`/uploads/${product.artwork_pdf}`} target="_blank" className="flex items-center justify-between bg-white text-indigo-900 p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg active:scale-95">
                                        View Master PDF <FileText className="w-4 h-4 text-red-500" />
                                    </a>
                                )}
                                {product?.artwork_cdr && (
                                    <a href={`/uploads/${product.artwork_cdr}`} download className="flex items-center justify-between bg-white/10 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 active:scale-95">
                                        Source CDR Link <Edit3 className="w-4 h-4 text-blue-300" />
                                    </a>
                                )}
                            </div>

                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-6">
                                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest block mb-3">Supply Chain Partners</span>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] text-white/50 block font-bold">PRIMARY PRINTER</label>
                                        <input name="printer_name" value={formData.printer_name || ''} onChange={handleChange} className="bg-transparent border-b border-indigo-400/30 w-full py-1 text-sm font-bold focus:border-white outline-none" placeholder="Not Assigned" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-white/50 block font-bold">PAPER VENDOR</label>
                                        <input name="paperwala_name" value={formData.paperwala_name || ''} onChange={handleChange} className="bg-transparent border-b border-indigo-400/30 w-full py-1 text-sm font-bold focus:border-white outline-none" placeholder="Not Assigned" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ACTION FOOTER --- */}
            <div className="pt-10 flex justify-end items-center gap-6 border-t-2 border-slate-100">
                <Link href="/orders" className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 px-6 transition-all">Discard Changes</Link>
                <button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all flex items-center gap-3"
                >
                    {saving ? <> <Loader2 className="animate-spin" /> COMMITTING...</> : <> <CheckCircle /> Finalize Order </>}
                </button>
            </div>

            <style jsx>{`
                .premium-label { font-size: 0.625rem; font-weight: 800; color: #94a3b8; display: block; margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.1em; }
                .premium-input { display: block; width: 100%; border-radius: 1rem; border: 2px solid #f1f5f9; padding: 0.75rem 1rem; font-size: 0.875rem; background-color: #f8fafc; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #1e293b; }
                .premium-input:focus { border-color: #6366f1; background-color: #fff; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.1); outline: none; }
            `}</style>
        </form>
    );
}
