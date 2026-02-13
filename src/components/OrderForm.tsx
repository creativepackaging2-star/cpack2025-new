'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order, Product } from '@/types';
import {
    Loader2, Save, X, FileText, CheckCircle, Truck, User,
    DollarSign, Settings, Layers, Link as LinkIcon, Edit3,
    Search, Palette, MessageCircle, UserCheck, Split, Printer,
    Zap, Share2, Image as ImageIcon, Briefcase, Ruler, Plus
} from 'lucide-react';
import Link from 'next/link';
import { WhatsAppLogo, PaperwalaWhatsAppLogo, PdfLogo, CdrLogo } from '@/components/FileLogos';
import { useDataStore } from './DataStoreProvider';

type Props = {
    initialData?: Order | null;
    productId?: string | null;
};

const DEFAULT_ORDER: Partial<Order> = {
    order_id: '',
    product_id: '',
    product_name: '',
    quantity: 0,
    status: 'In Production',
    progress: 'Paper',
    order_date: new Date().toISOString().split('T')[0],
    printer_name: '',
    printer_id: null,
    printer_mobile: '',
    paperwala_name: '',
    paperwala_id: null,
    paperwala_mobile: '',
    rate: 0,
    value: 0,
    gross_print_qty: 0,
    paper_ups: 1,
    total_print_qty: 0,
    extra: 0,
    max_del_qty: 0,
    paper_order_size: '',
    paper_order_size_id: null,
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
    customer_name: '',
    paper_type_name: '',
    gsm_value: '',
    actual_gsm_used: '',
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
    artwork_cdr: '',
};

export default function OrderForm({ initialData, productId: initialProductId }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productId = initialProductId || searchParams.get('product_id');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [product, setProduct] = useState<any>(null);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);

    const { products: productList, sizes, printers, paperwalas, loading: storeLoading, refreshData } = useDataStore();

    const [formData, setFormData] = useState<Partial<Order>>(
        initialData || { ...DEFAULT_ORDER, product_id: productId || '' }
    );

    // --- New Data Handlers ---
    const handleAddSize = async () => {
        const name = window.prompt("Enter New Paper Size (e.g., 20x30):");
        if (!name) return;
        setSaving(true);
        try {
            const { data, error } = await supabase.from('sizes').insert([{ name }]).select().single();
            if (error) throw error;
            await refreshData();
            if (data) {
                setFormData(prev => ({ ...prev, paper_order_size_id: data.id, paper_order_size: data.name }));
            }
        } catch (err: any) { alert(err.message); } finally { setSaving(false); }
    };

    const handleAddPrinter = async () => {
        const name = window.prompt("Enter New Printer Name:");
        if (!name) return;
        const phone = window.prompt("Enter Printer Phone (optional):") || '';
        setSaving(true);
        try {
            const { data, error } = await supabase.from('printers').insert([{ name, phone }]).select().single();
            if (error) throw error;
            await refreshData();
            if (data) {
                setFormData(prev => ({ ...prev, printer_id: data.id, printer_name: data.name, printer_mobile: data.phone }));
            }
        } catch (err: any) { alert(err.message); } finally { setSaving(false); }
    };

    const handleAddPaperwala = async () => {
        const name = window.prompt("Enter New Paperwala Name:");
        if (!name) return;
        const phone = window.prompt("Enter Paperwala Phone (optional):") || '';
        setSaving(true);
        try {
            const { data, error } = await supabase.from('paperwala').insert([{ name, phone }]).select().single();
            if (error) throw error;
            await refreshData();
            if (data) {
                setFormData(prev => ({ ...prev, paperwala_id: data.id, paperwala_name: data.name, paperwala_mobile: data.phone }));
            }
        } catch (err: any) { alert(err.message); } finally { setSaving(false); }
    };

    useEffect(() => {
        if (!initialData && !formData.order_id) {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 6);
            setFormData(prev => ({ ...prev, order_id: `ORD-${timestamp}-${random}`.toUpperCase() }));
        }
        if (productId) fetchProduct(productId);
    }, [productId]);

    const filteredProducts = useMemo(() => {
        if (!productSearch) return productList.slice(0, 10);
        const s = productSearch.toLowerCase();
        return productList.filter(p =>
            p.product_name?.toLowerCase().includes(s) ||
            p.artwork_code?.toLowerCase().includes(s) ||
            p.sku?.toLowerCase().includes(s)
        ).slice(0, 10);
    }, [productList, productSearch]);

    useEffect(() => {
        const qty = parseFloat(String(formData.quantity)) || 0;
        const rate = parseFloat(String(formData.rate)) || 0;
        const ups = parseFloat(String(product?.ups)) || 1;
        const extra = parseFloat(String(formData.extra)) || 0;
        const paperUps = parseFloat(String(formData.paper_ups)) || 1;

        // Auto-calculate max_del_qty based on quantity
        let maxDelQty = 0;
        if (qty <= 5000) maxDelQty = Math.ceil(qty * 1.20);
        else if (qty <= 10000) maxDelQty = Math.ceil(qty * 1.17);
        else maxDelQty = Math.ceil(qty * 1.15);

        const value = parseFloat(((qty * rate)).toFixed(2));
        // Use max_del_qty for gross calculation
        const grossPrint = ups > 0 ? Math.ceil(maxDelQty / ups) : 0;
        const totalPrint = Math.ceil(grossPrint + extra);
        const paperReq = Math.ceil(totalPrint / paperUps);

        setFormData(prev => ({
            ...prev,
            value,
            max_del_qty: maxDelQty,
            gross_print_qty: grossPrint,
            total_print_qty: totalPrint,
            paper_required: paperReq
        }));
    }, [formData.quantity, formData.rate, formData.extra, formData.paper_ups, product?.ups]);

    // Auto-set invoicing unit based on delivery address
    useEffect(() => {
        const address = formData.delivery_address || '';
        if (address.toLowerCase().includes('halol') && formData.from_our_company !== 'Printers') {
            setFormData(prev => ({ ...prev, from_our_company: 'Printers' }));
        }
    }, [formData.delivery_address]);

    const generateBatchNoFromDate = useCallback((dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yy = String(date.getFullYear()).slice(-2);
        return `${dd}${mm}${yy}`;
    }, []);

    const calculateBatchNo = useCallback((pName: string, cName: string, dDate: string) => {
        const datePart = generateBatchNoFromDate(dDate);
        if (!datePart) return '';
        const namePart = (pName || '').replace(/\s+/g, '').substring(0, 6).toUpperCase();
        const catPart = (cName || 'X').substring(0, 1).toUpperCase();
        return `${namePart}${datePart}${catPart}`;
    }, [generateBatchNoFromDate]);

    const fetchProduct = async (id: string) => {
        setLoading(true);
        try {
            const { data: prod, error: pErr } = await supabase.from('products').select('*').eq('id', id).single();
            if (pErr) throw pErr;
            const [cust, cat, paper, gsm, sz, cons, spec, past, addr] = await Promise.all([
                prod.customer_id ? supabase.from('customers').select('name').eq('id', prod.customer_id).single() : Promise.resolve({ data: null }),
                prod.category_id ? supabase.from('category').select('name').eq('id', prod.category_id).single() : Promise.resolve({ data: null }),
                prod.paper_type_id ? supabase.from('paper_types').select('name').eq('id', prod.paper_type_id).single() : Promise.resolve({ data: null }),
                prod.gsm_id ? supabase.from('gsm').select('name').eq('id', prod.gsm_id).single() : Promise.resolve({ data: null }),
                prod.size_id ? supabase.from('sizes').select('name').eq('id', prod.size_id).single() : Promise.resolve({ data: null }),
                prod.construction_id ? supabase.from('constructions').select('name').eq('id', prod.construction_id).single() : Promise.resolve({ data: null }),
                prod.specification_id ? supabase.from('specifications').select('name').eq('id', prod.specification_id).single() : Promise.resolve({ data: null }),
                prod.pasting_id ? supabase.from('pasting').select('name').eq('id', prod.pasting_id).single() : Promise.resolve({ data: null }),
                prod.delivery_address_id ? supabase.from('delivery_addresses').select('name').eq('id', prod.delivery_address_id).single() : Promise.resolve({ data: null })
            ]);
            setProduct(prod);
            if (!initialData) {
                const address = addr.data?.name || '';
                setFormData(prev => ({
                    ...prev,
                    product_id: prod.id,
                    product_name: prod.product_name || '',
                    category_name: cat.data?.name || '',
                    paper_type_name: paper.data?.name || '',
                    gsm_value: gsm.data?.name || '',
                    actual_gsm_used: prod.actual_gsm_used || '',
                    print_size: sz.data?.name || '',
                    customer_name: cust.data?.name || '',
                    delivery_address: address,
                    from_our_company: address.toLowerCase().includes('halol') ? 'Printers' : 'Packaging',
                    ups: prod.ups || null,
                    rate: prod.last_rate || 0,
                    artwork_code: prod.artwork_code || '',
                    plate_no: prod.plate_no || '',
                    ink: prod.ink || '',
                    paper_order_size: sz.data?.name || '',
                    paper_order_size_id: prod.size_id || null,
                    dimension: prod.dimension || '',
                    artwork_pdf: prod.artwork_pdf || '',
                    artwork_cdr: prod.artwork_cdr || '',
                    coating: prod.coating || '',
                    special_effects: prod.special_effects || '',
                    pasting_type: past.data?.name || '',
                    construction_type: cons.data?.name || '',
                    specification: spec.data?.name || '',
                    specs: prod.specs || '',
                }));
            }
        } catch (err: any) { alert(err.message); } finally { setLoading(false); }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'delivery_date') {
            const newBatch = calculateBatchNo(formData.product_name || '', formData.category_name || '', value);
            setFormData(prev => ({ ...prev, [name]: value, batch_no: newBatch || prev.batch_no }));
        } else if (name === 'delivery_address') {
            // "Halol" logic: Auto-select Printer invoicing if Halol is detected and wasn't previously
            const hasHalol = value.toLowerCase().includes('halol');
            const hadHalol = formData.delivery_address?.toLowerCase().includes('halol');

            if (hasHalol && !hadHalol) {
                setFormData(prev => ({ ...prev, [name]: value, from_our_company: 'Printers' }));
            } else {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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

            const numFields = ['quantity', 'rate', 'value', 'gross_print_qty', 'paper_ups', 'total_print_qty', 'extra', 'paper_required', 'paper_order_qty', 'qty_delivered', 'max_del_qty'];
            numFields.forEach(f => {
                const val = (payload as any)[f];
                if (val !== undefined && val !== null && val !== '') {
                    (payload as any)[f] = parseFloat(val) || 0;
                }
            });

            // Remove fields that don't exist in orders table
            delete (payload as any).actual_gsm_used;
            delete (payload as any).products;

            if (payload.billed === 'true') (payload as any).billed = true;
            else if (payload.billed === 'false') (payload as any).billed = false;

            const fkFields = ['printer_id', 'paperwala_id', 'paper_order_size_id'];
            fkFields.forEach(f => {
                if (!(payload as any)[f]) (payload as any)[f] = null;
            });

            if (!payload.product_id) {
                alert('Please select a product from the dropdown list.');
                setSaving(false);
                return;
            }

            if (initialData?.id) {
                const { error: updErr } = await supabase.from('orders').update(payload).eq('id', initialData.id);
                if (updErr) throw updErr;
            } else {
                const { error: insErr } = await supabase.from('orders').insert([payload]);
                if (insErr) throw insErr;
            }
            router.push('/orders');
            router.refresh();
        } catch (err: any) { alert(err.message); } finally { setSaving(false); }
    };

    // --- External Actions ---
    const sendToPaperwala = () => {
        if (!formData.paperwala_mobile) { alert('No mobile number for Paperwala.'); return; }
        const gsmToUse = formData.actual_gsm_used || formData.gsm_value || '-';
        const msg = `*PAPER ORDER*\nSize: ${formData.paper_order_size || '-'}\nQty: ${formData.paper_order_qty || '-'}\nPaper: ${formData.paper_type_name || '-'}\nGSM: ${gsmToUse}\nDelivery At: ${formData.printer_name || '-'}`;
        window.open(`https://wa.me/${formData.paperwala_mobile.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const sendToPrinter = () => {
        if (!formData.printer_mobile) { alert('No mobile number for Printer.'); return; }
        const msg = `*PRINTING ORDER*\nProduct: ${formData.product_name || '-'}\nPrint Size: ${formData.print_size || '-'}\nPrint Qty: ${formData.total_print_qty || '-'}\nCode: ${formData.artwork_code || '-'}\nInk: ${formData.ink || '-'}\nPlate: ${formData.plate_no || '-'}`;
        window.open(`https://wa.me/${formData.printer_mobile.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const generateDoc = async (type: string) => {
        // If it's a new order (no ID yet), we must save first to get an ID.
        if (!initialData?.id && !formData.id) {
            alert('Please create the order first by clicking "Create Order".');
            return;
        }

        // Auto-save the current form state before generation
        setSaving(true);
        try {
            // Re-use submit logic structure but for update only
            const payload = { ...formData };
            // Ensure numeric fields are parsed
            const numFields = ['quantity', 'rate', 'value', 'gross_print_qty', 'paper_ups', 'total_print_qty', 'extra', 'paper_required', 'paper_order_qty', 'qty_delivered', 'max_del_qty'];
            numFields.forEach(f => {
                const val = (payload as any)[f];
                if (val !== undefined && val !== null && val !== '') {
                    (payload as any)[f] = parseFloat(val) || 0;
                }
            });
            delete (payload as any).actual_gsm_used;
            if (payload.billed === 'true') (payload as any).billed = true;
            else if (payload.billed === 'false') (payload as any).billed = false;

            const targetId = initialData?.id || formData.id;

            if (targetId) {
                const { error } = await supabase.from('orders').update(payload).eq('id', targetId);
                if (error) throw error;
                // Update local state to reflect save successful
                if (initialData) Object.assign(initialData, payload);
            }

            // Open document in new tab
            const routeMap: Record<string, string> = {
                'COA': `/orders/${targetId}/coa`,
                'Delivery Label': `/orders/${targetId}/delivery-label`,
                'Shade Card': `/orders/${targetId}/shade-card`
            };
            if (routeMap[type]) window.open(routeMap[type], '_blank');

        } catch (err: any) {
            alert('Error saving for document generation: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSplitOrder = async () => {
        if (!initialData?.id) return;
        const splitQtyStr = window.prompt(`Split quantity:`, "0");
        if (!splitQtyStr) return;
        const splitQty = parseInt(splitQtyStr);
        if (isNaN(splitQty) || splitQty <= 0) { alert('Invalid qty'); return; }
        setSaving(true);
        try {
            const { id: _, ...orderData } = formData as any;
            const partial = { ...orderData, quantity: splitQty, qty_delivered: splitQty, status: 'Partially Delivered', parent_id: initialData.id, order_id: `${formData.order_id}-P` };
            await supabase.from('orders').insert([partial]);
            await supabase.from('orders').update({ quantity: (formData.quantity || 0) - splitQty }).eq('id', initialData.id);
            router.push('/orders');
            router.refresh();
        } catch (err: any) { alert(err.message); } finally { setSaving(false); }
    };

    const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1 mb-3">
            <Icon className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        </div>
    );

    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600" /></div>;

    return (
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-20">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-white uppercase tracking-tight">
                    {initialData ? "Update Order" : "New Order Entry"}
                </h1>
                <Link href="/orders" className="text-white/70 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </Link>
            </div>

            {/* Body */}
            <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">

                {/* 1. Product Selection */}
                <div className="bg-slate-50/50 p-2 rounded-xl">
                    <SectionHeader icon={Search} title="Product Selection" />
                    <div className="space-y-1">
                        <div className="relative">
                            <label className="label">Search Product</label>
                            <input
                                name="product_name"
                                className="input-field mb-0 bg-blue-100"
                                style={{ color: '#1d4ed8', fontWeight: 'bold' }}
                                value={productSearch || formData.product_name || ''}
                                onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                                onFocus={() => setShowProductDropdown(true)}
                                placeholder="Name / Code"
                                readOnly={!!initialData}
                            />
                            {!initialData && showProductDropdown && filteredProducts.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                    {filteredProducts.map(p => (
                                        <div key={p.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm" onClick={() => { setProductSearch(p.product_name || ''); setShowProductDropdown(false); fetchProduct(p.id); }}>
                                            <span className="font-bold">{p.product_name}</span>
                                            <div className="text-[10px] text-slate-400">Code: {p.artwork_code}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="label">Artwork Code</label>
                            <input name="artwork_code" className="input-field mb-0 bg-blue-100" style={{ color: '#1d4ed8', fontWeight: 'bold' }} value={formData.artwork_code || ''} onChange={handleChange} placeholder="Code" />
                        </div>
                        <div>
                            <label className="label text-red-600">Order Quantity</label>
                            <input name="quantity" type="number" className="input-field mb-0 text-base bg-red-50 border-red-200" style={{ color: '#dc2626', fontWeight: 'bold' }} value={formData.quantity || ''} onChange={handleNumberChange} placeholder="Qty" required />
                        </div>
                    </div>
                </div>

                {/* 2. Order Metrics */}
                <div className="bg-slate-50/50 p-2 rounded-xl">
                    <SectionHeader icon={FileText} title="Order Metrics" />
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="label">Order Date</label>
                            <input name="order_date" type="date" className="input-field cursor-pointer" value={formData.order_date || ''} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="label">Rate</label>
                            <input name="rate" type="number" step="0.01" className="input-field" value={formData.rate || ''} onChange={handleNumberChange} placeholder="Rate" />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Total Value</label>
                            <input name="value" type="number" className="input-field bg-slate-100 text-emerald-600 text-base" value={formData.value || 0} readOnly />
                        </div>
                        <div>
                            <label className="label">Status</label>
                            <select name="status" className="input-field" value={formData.status || ''} onChange={handleChange}>
                                <option value="In Production">In Production</option>
                                <option value="Complete">Complete</option>
                                <option value="Hold">Hold</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Progress</label>
                            <select name="progress" className="input-field" value={formData.progress || ''} onChange={handleChange}>
                                {['Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 3. Customer */}
                <div className="bg-slate-50/50 p-2 rounded-xl">
                    <SectionHeader icon={User} title="Customer" />
                    <label className="label">Customer Name</label>
                    <input name="customer_name" className="input-field bg-blue-100" style={{ color: '#1d4ed8' }} value={formData.customer_name || ''} onChange={handleChange} placeholder="Customer" />
                    <label className="label">Delivery Address</label>
                    <textarea name="delivery_address" className="input-field h-14 text-xs italic bg-blue-100" style={{ color: '#1d4ed8' }} value={formData.delivery_address || ''} onChange={handleChange} placeholder="Address" />
                </div>

                {/* 4. Manufacturing & Logistics - FULL WIDTH */}
                <div className="lg:col-span-3 bg-indigo-50/20 border border-indigo-100 p-2 rounded-xl">
                    <SectionHeader icon={Briefcase} title="Manufacturing & Logistics" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-3 gap-y-2">

                        {/* Manufacturing Line 1 */}
                        <div>
                            <label className="label">Order Qty</label>
                            <input type="number" className="input-field bg-white text-xs" value={formData.quantity || 0} readOnly />
                        </div>
                        <div>
                            <label className="label">UPS</label>
                            <input name="ups" type="number" className="input-field text-xs bg-blue-100" style={{ color: '#1d4ed8', fontWeight: 'bold' }} value={formData.ups || 1} onChange={handleNumberChange} />
                        </div>
                        <div>
                            <label className="label">Print Size</label>
                            <input name="print_size" className="input-field text-xs bg-blue-100" style={{ color: '#1d4ed8', fontWeight: 'bold' }} value={formData.print_size || ''} onChange={handleChange} placeholder="Size" />
                        </div>
                        <div>
                            <label className="label text-amber-600">Max Del. Qty</label>
                            <input type="number" className="input-field text-xs bg-amber-50 border-amber-200" style={{ color: '#d97706', fontWeight: 'bold' }} value={formData.max_del_qty || 0} readOnly />
                        </div>
                        <div>
                            <label className="label text-slate-400">Gross</label>
                            <input type="number" className="input-field bg-slate-50 text-xs" value={formData.gross_print_qty || 0} readOnly />
                        </div>
                        <div>
                            <label className="label">Extra</label>
                            <input name="extra" type="number" className="input-field text-xs" value={formData.extra || 0} onChange={handleNumberChange} />
                        </div>
                        <div>
                            <label className="label text-red-600">Total Print</label>
                            <input type="number" className="input-field bg-red-50 text-xs" style={{ color: '#dc2626', fontWeight: 'bold' }} value={formData.total_print_qty || 0} readOnly />
                        </div>

                        {/* Logistics Line 1 */}
                        <div>
                            <label className="label">Paper Size</label>
                            <div className="flex gap-1">
                                <select name="paper_order_size_id" className="input-field text-xs flex-1" value={formData.paper_order_size_id || ''} onChange={(e) => {
                                    const m = sizes.find(s => s.id === parseInt(e.target.value));
                                    setFormData(prev => ({ ...prev, paper_order_size_id: m?.id || null, paper_order_size: m?.name || '' }));
                                }}>
                                    <option value="">Select...</option>
                                    {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button type="button" onClick={handleAddSize} className="bg-slate-200 hover:bg-slate-300 rounded px-1 min-h-[1.5rem] flex items-center justify-center -mt-1"><Plus className="w-3 h-3 text-slate-700" /></button>
                            </div>
                        </div>
                        <div>
                            <label className="label">Paper UPS</label>
                            <input name="paper_ups" type="number" className="input-field text-xs" value={formData.paper_ups || 1} onChange={handleNumberChange} />
                        </div>
                        <div>
                            <label className="label text-indigo-600">Paper Req</label>
                            <input type="number" className="input-field bg-slate-50 text-indigo-700 text-xs" value={formData.paper_required || 0} readOnly />
                        </div>
                        <div>
                            <label className="label">Paper Order</label>
                            <input name="paper_order_qty" type="number" className="input-field border-amber-200 text-xs" value={formData.paper_order_qty || 0} onChange={handleNumberChange} />
                        </div>

                        {/* Printer Line */}
                        <div>
                            <label className="label">Printer</label>
                            <div className="flex gap-1">
                                <select name="printer_id" className="input-field text-xs flex-1" value={formData.printer_id || ''} onChange={(e) => {
                                    const m = printers.find(p => p.id === parseInt(e.target.value));
                                    setFormData(prev => ({ ...prev, printer_id: m?.id || null, printer_name: m?.name || '', printer_mobile: m?.phone || '' }));
                                }}>
                                    <option value="">Select...</option>
                                    {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <button type="button" onClick={handleAddPrinter} className="bg-slate-200 hover:bg-slate-300 rounded px-1 min-h-[1.5rem] flex items-center justify-center -mt-1"><Plus className="w-3 h-3 text-slate-700" /></button>
                            </div>
                        </div>
                        <div>
                            <label className="label">Printer Phone</label>
                            <input name="printer_mobile" className="input-field text-xs" value={formData.printer_mobile || ''} onChange={handleChange} placeholder="Phone" />
                        </div>
                        <div>
                            <label className="label">Paperwala</label>
                            <div className="flex gap-1">
                                <select name="paperwala_id" className="input-field text-xs flex-1" value={formData.paperwala_id || ''} onChange={(e) => {
                                    const m = paperwalas.find(p => p.id === parseInt(e.target.value));
                                    setFormData(prev => ({ ...prev, paperwala_id: m?.id || null, paperwala_name: m?.name || '', paperwala_mobile: m?.phone || '' }));
                                }}>
                                    <option value="">Select...</option>
                                    {paperwalas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <button type="button" onClick={handleAddPaperwala} className="bg-slate-200 hover:bg-slate-300 rounded px-1 min-h-[1.5rem] flex items-center justify-center -mt-1"><Plus className="w-3 h-3 text-slate-700" /></button>
                            </div>
                        </div>
                        <div>
                            <label className="label">Paperwala Phone</label>
                            <input name="paperwala_mobile" className="input-field text-xs" value={formData.paperwala_mobile || ''} onChange={handleChange} placeholder="Phone" />
                        </div>
                        <div>
                            <label className="label">Plate No</label>
                            <input name="plate_no" className="input-field text-xs bg-blue-100" style={{ color: '#1d4ed8', fontWeight: 'bold' }} value={formData.plate_no || ''} onChange={handleChange} placeholder="Plate" />
                        </div>
                        <div>
                            <label className="label">GSM</label>
                            <input name="gsm_value" className="input-field text-xs bg-blue-100" style={{ color: '#1d4ed8', fontWeight: 'bold' }} value={formData.gsm_value || ''} onChange={handleChange} placeholder="GSM" />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Ink Spec</label>
                            <input name="ink" className="input-field text-xs bg-blue-100" style={{ color: '#1d4ed8', fontWeight: 'bold' }} value={formData.ink || ''} onChange={handleChange} placeholder="Ink" />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Paper Type</label>
                            <input name="paper_type_name" className="input-field text-xs bg-blue-100" style={{ color: '#1d4ed8', fontWeight: 'bold' }} value={formData.paper_type_name || ''} onChange={handleChange} placeholder="Paper" />
                        </div>
                    </div>
                </div>

                {/* 5. Delivery & Production Tools */}
                <div className="lg:col-span-2 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                    <SectionHeader icon={Truck} title="Delivery & Dispatch" />
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        <div>
                            <label className="label">Ready Date</label>
                            <input name="ready_date" type="date" className="input-field" value={formData.ready_date || ''} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="label">Delivery Date</label>
                            <input name="delivery_date" type="date" className="input-field" value={formData.delivery_date || ''} onChange={handleChange} />
                        </div>
                        <div>
                            <label className="label">Max Del</label>
                            <div className="input-field text-xs text-center flex items-center justify-center font-bold" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}>
                                {(formData.max_del_qty || 0).toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <label className="label">Qty Delivered</label>
                            <input name="qty_delivered" type="number" className="input-field text-indigo-600" value={formData.qty_delivered || ''} onChange={handleNumberChange} placeholder="Qty" />
                        </div>
                        <div>
                            <label className="label">Invoice No</label>
                            <input name="invoice_no" className="input-field" value={formData.invoice_no || ''} onChange={handleChange} placeholder="Inv" />
                        </div>
                        <div>
                            <label className="label">Invoicing Unit</label>
                            <select name="from_our_company" className="input-field" value={formData.from_our_company || ''} onChange={handleChange}>
                                <option value="Packaging">Packaging</option>
                                <option value="Printers">Printers</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Batch No</label>
                            <input name="batch_no" className="input-field bg-slate-50 font-mono text-[10px]" value={formData.batch_no || ''} placeholder="Auto" readOnly />
                        </div>
                    </div>

                    {/* Production Tools */}
                    <div className="pt-2 border-t border-slate-200">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2 text-center">Production Tools</h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            <button type="button" onClick={sendToPaperwala} className="action-btn-compact bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600" title="WA Paper">
                                <PaperwalaWhatsAppLogo className="w-6 h-6" />
                                <span className="text-[9px] font-bold uppercase whitespace-nowrap">WA Paper</span>
                            </button>
                            <button type="button" onClick={sendToPrinter} className="action-btn-compact bg-blue-500/10 hover:bg-blue-500/20 text-blue-600" title="WA Print">
                                <WhatsAppLogo className="w-6 h-6" />
                                <span className="text-[9px] font-bold uppercase whitespace-nowrap">WA Print</span>
                            </button>
                            <button type="button" onClick={handleSplitOrder} className="action-btn-compact bg-amber-500/10 hover:bg-amber-500/20 text-amber-600" title="Split">
                                <Split className="w-6 h-6" />
                                <span className="text-[9px] font-bold uppercase whitespace-nowrap">Split</span>
                            </button>
                            <button type="button" onClick={() => generateDoc('COA')} className="action-btn-compact bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600" title="COA">
                                <FileText className="w-6 h-6" />
                                <span className="text-[9px] font-bold uppercase whitespace-nowrap">COA</span>
                            </button>
                            <button type="button" onClick={() => generateDoc('Delivery Label')} className="action-btn-compact bg-rose-500/10 hover:bg-rose-500/20 text-rose-600" title="Label">
                                <Truck className="w-6 h-6" />
                                <span className="text-[9px] font-bold uppercase whitespace-nowrap">Label</span>
                            </button>
                            <button type="button" onClick={() => generateDoc('Shade Card')} className="action-btn-compact bg-violet-500/10 hover:bg-violet-500/20 text-violet-600" title="Shade">
                                <Palette className="w-6 h-6" />
                                <span className="text-[9px] font-bold uppercase whitespace-nowrap">Shade</span>
                            </button>
                        </div>
                        {(formData.artwork_pdf || formData.artwork_cdr) && (
                            <div className="flex gap-2 mt-2">
                                {formData.artwork_pdf && <a href={formData.artwork_pdf} target="_blank" className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 text-red-500 py-2 rounded text-xs font-bold border border-red-500/20"><PdfLogo className="w-4 h-4" />PDF</a>}
                                {formData.artwork_cdr && <a href={formData.artwork_cdr} target="_blank" className="flex-1 flex items-center justify-center gap-1 bg-orange-500/10 text-orange-500 py-2 rounded text-xs font-bold border border-orange-500/20"><CdrLogo className="w-4 h-4" />CDR</a>}
                            </div>
                        )}
                    </div>
                </div>

                {/* 6. Specs & Remarks */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <SectionHeader icon={Ruler} title="Specs & Remarks" />
                    <div className="space-y-2">
                        <div>
                            <label className="label">Master Specs</label>
                            <textarea value={formData.specs || ''} readOnly className="input-field h-14 text-[10px] bg-white" placeholder="Product specs..." />
                        </div>
                        <div>
                            <label className="label">Order Remarks</label>
                            <textarea name="remarks" className="input-field h-14 text-xs italic" value={formData.remarks || ''} onChange={handleChange} placeholder="Instructions..." />
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white px-4 md:px-6 py-2 flex flex-col md:flex-row justify-between items-center border-t border-slate-200 z-50 gap-2">
                <Link href="/orders" className="btn-secondary w-full md:w-auto text-center py-2 md:py-3 text-[11px] md:text-xs">Discard & Exit</Link>
                <div className="flex gap-4 w-full md:w-auto">
                    <button type="submit" disabled={saving} className="btn-primary flex items-center gap-3 shadow-xl shadow-indigo-100 active:scale-95 transition-all w-full md:min-w-[200px] justify-center text-sm font-black py-2 md:py-3">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        {saving ? "SAVING..." : initialData ? "UPDATE ORDER" : "CREATE ORDER"}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .label { font-size: 0.6rem; font-weight: 800; color: #94a3b8; display: block; margin-bottom: 0.2rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .input-field { width: 100%; border-radius: 0.5rem; border: 1px solid #cbd5e1; padding: 0.3rem 0.5rem; font-size: 0.8125rem; background-color: #f8fafc; margin-bottom: 0.35rem; transition: all 0.2s; color: #1e293b; }
        .input-field:focus { outline: none; border-color: #4f46e5; background-color: #fff; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08); }
        .btn-primary { background-color: #4f46e5; color: white; padding: 0.75rem 2rem; border-radius: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.3s; }
        .btn-primary:hover { background-color: #4338ca; transform: translateY(-1px); }
        .btn-secondary { background-color: #fff; color: #64748b; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.85rem; border: 1.5px solid #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em; }
        .action-btn { flex: 1; display: flex; flex-direction: column; items-center justify-center gap-1.5 p-3 rounded-xl transition-all border border-transparent; }
        .action-btn:hover { border-color: currentColor; transform: scale(1.05); }
        .action-btn-compact { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s; border: 1px solid transparent; gap: 0.25rem; text-align: center; }
        .action-btn-compact:hover { border-color: currentColor; transform: scale(1.05); background-color: rgba(255, 255, 255, 0.5); }
      `}</style>
        </form>
    );
}
