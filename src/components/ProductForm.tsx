'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Product } from '@/types';
import { Loader2, Save, X, Upload } from 'lucide-react';
import Link from 'next/link';

type Props = {
    initialData?: Product | null;
};

export default function ProductForm({ initialData }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Hardcoded Coating Options (Enum)
    const COATING_OPTIONS = ['Varnish', 'Aqua Varnish', 'Gloss Lamination', 'Matt Lamination', 'Drip Off'];

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

            // Auto-sku for NEW products
            if (!initialData && existingSkus.status === 'fulfilled' && existingSkus.value.data) {
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
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : null }));
    };

    const handleEffectToggle = (id: string) => {
        const newEffects = selectedEffects.includes(id)
            ? selectedEffects.filter(e => e !== id)
            : [...selectedEffects, id];

        setSelectedEffects(newEffects);
        setFormData(prev => ({ ...prev, special_effects: newEffects.join('|') }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'artwork_pdf' | 'artwork_cdr') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Generate a standard name: ProductName_OriginalName.ext
        const ext = file.name.split('.').pop();
        const baseName = formData.product_name ? formData.product_name.replace(/\s+/g, '_') : 'Product';
        const typeSuffix = fieldName === 'artwork_pdf' ? 'ART' : 'CDR';
        const finalName = `${baseName}_${typeSuffix}.${ext}`;

        // Create FormData
        const data = new FormData();
        data.append('file', file);
        data.append('filename', finalName);

        // Upload
        try {
            // Show some loading indicator if we had one, but strict alert for now
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: data,
            });
            const json = await res.json();

            if (json.success) {
                setFormData(prev => ({ ...prev, [fieldName]: json.filename }));
                alert(`File uploaded successfully as: ${json.filename}`);
            } else {
                alert('Upload failed: ' + json.message);
            }
        } catch (err) {
            console.error(err);
            alert('Upload error. Check console.');
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
            } else {
                const { error } = await supabase.from('products').insert([payload]);
                if (error) throw error;
            }
            router.refresh();
            router.push('/products');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Failed to save. Did you run the latest SQL script?');
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
                            <select name="category_id" value={formData.category_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Customer</label>
                            <select name="customer_id" value={formData.customer_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Artwork Code</label>
                            <input name="artwork_code" value={formData.artwork_code || ''} onChange={handleChange} className="input-field" />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="label">SKU (Auto)</label>
                            <input name="sku" value={formData.sku || ''} onChange={handleChange} className="input-field bg-slate-50 font-mono text-xs" readOnly={!!initialData} />
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
                            <select name="paper_type_id" value={formData.paper_type_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select Paper</option>
                                {paperTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">GSM</label>
                            <select name="gsm_id" value={formData.gsm_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select GSM</option>
                                {gsms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Actual GSM Used</label>
                            <input name="actual_gsm_used" value={formData.actual_gsm_used || ''} onChange={handleChange} className="input-field" placeholder="U Value" />
                        </div>
                        <div>
                            <label className="label">Size</label>
                            <select name="size_id" value={formData.size_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select Size</option>
                                {sizes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
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
                            <select name="construction_id" value={formData.construction_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select Construction</option>
                                {constructions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Pasting</label>
                            <select name="pasting_id" value={formData.pasting_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select Pasting</option>
                                {pastings.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Coating</label>
                            <select name="coating" value={formData.coating || ''} onChange={handleChange} className="input-field">
                                <option value="">Select Coating</option>
                                <option value="">None</option>
                                {COATING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
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
                            <div className="mt-1 flex items-center space-x-2">
                                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Select PDF
                                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileChange(e, 'artwork_pdf')} />
                                </label>
                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{formData.artwork_pdf || 'No file selected'}</span>
                            </div>
                        </div>
                        <div>
                            <label className="label">Artwork CDR</label>
                            <div className="mt-1 flex items-center space-x-2">
                                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Select CDR
                                    <input type="file" accept=".cdr" className="hidden" onChange={(e) => handleFileChange(e, 'artwork_cdr')} />
                                </label>
                                <span className="text-xs text-slate-500 truncate max-w-[200px]">{formData.artwork_cdr || 'No file selected'}</span>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <label className="label">Delivery Address</label>
                            <select name="delivery_address_id" value={formData.delivery_address_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select Address</option>
                                {deliveryAddresses.map(c => <option key={c.id} value={c.id}>{c.name || c.address}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="label">Specification</label>
                            <select name="specification_id" value={formData.specification_id || ''} onChange={handleNumberChange} className="input-field">
                                <option value="">Select Specification</option>
                                {specifications.map(c => <option key={c.id} value={c.id}>{c.name || c.title}</option>)}
                            </select>
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
