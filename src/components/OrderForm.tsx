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
            product_name: '',
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
            remarks: '',
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
        // Auto-generate order_id if new order
        if (!initialData && !formData.order_id) {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 6);
            setFormData(prev => ({ ...prev, order_id: `ORD-${timestamp}-${random}`.toUpperCase() }));
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
                product_name: prev.product_name || data.product_name || '',
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
                specs: prev.specs || data.specs || '',
                ups: prev.ups || data.ups || null,
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
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto mb-20 space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
            {/* --- HEADER SECTION --- */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 uppercase">
                        {initialData ? 'Update Order' : 'New Order Entry'}
                    </h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        System Version v16:00 | {product?.product_name || 'Select Product'}
                    </p>
                </div>
                <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-6 h-6" /></Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* --- MAIN FORM --- */}
                <div className="lg:col-span-8 space-y-10">

                    {/* SECTION 1: PRODUCT & LOGISTICS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <SectionHeader icon={Search} title="Product Selection" />
                        <div className="lg:col-span-2 relative">
                            <label className="label">Product</label>
                            <input
                                type="text"
                                className="input-field border-indigo-100 bg-indigo-50/10 font-bold"
                                placeholder="Search Product..."
                                value={productSearch || (product?.product_name || '')}
                                onChange={(e) => {
                                    setProductSearch(e.target.value);
                                    setShowProductDropdown(true);
                                }}
                                onFocus={() => setShowProductDropdown(true)}
                                readOnly={!!initialData}
                            />
                            {!initialData && showProductDropdown && filteredProducts.length > 0 && (
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
                                            <div className="text-[10px] text-slate-400">SKU: {p.sku} | Code: {p.artwork_code}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <SectionHeader icon={Layers} title="Core Details" />
                        <input type="hidden" name="order_id" value={formData.order_id || ''} />
                        <div>
                            <label className="label">order date</label>
                            <input type="date" name="order_date" value={formData.order_date || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">progress</label>
                            <select name="progress" value={formData.progress || ''} onChange={handleChange} className="input-field font-bold">
                                {['Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Status</label>
                            <select name="status" value={formData.status || ''} onChange={handleChange} className="input-field font-black">
                                <option value="In Production">In Production</option>
                                <option value="Complete">Complete</option>
                                <option value="Hold">Hold</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">from our co.</label>
                            <select name="from_our_company" value={formData.from_our_company || ''} onChange={handleChange} className="input-field">
                                <option value="">Select...</option>
                                <option value="Printers">Printers</option>
                                <option value="Packaging">Packaging</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Batch No</label>
                            <input name="batch_no" value={formData.batch_no || ''} onChange={handleChange} className="input-field" />
                        </div>

                        <SectionHeader icon={Truck} title="Partners" />
                        <div>
                            <label className="label">printer</label>
                            <input name="printer_name" value={formData.printer_name || ''} onChange={handleChange} className="input-field" placeholder="Printer Table" />
                        </div>
                        <div>
                            <label className="label">printer mobile</label>
                            <input name="printer_mobile" value={formData.printer_mobile || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">paperwala</label>
                            <input name="paperwala_name" value={formData.paperwala_name || ''} onChange={handleChange} className="input-field" placeholder="Paper Wala Table" />
                        </div>
                        <div>
                            <label className="label">paperwala mbile</label>
                            <input name="paperwala_mobile" value={formData.paperwala_mobile || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="lg:col-span-1"></div>

                        <SectionHeader icon={DollarSign} title="Numbers & Calculations" />
                        <div>
                            <label className="label font-black text-indigo-600">QTY</label>
                            <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleNumberChange} className="input-field border-indigo-200 bg-indigo-50/50" required />
                        </div>
                        <div>
                            <label className="label">Rate</label>
                            <input type="number" step="0.01" name="rate" value={formData.rate || ''} onChange={handleNumberChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Value (QTY X RATE)</label>
                            <input type="number" value={formData.value || 0} readOnly className="input-field bg-slate-50 font-black text-emerald-600" />
                        </div>

                        <div>
                            <label className="label">Gross Print Qty</label>
                            <input type="number" value={formData.gross_print_qty || 0} readOnly className="input-field bg-slate-50" />
                        </div>
                        <div>
                            <label className="label">Extra</label>
                            <input type="number" name="extra" value={formData.extra || 0} onChange={handleNumberChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Total Print Qty</label>
                            <input type="number" value={formData.total_print_qty || 0} readOnly className="input-field bg-slate-50 font-bold" />
                        </div>

                        <div>
                            <label className="label">paper ups</label>
                            <input type="number" name="paper_ups" value={formData.paper_ups || 1} onChange={handleNumberChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">paper required</label>
                            <input type="number" value={formData.paper_required || 0} readOnly className="input-field bg-slate-50 font-bold" />
                        </div>
                        <div>
                            <label className="label">Paper ord qty</label>
                            <input type="number" name="paper_order_qty" value={formData.paper_order_qty || 0} onChange={handleNumberChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">paper order size</label>
                            <input name="paper_order_size" value={formData.paper_order_size || ''} onChange={handleChange} className="input-field" placeholder="Dropdown table size" />
                        </div>

                        <SectionHeader icon={FileText} title="Invoicing & Delivery" />
                        <div>
                            <label className="label">Inv No</label>
                            <input name="invoice_no" value={formData.invoice_no || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Qty Delivered</label>
                            <input type="number" name="qty_delivered" value={formData.qty_delivered || ''} onChange={handleNumberChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Delivery Date</label>
                            <input type="date" name="delivery_date" value={formData.delivery_date || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Ready Date</label>
                            <input type="date" name="ready_date" value={formData.ready_date || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Ready/Delivery</label>
                            <input name="ready_delivery" value={formData.ready_delivery || ''} onChange={handleChange} className="input-field" placeholder="Status of readiness" />
                        </div>

                        <SectionHeader icon={Edit3} title="Production & Dispatch Detail" />
                        <div>
                            <label className="label">Packing Detail</label>
                            <input name="packing_detail" value={formData.packing_detail || ''} onChange={handleChange} className="input-field" placeholder="e.g. 100/box" />
                        </div>
                        <div>
                            <label className="label">Automation</label>
                            <input name="automation" value={formData.automation || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">File No</label>
                            <input name="file_no" value={formData.file_no || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Shade Card</label>
                            <input name="shade_card" value={formData.shade_card || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="label">Remarks / Comments</label>
                            <textarea name="remarks" value={(formData as any).remarks || ''} onChange={handleChange} className="input-field h-10 min-h-[40px] py-2" placeholder="Any additional instructions..." />
                        </div>

                        <SectionHeader icon={Edit3} title="Product Snapshots" />
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 bg-slate-50 p-6 rounded-xl border border-slate-100 italic text-[11px]">
                            {[
                                { label: 'Customer', name: 'customer_name' },
                                { label: 'Product Name', name: 'product_name' },
                                { label: 'Paper', name: 'paper_type_name' },
                                { label: 'GSM', name: 'gsm_value' },
                                { label: 'Print Size', name: 'print_size' },
                                { label: 'Dimension', name: 'dimension' },
                                { label: 'ink', name: 'ink' },
                                { label: 'Plate No', name: 'plate_no' },
                                { label: 'Coating', name: 'coating' },
                                { label: 'Special Effects', name: 'special_effects' },
                                { label: 'Pasting', name: 'pasting_type' },
                                { label: 'folding dimention', name: 'folding_dimension' },
                                { label: 'Construction', name: 'construction_type' },
                                { label: 'Specification', name: 'specification' },
                                { label: 'ArtworkCode', name: 'artwork_code' },
                                { label: 'del address', name: 'delivery_address' }
                            ].map(f => (
                                <div key={f.name}>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">{f.label}</label>
                                    <input name={f.name} value={(formData as any)[f.name] || ''} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-2 py-1 uppercase" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- SIDEBAR --- */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                        <SectionHeader icon={LinkIcon} title="Assets & Reference" className="border-slate-800 text-slate-400" />

                        {product?.product_image && (
                            <div className="mb-6 rounded-xl overflow-hidden bg-white/10 p-2">
                                <img src={`/uploads/${product.product_image}`} alt="Ref" className="w-full h-48 object-contain" />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">SKU</label>
                                <span className="font-mono text-xs bg-black/30 px-2 py-1 rounded block">{product?.sku || '-'}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {product?.artwork_pdf && (
                                    <a href={`/uploads/${product.artwork_pdf}`} target="_blank" className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">
                                        ArtworkPDF <FileText className="w-4 h-4 text-red-500" />
                                    </a>
                                )}
                                {product?.artwork_cdr && (
                                    <a href={`/uploads/${product.artwork_cdr}`} download className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">
                                        ArtworkCDR <LinkIcon className="w-4 h-4 text-blue-400" />
                                    </a>
                                )}
                            </div>

                            <SectionHeader icon={FileText} title="File Uploads" className="border-slate-800 mt-6" />
                            <div className="space-y-2">
                                <label className="label text-slate-500">Shade card file</label>
                                <input type="file" className="block w-full text-[10px] text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />

                                <label className="label text-slate-500">Del label file</label>
                                <input type="file" className="block w-full text-[10px] text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />

                                <label className="label text-slate-500">COA file</label>
                                <input type="file" className="block w-full text-[10px] text-slate-400 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- FOOTER --- */}
            <div className="flex justify-end items-center gap-4 pt-8 border-t border-slate-100">
                <Link href="/orders" className="text-sm font-bold text-slate-400 hover:text-slate-600 px-4">Cancel</Link>
                <button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                    {saving ? <><Loader2 className="animate-spin" /> Saving...</> : <><CheckCircle /> {initialData ? 'Update Order' : 'Save Order'}</>}
                </button>
            </div>

            <style jsx>{`
                .label { font-size: 0.65rem; font-weight: 800; color: #64748b; display: block; margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .input-field { display: block; width: 100%; border-radius: 0.75rem; border: 1.5px solid #f1f5f9; padding: 0.625rem 0.875rem; font-size: 0.875rem; background-color: #f8fafc; transition: all 0.2s; color: #1e293b; }
                .input-field:focus { border-color: #6366f1; background-color: #fff; outline: none; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
            `}</style>
        </form>
    );
}
