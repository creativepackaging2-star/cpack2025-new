'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Product } from '@/types';
import { twMerge } from 'tailwind-merge';
import { Loader2, Save, X } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';

type Props = {
    initialData?: Product | null;
};

export default function ProductForm({ initialData }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Hardcoded Coating Options (Enum)
    const COATING_OPTIONS = ['Varnish', 'Aqua Varnish', 'Gloss Lamination', 'Matt Lamination', 'Drip Off', 'UV'];

    // Dropdown Data
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
    const [paperTypes, setPaperTypes] = useState<{ id: number; name: string }[]>([]);
    const [gsms, setGsms] = useState<{ id: number; name: string }[]>([]);
    const [sizes, setSizes] = useState<{ id: number; name: string }[]>([]);
    const [constructions, setConstructions] = useState<{ id: number; name: string }[]>([]);
    const [pastings, setPastings] = useState<{ id: number; name: string }[]>([]);
    const [specialEffects, setSpecialEffects] = useState<{ id: number; name: string }[]>([]);

    // New Dropdowns
    const [specifications, setSpecifications] = useState<{ id: number; name?: string; title?: string }[]>([]);
    const [deliveryAddresses, setDeliveryAddresses] = useState<{ id: number; address?: string; name?: string }[]>([]);

    // Form State
    const [formData, setFormData] = useState<Partial<any>>(
        initialData || {
            product_name: '',
            sku: '',
            artwork_code: '',
            category_id: null,
            customer_id: null,
            paper_type_id: null,
            gsm_id: null,
            size_id: null,
            dimension: '',
            folding_dim: '',
            folding: '',
            ink: '',
            plate_no: '',
            coating: '', // String ENUM
            construction_id: null,
            pasting_id: null,
            special_effects: '',
            specification_id: null, // Lookup
            specs: '', // Textarea
            ups: null,
            artwork_pdf: '',
            artwork_cdr: '',
            delivery_address_id: null,
            actual_gsm_used: ''
        }
    );

    // Multi-select state
    const [selectedEffects, setSelectedEffects] = useState<string[]>([]);

    useEffect(() => {
        if (initialData?.special_effects) {
            setSelectedEffects(initialData.special_effects.split('|'));
        }
    }, [initialData]);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    async function fetchDropdowns() {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                supabase.from('category').select('id, name'),
                supabase.from('customers').select('id, name'),
                supabase.from('paper_types').select('id, name'),
                supabase.from('gsm').select('id, name'),
                supabase.from('sizes').select('id, name'),
                supabase.from('constructions').select('id, name'),
                supabase.from('pasting').select('id, name'),
                supabase.from('special_effects').select('id, name'),
                supabase.from('specifications').select('id, name'),
                supabase.from('delivery_addresses').select('id, name'),
                supabase.from('products').select('sku').order('sku', { ascending: false }).limit(20)
            ]);

            const [cat, cust, paper, gsm, size, cons, past, eff, specs, addr, existingSkus] = results;

            if (cat.status === 'fulfilled' && cat.value.data) setCategories(cat.value.data);
            if (cust.status === 'fulfilled' && cust.value.data) setCustomers(cust.value.data);
            if (paper.status === 'fulfilled' && paper.value.data) setPaperTypes(paper.value.data);
            if (gsm.status === 'fulfilled' && gsm.value.data) setGsms(gsm.value.data);
            if (size.status === 'fulfilled' && size.value.data) setSizes(size.value.data);
            if (cons.status === 'fulfilled' && cons.value.data) setConstructions(cons.value.data);
            if (past.status === 'fulfilled' && past.value.data) setPastings(past.value.data);
            if (eff.status === 'fulfilled' && eff.value.data) setSpecialEffects(eff.value.data);
            if (specs.status === 'fulfilled' && specs.value.data) setSpecifications(specs.value.data);
            if (addr.status === 'fulfilled' && addr.value.data) setDeliveryAddresses(addr.value.data);

            // Auto-sku for NEW products (including Copies which have no ID)
            if ((!initialData || !initialData.id) && existingSkus.status === 'fulfilled' && existingSkus.value.data) {
                const skus = existingSkus.value.data.map(p => parseInt(p.sku)).filter(n => !isNaN(n));
                const nextSku = skus.length > 0 ? Math.max(...skus) + 1 : 1001;
                setFormData(prev => ({ ...prev, sku: String(nextSku) }));
            }

        } catch (e) {
            console.error('Error fetching dropdowns', e);
        }
        setLoading(false);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        startTransition(() => {
            setFormData(prev => ({ ...prev, [name]: value }));
        });
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        startTransition(() => {
            setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : null }));
        });
    };

    const handleEffectToggle = (id: string) => {
        const newEffects = selectedEffects.includes(id)
            ? selectedEffects.filter(e => e !== id)
            : [...selectedEffects, id];

        setSelectedEffects(newEffects);
        setFormData(prev => ({ ...prev, special_effects: newEffects.join('|') }));
    };

    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [uploadingCdr, setUploadingCdr] = useState(false);
    const [confirmDeletePdf, setConfirmDeletePdf] = useState(false);
    const [confirmDeleteCdr, setConfirmDeleteCdr] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleGenericAdd = async (table: string, name: string, setState: any, fieldName: string) => {
        try {
            const { data, error } = await supabase.from(table).insert([{ name }]).select('id, name').single();
            if (error) throw error;

            if (data) {
                startTransition(() => {
                    setState((prev: any[]) => [...prev, data]);
                    setFormData((prev: any) => ({ ...prev, [fieldName]: data.id }));
                });
                return data; // Return for SearchableSelect to know it succeeded
            }
        } catch (error: any) {
            console.error(`Error adding to ${table}:`, error);
            alert(`Failed to add new item: ${error.message}`);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'artwork_pdf' | 'artwork_cdr') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const setUploading = fieldName === 'artwork_pdf' ? setUploadingPdf : setUploadingCdr;
        setUploading(true);

        try {
            // 1. Precise Naming: [Product Name].pdf or [Product Name].cdr
            const ext = fieldName === 'artwork_pdf' ? 'pdf' : 'cdr';
            const cleanName = (formData.product_name || 'Product').replace(/[/\\?%*:|"<>]/g, '').trim();
            const finalName = `${cleanName}.${ext}`;
            const filePath = finalName; // Save at root

            // 2. Upload to Supabase Storage (Bucket: 'product-files')
            const { error } = await supabase.storage
                .from('product-files')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            // 3. Get Public URL
            const { data: urlData } = supabase.storage
                .from('product-files')
                .getPublicUrl(filePath);

            if (urlData.publicUrl) {
                startTransition(() => {
                    setFormData(prev => ({ ...prev, [fieldName]: urlData.publicUrl }));
                });
            }

        } catch (err: any) {
            console.error('Upload Error:', err);
            alert(`Upload Failed! ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async (fieldName: 'artwork_pdf' | 'artwork_cdr') => {
        const fileUrl = formData[fieldName];
        if (!fileUrl) return;

        const isPdf = fieldName === 'artwork_pdf';
        const hasConfirmed = isPdf ? confirmDeletePdf : confirmDeleteCdr;

        if (!hasConfirmed) {
            if (isPdf) setConfirmDeletePdf(true);
            else setConfirmDeleteCdr(true);

            // Auto-reset confirmation after 4 seconds
            setTimeout(() => {
                if (isPdf) setConfirmDeletePdf(false);
                else setConfirmDeleteCdr(false);
            }, 4000);
            return;
        }

        const setUploading = isPdf ? setUploadingPdf : setUploadingCdr;
        setUploading(true);

        try {
            const pathParts = fileUrl.split('/product-files/');
            const filePath = pathParts.length > 1 ? pathParts[1] : null;

            if (filePath) {
                const { error } = await supabase.storage
                    .from('product-files')
                    .remove([filePath]);
                if (error) throw error;
            }

            startTransition(() => {
                setFormData(prev => ({ ...prev, [fieldName]: '' }));
                if (isPdf) setConfirmDeletePdf(false);
                else setConfirmDeleteCdr(false);
            });

        } catch (err: any) {
            console.error('Delete Error:', err);
            alert(`Failed to delete file: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...formData };
            payload.special_effects = selectedEffects.join('|');

            // Exclude generated columns
            delete payload.specs;

            if (initialData?.id) {
                const { error } = await supabase.from('products').update(payload).eq('id', initialData.id);
                if (error) throw error;
                console.log('Product updated successfully. Sync handled by SQL Trigger.');
            } else {
                const { error } = await supabase.from('products').insert([payload]);
                if (error) throw error;
                console.log('Product created successfully.');
            }
            router.refresh();
            router.push('/products');
        } catch (error: any) {
            console.error('Error saving:', error);
            alert(`Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 bg-white p-4 md:p-8 rounded-xl border border-slate-200 shadow-sm max-w-6xl mx-auto mb-10">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-bold text-slate-800">{initialData ? 'Edit Product' : 'New Product'}</h2>
                <Link href="/products" className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Basic Information */}
                <div className="space-y-4 lg:col-span-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Basic Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                            <label className="label">Product Name</label>
                            <input name="product_name" value={formData.product_name || ''} onChange={handleChange} className="input-field" required />
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <SearchableSelect
                                options={categories}
                                value={formData.category_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, category_id: val }))}
                                onAdd={(name) => handleGenericAdd('category', name, setCategories, 'category_id')}
                                placeholder="Select or Add Category"
                            />
                        </div>
                        <div>
                            <label className="label">Customer</label>
                            <SearchableSelect
                                options={customers}
                                value={formData.customer_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, customer_id: val }))}
                                onAdd={(name) => handleGenericAdd('customers', name, setCustomers, 'customer_id')}
                                placeholder="Select or Add Customer"
                            />
                        </div>
                        <div>
                            <label className="label">Artwork Code</label>
                            <input name="artwork_code" value={formData.artwork_code || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="label">SKU (Auto)</label>
                            <input name="sku" value={formData.sku || ''} onChange={handleChange} className="input-field bg-slate-50 font-mono text-xs" readOnly={!!initialData?.id} />
                        </div>
                        <div>
                            <label className="label">UPS (Units/Sheet)</label>
                            <input type="number" name="ups" value={formData.ups || ''} onChange={handleNumberChange} className="input-field" />
                        </div>
                    </div>
                </div>

                {/* 2. Paper & Dimensions */}
                <div className="space-y-4 lg:col-span-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Paper & Size</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="label">Paper Type</label>
                            <SearchableSelect
                                options={paperTypes}
                                value={formData.paper_type_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, paper_type_id: val }))}
                                onAdd={(name) => handleGenericAdd('paper_types', name, setPaperTypes, 'paper_type_id')}
                                placeholder="Select or Add Paper"
                            />
                        </div>
                        <div>
                            <label className="label">GSM</label>
                            <SearchableSelect
                                options={gsms}
                                value={formData.gsm_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, gsm_id: val }))}
                                onAdd={(name) => handleGenericAdd('gsm', name, setGsms, 'gsm_id')}
                                placeholder="Select or Add GSM"
                            />
                        </div>
                        <div>
                            <label className="label">Actual GSM Used</label>
                            <input name="actual_gsm_used" value={formData.actual_gsm_used || ''} onChange={handleChange} className="input-field" placeholder="U Value" />
                        </div>
                        <div>
                            <label className="label">Size</label>
                            <SearchableSelect
                                options={sizes}
                                value={formData.size_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, size_id: val }))}
                                onAdd={(name) => handleGenericAdd('sizes', name, setSizes, 'size_id')}
                                placeholder="Select or Add Size"
                            />
                        </div>
                        <div>
                            <label className="label">Dimensions (WxHxD)</label>
                            <input name="dimension" value={formData.dimension || ''} onChange={handleChange} placeholder="e.g. 10 x 20 x 5" className="input-field" />
                        </div>
                        <div>
                            <label className="label">Folding Dimension</label>
                            <input name="folding_dim" value={formData.folding_dim || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Folding</label>
                            <input name="folding" value={formData.folding || ''} onChange={handleChange} className="input-field" />
                        </div>
                    </div>
                </div>

                {/* 2.5 Printing Details */}
                <div className="space-y-4 lg:col-span-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Printing</h3>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Ink</label>
                            <input name="ink" value={formData.ink || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Plate No</label>
                            <input name="plate_no" value={formData.plate_no || ''} onChange={handleChange} className="input-field" />
                        </div>
                    </div>
                </div>

                {/* 3. Manufacturing */}
                <div className="space-y-4 lg:col-span-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Manufacturing & Finishing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="label">Construction</label>
                            <SearchableSelect
                                options={constructions}
                                value={formData.construction_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, construction_id: val }))}
                                onAdd={(name) => handleGenericAdd('constructions', name, setConstructions, 'construction_id')}
                                placeholder="Select or Add Construction"
                            />
                        </div>
                        <div>
                            <label className="label">Pasting</label>
                            <SearchableSelect
                                options={pastings}
                                value={formData.pasting_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, pasting_id: val }))}
                                onAdd={(name) => handleGenericAdd('pasting', name, setPastings, 'pasting_id')}
                                placeholder="Select or Add Pasting"
                            />
                        </div>
                        <div>
                            <label className="label">Coating</label>
                            <SearchableSelect
                                options={[{ id: '', name: 'None' }, ...COATING_OPTIONS.map(opt => ({ id: opt, name: opt }))]}
                                value={formData.coating}
                                onChange={(val) => setFormData(prev => ({ ...prev, coating: val || '' }))}
                                placeholder="Select Coating"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="label mb-2 block">Special Effects</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-slate-200 p-3 rounded-md bg-slate-50">
                                {specialEffects.map(effect => (
                                    <label key={effect.id} className="inline-flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-slate-200 hover:border-indigo-300 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedEffects.includes(String(effect.id))}
                                            onChange={() => handleEffectToggle(String(effect.id))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                        />
                                        <span className="text-sm text-slate-700">{effect.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Files & Extras */}
                <div className="space-y-4 lg:col-span-3">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Files & Logistics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Artwork PDF</label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => handleFileChange(e, 'artwork_pdf')}
                                        disabled={uploadingPdf}
                                        className={`block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${uploadingPdf ? 'opacity-50' : 'file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100'}`}
                                    />
                                    {uploadingPdf && (
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                            <span className="ml-2 text-xs text-indigo-600 font-bold">Uploading...</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    name="artwork_pdf"
                                    value={formData.artwork_pdf || ''}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Link will appear here..."
                                />
                            </div>
                            {formData.artwork_pdf && (
                                <div className="flex items-center gap-3 mt-1">
                                    <a href={formData.artwork_pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline font-bold">
                                        View Uploaded PDF →
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteFile('artwork_pdf')}
                                        className={twMerge(
                                            "text-[10px] px-2 py-0.5 rounded border transition-all font-bold",
                                            confirmDeletePdf
                                                ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                                                : "bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white"
                                        )}
                                    >
                                        {confirmDeletePdf ? 'Click again to confirm' : 'Delete File'}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="label">Artwork CDR</label>
                            <div className="space-y-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".cdr,.zip,.rar"
                                        onChange={(e) => handleFileChange(e, 'artwork_cdr')}
                                        disabled={uploadingCdr}
                                        className={`block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${uploadingCdr ? 'opacity-50' : 'file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100'}`}
                                    />
                                    {uploadingCdr && (
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                            <span className="ml-2 text-xs text-indigo-600 font-bold">Uploading...</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    name="artwork_cdr"
                                    value={formData.artwork_cdr || ''}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Link will appear here..."
                                />
                            </div>
                            {formData.artwork_cdr && (
                                <div className="flex items-center gap-3 mt-1">
                                    <a href={formData.artwork_cdr} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline font-bold">
                                        View Uploaded CDR →
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteFile('artwork_cdr')}
                                        className={twMerge(
                                            "text-[10px] px-2 py-0.5 rounded border transition-all font-bold",
                                            confirmDeleteCdr
                                                ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                                                : "bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white"
                                        )}
                                    >
                                        {confirmDeleteCdr ? 'Click again to confirm' : 'Delete File'}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-1">
                            <label className="label">Delivery Address</label>
                            <SearchableSelect
                                options={deliveryAddresses.map(d => ({ ...d, name: d.name || d.address || 'Unknown Address' }))}
                                value={formData.delivery_address_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, delivery_address_id: val }))}
                                placeholder="Search Address"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="label">Specification</label>
                            <SearchableSelect
                                options={specifications.map(s => ({ ...s, name: s.name || s.title || 'Unknown Spec' }))}
                                value={formData.specification_id}
                                onChange={(val) => setFormData(prev => ({ ...prev, specification_id: val }))}
                                placeholder="Search Specification"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Detailed Specs / Notes</label>
                            <textarea name="specs" value={formData.specs || ''} onChange={handleChange} rows={3} className="input-field" placeholder="Enter additional details..." />
                        </div>
                    </div>
                </div>

            </div>

            <div className="flex justify-end pt-5">
                <Link href="/products" className="btn-secondary mr-3">Cancel</Link>
                <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Product</>}
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
