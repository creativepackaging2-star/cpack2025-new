import { supabase } from '@/utils/supabase/client';
import Link from 'next/link';
import { ArrowLeft, Edit2, FileText, Upload } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

export const revalidate = 0;

export default async function ProductDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;

    // 1. Fetch Raw Product
    const productPromise = supabase.from('products').select('*').eq('id', id).single();

    // 2. Fetch Orders
    const ordersPromise = supabase
        .from('orders')
        .select('id, quantity, delivery_date, qty_delivered')
        .eq('product_id', id)
        .order('created_at', { ascending: false });

    // 3. Fetch All Lookups (Parallel)
    const lookupsPromise = Promise.all([
        supabase.from('category').select('id, name'),
        supabase.from('customers').select('id, name'),
        supabase.from('paper_types').select('id, name'),
        supabase.from('gsm').select('id, name'),
        supabase.from('sizes').select('id, name'),
        supabase.from('constructions').select('id, name'),
        supabase.from('pasting').select('id, name'),
        supabase.from('specifications').select('id, name'),
        supabase.from('delivery_addresses').select('id, name'), // No 'address' col
        supabase.from('special_effects').select('id, name')
    ]);

    const [productRes, ordersRes, lookupRes] = await Promise.all([
        productPromise,
        ordersPromise,
        lookupsPromise
    ]);

    const product = productRes.data;
    const error = productRes.error;
    const orders = ordersRes.data || [];

    // Destructure Lookups
    const [
        catRes, custRes, paperRes, gsmRes, sizeRes,
        consRes, pastRes, specRes, delRes, effRes
    ] = lookupRes;

    // Helper to create IDs Map
    const createMap = (data: any[]) => {
        const map = new Map();
        if (data) data.forEach((item: any) => map.set(item.id, item));
        return map;
    };

    const maps = {
        category: createMap(catRes.data || []),
        customer: createMap(custRes.data || []),
        paper: createMap(paperRes.data || []),
        gsm: createMap(gsmRes.data || []),
        size: createMap(sizeRes.data || []),
        construction: createMap(consRes.data || []),
        pasting: createMap(pastRes.data || []),
        specification: createMap(specRes.data || []),
        delivery: createMap(delRes.data || []),
        effects: createMap(effRes.data || [])
    };

    if (error || !product) {
        if (process.env.NODE_ENV === 'development') console.error(error);
        notFound();
    }

    // Effect Name Resolver
    const getEffectNames = (str: string | null) => {
        if (!str) return [];
        return str.split(/[|/]/).map(id => id.trim()).filter(Boolean).map(id => {
            const e = maps.effects.get(parseInt(id));
            return e ? e.name : id;
        });
    };

    // Helper to get Name safely
    const getName = (map: Map<any, any>, id: number | null) => {
        if (!id) return '-';
        const item = map.get(id);
        return item ? item.name : '-';
    };

    const effectNames = product ? getEffectNames(product.special_effects) : [];

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <Link href="/products" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Products
                </Link>
                <Link
                    href={`/products/${id}/edit`}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Product
                </Link>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
                <div className="border-b border-slate-200 pb-4 flex justify-between items-center bg-slate-50/50 -mx-8 -mt-8 px-8 py-4 rounded-t-xl">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{product.product_name}</h1>
                        <p className="text-sm text-slate-500 mt-1">SKU: {product.sku || '-'}</p>
                    </div>
                    <div className="text-right">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            Read Only View
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* 1. Basic Information */}
                    <div className="space-y-4 lg:col-span-3">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Basic Info</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="lg:col-span-2">
                                <DetailItem label="Product Name" value={product.product_name} />
                            </div>
                            <DetailItem label="Category" value={getName(maps.category, product.category_id)} />
                            <DetailItem label="Customer" value={getName(maps.customer, product.customer_id)} />
                            <DetailItem label="Artwork Code" value={product.artwork_code || '-'} />
                            <DetailItem label="UPS (Units/Sheet)" value={product.ups || '-'} />
                        </div>
                    </div>

                    {/* 2. Paper & Dimensions */}
                    <div className="space-y-4 lg:col-span-3">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Paper & Size</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DetailItem label="Paper Type" value={getName(maps.paper, product.paper_type_id)} />
                            <DetailItem label="GSM" value={getName(maps.gsm, product.gsm_id)} />
                            <DetailItem label="Size" value={getName(maps.size, product.size_id)} />
                            <DetailItem label="Dimensions (WxHxD)" value={product.dimension || '-'} />
                            <DetailItem label="Folding Dimension" value={product.folding_dim || '-'} />
                            <DetailItem label="Folding" value={product.folding || '-'} />
                        </div>
                    </div>

                    {/* 2.5 Printing Details */}
                    <div className="space-y-4 lg:col-span-3">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Printing</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem label="Ink" value={product.ink || '-'} />
                            <DetailItem label="Plate No" value={product.plate_no || '-'} />
                        </div>
                    </div>

                    {/* 3. Manufacturing */}
                    <div className="space-y-4 lg:col-span-3">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Manufacturing & Finishing</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DetailItem label="Construction" value={getName(maps.construction, product.construction_id)} />
                            <DetailItem label="Pasting" value={getName(maps.pasting, product.pasting_id)} />
                            <DetailItem label="Coating" value={product.coating || '-'} />
                            <div className="md:col-span-3">
                                <dt className="text-xs font-medium text-slate-500 uppercase mb-1">Special Effects</dt>
                                <div className="flex flex-wrap gap-2 border border-slate-200 p-3 rounded-md bg-slate-50 min-h-[42px]">
                                    {effectNames.length > 0 ? (
                                        effectNames.map((name, i) => <Badge key={i}>{name}</Badge>)
                                    ) : (
                                        <span className="text-sm text-slate-400">-</span>
                                    )}
                                </div>
                            </div>
                            <DetailItem label="U" value={product.actual_gsm_used || '-'} />
                        </div>
                    </div>

                    {/* 4. Files & Extras */}
                    <div className="space-y-4 lg:col-span-3">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Files & Logistics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem label="Artwork PDF" value={
                                product.artwork_pdf ? (
                                    <a
                                        href={`/uploads/${product.artwork_pdf}`}
                                        download
                                        target="_blank"
                                        className="text-indigo-600 underline flex items-center gap-1 hover:text-indigo-800"
                                    >
                                        <FileText className="h-4 w-4" /> {product.artwork_pdf}
                                    </a>
                                ) : '-'
                            } />
                            <DetailItem label="Artwork CDR" value={
                                product.artwork_cdr ? (
                                    <a
                                        href={`/uploads/${product.artwork_cdr}`}
                                        download
                                        target="_blank"
                                        className="text-indigo-600 underline flex items-center gap-1 hover:text-indigo-800"
                                    >
                                        <Upload className="h-4 w-4" /> {product.artwork_cdr}
                                    </a>
                                ) : '-'
                            } />
                            <DetailItem label="Delivery Address" value={(() => {
                                const d = maps.delivery.get(product.delivery_address_id);
                                return d ? (d.name) : '-'; // Only name available
                            })()} />
                            <DetailItem label="Specification" value={getName(maps.specification, product.specification_id)} />
                            <div className="md:col-span-2">
                                <dt className="text-xs font-medium text-slate-500 uppercase mb-1">Detailed Specs / Notes</dt>
                                <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap rounded-md bg-slate-50 p-3 border border-slate-200 min-h-[80px]">
                                    {product.specs || product.spec || '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Related Orders Section */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900">Related Orders</h2>
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-200 rounded-full text-slate-600">{orders.length}</span>
                </div>

                {orders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Qty Req</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Delivery Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Qty Delivered</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {orders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {order.quantity?.toLocaleString() || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {order.qty_delivered?.toLocaleString() || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link href={`/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                                                View Order
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        No orders found for this product.
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailItem({ label, value }: { label: string, value: ReactNode }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500 uppercase mb-1">{label}</dt>
            <dd className="block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 min-h-[38px] flex items-center">
                {value}
            </dd>
        </div>
    );
}

function Badge({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
            {children}
        </span>
    );
}
