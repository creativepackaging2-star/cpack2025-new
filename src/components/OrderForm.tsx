'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order, Product } from '@/types';
import { Loader2, Save, X, FileText, CheckCircle, Truck, User, DollarSign, Settings, Layers, Link as LinkIcon, Edit3, Search, Zap, Palette, MessageCircle, UserCheck, Split } from 'lucide-react';
import Link from 'next/link';
import { WhatsAppLogo, PaperwalaWhatsAppLogo, PdfLogo, CdrLogo } from '@/components/FileLogos';

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

    const [printers, setPrinters] = useState<any[]>([]);
    const [paperwalas, setPaperwalas] = useState<any[]>([]);
    const [sizes, setSizes] = useState<any[]>([]);

    useEffect(() => {
        fetchProductList();
        fetchDropdowns();
    }, []);

    useEffect(() => {
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

    async function fetchDropdowns() {
        console.log('Fetching dropdowns...');
        try {
            const [pRes, wRes, sRes] = await Promise.all([
                supabase.from('printers').select('id, name, phone').order('name'),
                supabase.from('paperwala').select('id, name, phone').order('name'),
                supabase.from('sizes').select('id, name').order('name')
            ]);

            console.log('Dropdown Results:', {
                printers: pRes.data?.length,
                paperwalas: wRes.data?.length,
                sizes: sRes.data?.length
            });

            if (pRes.error) console.error('Printers Fetch Error:', pRes.error);
            if (wRes.error) console.error('Paperwala Fetch Error:', wRes.error);
            if (sRes.error) console.error('Sizes Fetch Error:', sRes.error);

            if (pRes.data) setPrinters(pRes.data);
            if (wRes.data) setPaperwalas(wRes.data);
            if (sRes.data) setSizes(sRes.data);
        } catch (err) {
            console.error('Fatal Error in fetchDropdowns:', err);
        }
    }

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
        console.log('Fetching details for product:', id);

        try {
            // 1. Fetch raw product data
            const { data: prod, error: pErr } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (pErr) throw pErr;
            if (!prod) throw new Error('Product not found');

            // 2. Fetch all related labels manually (more reliable than nested joins)
            const [cust, cat, paper, gsm, sz, cons, spec, past, addr] = await Promise.all([
                prod.customer_id ? supabase.from('customers').select('name').eq('id', prod.customer_id).single() : Promise.resolve({ data: null }),
                prod.category_id ? supabase.from('category').select('name').eq('id', prod.category_id).single() : Promise.resolve({ data: null }),
                prod.paper_type_id ? supabase.from('paper_types').select('name').eq('id', prod.paper_type_id).single() : Promise.resolve({ data: null }),
                prod.gsm_id ? supabase.from('gsm').select('name').eq('id', prod.gsm_id).single() : Promise.resolve({ data: null }),
                prod.size_id ? supabase.from('sizes').select('name').eq('id', prod.size_id).single() : Promise.resolve({ data: null }),
                prod.construction_id ? supabase.from('constructions').select('name').eq('id', prod.construction_id).single() : Promise.resolve({ data: null }),
                prod.specification_id ? supabase.from('specifications').select('name').eq('id', prod.specification_id).single() : Promise.resolve({ data: null }),
                prod.pasting_id ? supabase.from('pasting').select('name').eq('id', prod.pasting_id).single() : Promise.resolve({ data: null }),
                prod.delivery_address_id ? supabase.from('delivery_addresses').select('address').eq('id', prod.delivery_address_id).single() : Promise.resolve({ data: null })
            ]);

            setProduct(prod);

            // Only auto-fill formData if we are NOT editing an existing order (i.e., new order)
            if (!initialData) {
                const categoryName = cat.data?.name || '';
                setFormData(prev => {
                    const computedBatch = calculateBatchNo(prod.product_name || '', categoryName, prev.delivery_date || '');
                    return {
                        ...prev,
                        product_id: prod.id,
                        product_name: prod.product_name || '',
                        category_name: categoryName,
                        batch_no: computedBatch || prev.batch_no || '',
                        specs: prod.specs || null,
                        dimension: prod.dimension || null,
                        gsm_value: gsm.data?.name || null,
                        paper_type_name: paper.data?.name || null,
                        paper_order_size: sz.data?.name || null,
                        ink: prod.ink || null,
                        plate_no: prod.plate_no || null,
                        artwork_code: prod.artwork_code || prod.sku || null,
                        customer_name: cust.data?.name || '',
                        print_size: sz.data?.name || '',
                        paper_order_size_id: prod.size_id || null,
                        coating: prod.coating || '',
                        special_effects: prod.special_effects || '',
                        pasting_type: past.data?.name || '',
                        construction_type: cons.data?.name || '',
                        specification: spec.data?.name || '',
                        delivery_address: addr.data?.address || '',
                        artwork_pdf: prod.artwork_pdf || '',
                        artwork_cdr: prod.artwork_cdr || '',
                        ups: prod.ups || null,
                    };
                });
            }

            console.log('Successfully auto-filled from product details');
        } catch (err: any) {
            console.error('Error fetching product details:', err);
            alert(`Error loading product details: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    const calculateBatchNo = (pName: string, cName: string, dDate: string) => {
        const datePart = generateBatchNoFromDate(dDate);
        if (!datePart) return '';
        const namePart = (pName || '').replace(/\s+/g, '').substring(0, 6).toUpperCase();
        const catPart = (cName || 'X').substring(0, 1).toUpperCase();
        return `${namePart}${datePart}${catPart}`;
    };

    // --- Manufacturing Formulas ---

    useEffect(() => {
        const qty = parseFloat(String(formData.quantity)) || 0;
        const rate = parseFloat(String(formData.rate)) || 0;
        const ups = parseFloat(String(product?.ups)) || 1;
        const extra = parseFloat(String(formData.extra)) || 0;
        const paperUps = parseFloat(String(formData.paper_ups)) || 1;

        const value = parseFloat((qty * rate).toFixed(2));
        const grossPrint = ups > 0 ? Math.ceil(qty / ups) : 0;
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

    const generateBatchNoFromDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yy = String(date.getFullYear()).slice(-2);
        return `${dd}${mm}${yy}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'delivery_date') {
            setFormData(prev => {
                const newBatch = calculateBatchNo(prev.product_name || '', prev.category_name || '', value);
                return {
                    ...prev,
                    [name]: value,
                    batch_no: newBatch || prev.batch_no || ''
                };
            });
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

        // 1. Check for duplicate order_id (if new order)
        if (!initialData?.id && formData.order_id) {
            setSaving(true);
            const { data: existing, error: checkErr } = await supabase
                .from('orders')
                .select('id')
                .eq('order_id', formData.order_id)
                .maybeSingle();

            if (existing) {
                alert(`Error: Order ID "${formData.order_id}" already exists. Please use a unique ID.`);
                setSaving(false);
                return;
            }
        }

        setSaving(true);
        try {
            const payload = { ...formData };
            console.log('Final Payload before save:', payload);
            const numFields = ['quantity', 'rate', 'value', 'gross_print_qty', 'paper_ups', 'total_print_qty', 'extra', 'paper_required', 'paper_order_qty', 'qty_delivered'];
            numFields.forEach(f => {
                const val = (payload as any)[f];
                if (val !== undefined && val !== null && val !== '') {
                    (payload as any)[f] = parseFloat(val) || 0;
                }
            });

            if (payload.billed === 'true') (payload as any).billed = true;
            else if (payload.billed === 'false') (payload as any).billed = false;

            // CLEAN PAYLOAD: Removing empty IDs and handling foreign keys
            if (!initialData?.id) {
                delete (payload as any).id;
            }

            // Ensure foreign keys are null if empty, not empty string
            const fkFields = ['printer_id', 'paperwala_id', 'paper_order_size_id'];
            fkFields.forEach(f => {
                if (!(payload as any)[f]) {
                    (payload as any)[f] = null;
                }
            });

            // Ensure order_id is never empty
            if (!payload.order_id) {
                payload.order_id = `ORD-${Date.now().toString(36).toUpperCase()}`;
            }

            if (initialData?.id) {
                console.log('Updating existing order:', initialData.id);
                const { error } = await supabase.from('orders').update(payload).eq('id', initialData.id);
                if (error) {
                    console.error('Update Error Detail:', error);
                    if (error.code === '42501') {
                        alert('🔴 SECURITY ERROR (RLS): You do not have permission to save this order. Please ensure RLS policies allow updates on the "orders" table.');
                    } else {
                        alert(`Update Error: [${error.code}] ${error.message}`);
                    }
                    throw error;
                }
            } else {
                console.log('Inserting new order...');
                const { error } = await supabase.from('orders').insert([payload]);
                if (error) {
                    console.error('Insert Error Detail:', error);
                    if (error.code === '42501') {
                        alert('🔴 SECURITY ERROR (RLS): You do not have permission to add this order. Your database RLS policy is blocking the save.');
                    } else {
                        alert(`Insert Error: [${error.code}] ${error.message}\n\nHint: Check if Order ID already exists.`);
                    }
                    throw error;
                }
            }
            router.refresh();
            router.push('/orders');
        } catch (error: any) {
            console.error('Submit execution error:', error);
        } finally {
            setSaving(false);
        }
    };

    const sendToPaperwala = () => {
        if (!formData.paperwala_mobile) {
            alert('No mobile number found for Paperwala.');
            return;
        }

        const msg = `*PAPER ORDER*
Size        : ${formData.paper_order_size || '-'}
Qty         : ${formData.paper_order_qty || '-'}
Paper       : ${formData.paper_type_name || '-'}
GSM         : ${formData.gsm_value || '-'}
Delivery At : ${formData.printer_name || '-'}`;

        const phone = formData.paperwala_mobile.replace(/\D/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const sendToPrinter = () => {
        if (!formData.printer_mobile) {
            alert('No mobile number found for Printer/Supervisor.');
            return;
        }

        const msg = `*PRINTING ORDER*
Product    : ${formData.product_name || '-'}
Print Size : ${formData.print_size || '-'}
Print Qty  : ${formData.total_print_qty || '-'}
Paper      : ${formData.paper_type_name || '-'}
GSM        : ${formData.gsm_value || '-'}
Code       : ${formData.artwork_code || '-'}
Ink        : ${formData.ink || '-'}
Plate No   : ${formData.plate_no || '-'}`;

        const phone = formData.printer_mobile.replace(/\D/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const generateDoc = (type: string) => {
        const id = initialData?.id;
        if (!id) {
            alert('Please save the order first before generating documents.');
            return;
        }

        if (type === 'COA') {
            window.open(`/orders/${id}/coa`, '_blank');
        } else if (type === 'Delivery Label') {
            window.open(`/orders/${id}/delivery-label`, '_blank');
        } else if (type === 'Shade Card') {
            window.open(`/orders/${id}/shade-card`, '_blank');
        } else {
            alert(`${type} generation will be available once templates are defined.`);
        }
    };

    const handleSplitOrder = async () => {
        if (!initialData?.id) return;
        const splitQtyStr = window.prompt(`Current Qty: ${formData.quantity}\n\nEnter quantity to split for Partial Delivery:`, "0");
        if (!splitQtyStr) return;

        const splitQty = parseInt(splitQtyStr);
        if (isNaN(splitQty) || splitQty <= 0 || splitQty >= (formData.quantity || 0)) {
            alert('Invalid quantity. Must be a number greater than 0 and less than ' + (formData.quantity || 0));
            return;
        }

        setSaving(true);
        try {
            const { id: _, created_at: __, updated_at: ___, ...rawOrderData } = formData as any;

            const partialOrder = {
                ...rawOrderData,
                quantity: splitQty,
                qty_delivered: splitQty,
                invoice_no: '',
                status: 'Partially Delivered',
                progress: 'Ready',
                parent_id: initialData.id,
                order_id: formData.order_id ? `${formData.order_id}-P` : `SPLIT-${Date.now().toString(36).toUpperCase()}`
            };

            const { error: insertError } = await supabase.from('orders').insert([partialOrder]);
            if (insertError) throw insertError;

            // Update original order balance
            const { error: updateError } = await supabase
                .from('orders')
                .update({ quantity: (formData.quantity || 0) - splitQty })
                .eq('id', initialData.id);

            if (updateError) throw updateError;

            alert(`✅ Successfully split ${splitQty} into a new order lot.`);
            router.push('/orders');
            router.refresh();
        } catch (err: any) {
            console.error('Split Error:', err);
            alert('Split failed: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const SectionHeader = ({ icon: Icon, title, className = "" }: { icon: any, title: string, className?: string }) => (
        <div className={`flex items-center gap-2 border-b border-slate-100 pb-1.5 mt-2 mb-3 col-span-full ${className}`}>
            <Icon className="w-3.5 h-3.5 text-indigo-500" />
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
        </div>
    );

    if (loading) return <div className="p-20 flex flex-col items-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /><span className="text-slate-500 font-medium">Fetching Product Details...</span></div>;

    return (
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto mb-20 space-y-4 bg-white p-3 md:p-6 rounded-2xl border border-slate-200 shadow-lg">
            {/* --- HEADER SECTION --- */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 md:pb-6">
                <div className="space-y-1">
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase">
                        {initialData ? 'Update Order' : 'New Order Entry'}
                    </h1>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest flex flex-wrap items-center gap-2 md:gap-4">
                        <span>v0.2.0-stable | {product?.product_name || 'Select Product'}</span>
                        <span className={`px-2 py-0.5 rounded border ${printers.length > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                            P({printers.length}) W({paperwalas.length}) S({sizes.length})
                        </span>
                        {((formData.parent_id && formData.parent_id !== (initialData as any)?.id) || formData.order_id?.endsWith('-P') || formData.order_id?.includes('SPLIT-')) && (
                            <span className="px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-1 animate-pulse">
                                <Split className="w-2.5 h-2.5" />
                                SPLIT ORDER LOT
                            </span>
                        )}
                    </p>
                </div>
                <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-6 h-6" /></Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* --- MAIN FORM --- */}
                <div className="lg:col-span-8 space-y-6">

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
                            <select name="status" value={formData.status || ''} onChange={handleChange} className="input-field font-black text-slate-900 bg-white">
                                <option value="In Production">In Production</option>
                                <option value="Complete">Complete</option>
                                <option value="Hold">Hold</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <input
                                type="text"
                                name="category_name"
                                value={formData.category_name || ''}
                                onChange={handleChange}
                                className="input-field bg-slate-50 font-medium"
                                placeholder="Auto-filled..."
                                readOnly
                            />
                        </div>
                        <div>
                            <label className="label">Invoicing & Delivery</label>
                            <select name="from_our_company" value={formData.from_our_company || ''} onChange={handleChange} className="input-field">
                                <option value="">Select...</option>
                                <option value="Printers">Printers</option>
                                <option value="Packaging">Packaging</option>
                                <option value="Enterprise">Enterprise</option>
                            </select>
                        </div>

                        <SectionHeader icon={Truck} title="Partners" />
                        <div>
                            <label className="label">printer</label>
                            <select
                                name="printer_id"
                                value={formData.printer_id || ''}
                                onChange={(e) => {
                                    const id = parseInt(e.target.value);
                                    const matched = printers.find(p => p.id === id);
                                    setFormData(prev => ({
                                        ...prev,
                                        printer_id: id || null,
                                        printer_name: matched?.name || '',
                                        printer_mobile: matched?.phone || prev.printer_mobile
                                    }));
                                }}
                                className="input-field appearance-auto"
                            >
                                <option value="">{printers.length === 0 ? 'Loading Printers...' : 'Select Printer...'}</option>
                                {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">printer mobile</label>
                            <input name="printer_mobile" value={formData.printer_mobile || ''} onChange={handleChange} className="input-field bg-slate-50 font-mono" />
                        </div>
                        <div>
                            <label className="label">paperwala</label>
                            <select
                                name="paperwala_id"
                                value={formData.paperwala_id || ''}
                                onChange={(e) => {
                                    const id = parseInt(e.target.value);
                                    const matched = paperwalas.find(p => p.id === id);
                                    setFormData(prev => ({
                                        ...prev,
                                        paperwala_id: id || null,
                                        paperwala_name: matched?.name || '',
                                        paperwala_mobile: matched?.phone || prev.paperwala_mobile
                                    }));
                                }}
                                className="input-field appearance-auto"
                            >
                                <option value="">{paperwalas.length === 0 ? 'Loading...' : 'Select Paperwala...'}</option>
                                {paperwalas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">paperwala mobile</label>
                            <input name="paperwala_mobile" value={formData.paperwala_mobile || ''} onChange={handleChange} className="input-field bg-slate-50 font-mono" />
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
                            <select
                                name="paper_order_size_id"
                                value={formData.paper_order_size_id || ''}
                                onChange={(e) => {
                                    const id = parseInt(e.target.value);
                                    const matched = sizes.find(s => s.id === id);
                                    setFormData(prev => ({
                                        ...prev,
                                        paper_order_size_id: id || null,
                                        paper_order_size: matched?.name || ''
                                    }));
                                }}
                                className="input-field"
                            >
                                <option value="">Select Size...</option>
                                {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <SectionHeader icon={FileText} title="Invoicing & Delivery" />
                        <div>
                            <label className="label">Inv No</label>
                            <input name="invoice_no" value={formData.invoice_no || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Batch No</label>
                            <input name="batch_no" value={formData.batch_no || ''} onChange={handleChange} className="input-field" placeholder="Auto-gen from Del Date" />
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
                        <div className="lg:col-span-2">
                            <label className="label">Delivery Address (From Product)</label>
                            <textarea
                                name="delivery_address"
                                value={formData.delivery_address || ''}
                                readOnly
                                className="input-field h-10 min-h-[40px] py-2 bg-slate-50 text-slate-600 font-medium"
                                placeholder="Address from product master..."
                            />
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
                            <label className="label">Shade Card (Manual)</label>
                            <input name="shade_card" value={formData.shade_card || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="label">Remarks / Comments</label>
                            <textarea name="remarks" value={(formData as any).remarks || ''} onChange={handleChange} className="input-field h-10 min-h-[40px] py-2" placeholder="Any additional instructions..." />
                        </div>
                    </div>
                </div>

                {/* --- SIDEBAR: Product Snapshot --- */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm">
                        <SectionHeader icon={Settings} title="Product Snapshot" />

                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-6">
                            {[
                                { label: 'UPS', name: 'ups' },
                                { label: 'Category', name: 'category_name' },
                                { label: 'Customer', name: 'customer_name' },
                                { label: 'Paper', name: 'paper_type_name' },
                                { label: 'GSM', name: 'gsm_value' },
                                { label: 'Size', name: 'print_size' },
                                { label: 'Dim.', name: 'dimension' },
                                { label: 'ink', name: 'ink' },
                                { label: 'Plate', name: 'plate_no' },
                                { label: 'Spec.', name: 'specification' },
                                { label: 'Artwork', name: 'artwork_code' }
                            ].map(f => (
                                <div key={f.name} className="col-span-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">{f.label}</label>
                                    <input name={f.name} value={(formData as any)[f.name] || ''} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] uppercase font-medium focus:ring-1 focus:ring-indigo-500 outline-none" />
                                </div>
                            ))}
                            <div className="col-span-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase">Special Effects</label>
                                <input name="special_effects" value={formData.special_effects || ''} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] uppercase font-medium" />
                            </div>
                        </div>

                        <SectionHeader icon={Zap} title="Automation Sync" />
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={sendToPrinter}
                                disabled={!formData.printer_mobile}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-bold transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <WhatsAppLogo className="w-4 h-4" />
                                Printer
                            </button>
                            <button
                                type="button"
                                onClick={sendToPaperwala}
                                disabled={!formData.paperwala_mobile}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <PaperwalaWhatsAppLogo className="w-4 h-4" />
                                Paper
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                        <SectionHeader icon={FileText} title="Documents" />
                        <div className="grid grid-cols-1 gap-2">
                            {['COA', 'Delivery Label', 'Shade Card'].map(doc => (
                                <button
                                    key={doc}
                                    type="button"
                                    onClick={() => generateDoc(doc)}
                                    className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    {doc}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <SectionHeader icon={Settings} title="Artwork" />
                        <div className="grid grid-cols-2 gap-3">
                            {formData.artwork_pdf ? (
                                <a href={formData.artwork_pdf} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-xl hover:bg-red-50 hover:border-red-100 transition-all group">
                                    <div className="w-8 h-8 mb-2 flex items-center justify-center bg-red-100 rounded-lg group-hover:scale-110 transition-transform">
                                        <PdfLogo className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-red-600">VIEW PDF</span>
                                </a>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-xl bg-slate-50 opacity-50">
                                    <div className="w-8 h-8 mb-2 flex items-center justify-center bg-slate-200 rounded-lg"><PdfLogo className="w-5 h-5 grayscale" /></div>
                                    <span className="text-[10px] font-bold text-slate-400">NO PDF</span>
                                </div>
                            )}

                            {formData.artwork_cdr ? (
                                <a href={formData.artwork_cdr} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-100 transition-all group">
                                    <div className="w-8 h-8 mb-2 flex items-center justify-center bg-emerald-100 rounded-lg group-hover:scale-110 transition-transform">
                                        <CdrLogo className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-600">VIEW CDR</span>
                                </a>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-xl bg-slate-50 opacity-50">
                                    <div className="w-8 h-8 mb-2 flex items-center justify-center bg-slate-200 rounded-lg"><CdrLogo className="w-5 h-5 grayscale" /></div>
                                    <span className="text-[10px] font-bold text-slate-400">NO CDR</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-indigo-900 rounded-xl p-5 text-white shadow-xl">
                        <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Final Actions
                        </h3>
                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-lg font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {initialData ? 'UPDATE ORDER' : 'CREATE ORDER'}
                            </button>

                            {initialData?.id && (
                                <button
                                    type="button"
                                    onClick={handleSplitOrder}
                                    className="w-full bg-indigo-800 hover:bg-indigo-700 text-indigo-100 py-3 rounded-lg font-bold border border-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Split className="w-4 h-4" />
                                    SPLIT DELIVERY
                                </button>
                            )}

                            <Link
                                href="/orders"
                                className="block text-center w-full bg-indigo-950/50 hover:bg-indigo-950 text-indigo-200 py-3 rounded-lg font-bold border border-indigo-800 active:scale-95 transition-all"
                            >
                                CANCEL
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
