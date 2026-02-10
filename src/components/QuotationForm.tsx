
'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Save, X, Calculator, ArrowLeft, Send, Search, Plus } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import PageHeader from '@/components/PageHeader';

export default function QuotationForm({ initialData }: { initialData?: any }) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [calculations, setCalculations] = useState<any>({});

    const [formData, setFormData] = useState({
        customer_id: null as number | null,
        product_id: null as string | null,
        customer: '',
        product_name: '',
        category: '',
        qty: '',
        date: new Date().toISOString().split('T')[0],

        // Dimensions
        size_h: '',
        size_w: '',
        gsm: '',
        rate_kg: '',

        // Paper
        ups_sheet: '',
        paper_order: '',
        buffer_qty: '',

        // Printing
        colour: '',
        printing_ups: '',
        printing_rate: '',
        print_size_h: '',
        print_size_w: '',

        // Finishing
        aqua_rt: '',
        punch_rate: '',
        punching_rt: '',
        plate_rate: '',
        pasting_rate: '',
        foil_pc: '',

        // Other
        extra_cost: '',
        packing_rate: '',
        interest_pc: 3,
        profit_pc: 11,

        ...initialData
    });

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        calculateAll();
    }, [formData]);

    async function fetchDropdowns() {
        const [cRes, pRes] = await Promise.all([
            supabase.from('customers').select('id, name').order('name'),
            supabase.from('products').select('id, product_name, sku, artwork_code').order('product_name')
        ]);
        if (cRes.data) setCustomers(cRes.data);
        if (pRes.data) setProducts(pRes.data.map(p => ({
            ...p,
            name: `${p.product_name} (${p.artwork_code || p.sku || 'No Code'})`
        })));
    }

    async function handleProductChange(productId: string | null) {
        if (!productId) {
            setFormData((prev: any) => ({ ...prev, product_id: null, product_name: '', category: '' }));
            return;
        }

        const selectedProd = products.find(p => p.id === productId);
        setFormData((prev: any) => ({
            ...prev,
            product_id: productId,
            product_name: selectedProd?.product_name || ''
        }));

        const { data: prod, error } = await supabase
            .from('products')
            .select('*, category:category_id(name), gsm:gsm_id(name), sizes:size_id(name)')
            .eq('id', productId)
            .single();

        if (prod) {
            // Parsing Logic for GSM
            const gsmValue = parseInt(prod.gsm?.name?.match(/\d+/)?.[0] || '0');

            // Parsing Logic for Size (e.g. "15x20" or "(500 x 300)")
            const sizeParts = prod.sizes?.name?.match(/(\d+(\.\d+)?)/g);
            const h = sizeParts?.[0] ? parseFloat(sizeParts[0]) : 0;
            const w = sizeParts?.[1] ? parseFloat(sizeParts[1]) : 0;

            console.log('Fetched Product Data:', prod); // Debugging

            setFormData((prev: any) => ({
                ...prev,
                category: prod.category?.name || '',
                gsm: gsmValue || prev.gsm,
                size_h: h || prev.size_h,
                size_w: w || prev.size_w
            }));
        }
    }

    const calculateAll = () => {
        const {
            qty, size_h, size_w, gsm, rate_kg, ups_sheet, buffer_qty,
            printing_ups, printing_rate, aqua_rt, punching_rt,
            plate_rate, pasting_rate, foil_pc, extra_cost, interest_pc,
            profit_pc, colour, packing_rate, print_size_h, print_size_w,
            punch_rate
        } = formData;

        // Helper to safely get number (default to 0 if blank/NaN)
        const val = (v: any) => Number(v) || 0;
        // Helper for divisors (default to 1 if 0/blank to avoid Infinity)
        const div = (v: any) => Number(v) || 1;

        const nQty = val(qty);
        const nUps = div(ups_sheet);

        const paperOrderQty = Math.ceil(nQty / nUps) + val(buffer_qty);
        const paperWeight = (val(size_h) * val(size_w) * val(gsm) * paperOrderQty) / 1550000;
        const paperCost = paperWeight * val(rate_kg);

        const packingAmt = paperWeight * val(packing_rate || 5.333);

        const printingQty = paperOrderQty * val(printing_ups);
        const printingAmt = (printingQty / 1000) * val(printing_rate) * val(colour);

        // Aqua coating: uses print dimensions if provided, otherwise sheet dimensions
        const effectivePrintH = val(print_size_h) || val(size_h);
        const effectivePrintW = val(print_size_w) || val(size_w);
        const aquaAmt = effectivePrintH * effectivePrintW * printingQty * val(aqua_rt);

        const punchingAmt = (printingQty / 1000) * val(punching_rt);
        const punchRateAmt = val(punch_rate); // Fixed Die Cost
        const plateAmt = val(plate_rate) * val(colour);
        const pastingAmt = (paperOrderQty * nUps / 1000) * val(pasting_rate);
        const foilAmt = printingQty * val(foil_pc);

        const subtotal = paperCost + packingAmt + printingAmt + aquaAmt + punchingAmt + punchRateAmt + plateAmt + pastingAmt + foilAmt + val(extra_cost);

        // Standard Sequential Logic:
        // 1. Interest on Subtotal (Costs)
        const interestAmt = subtotal * (val(interest_pc) / 100);

        // 2. Profit on (Subtotal + Interest)
        const profitAmt = (subtotal + interestAmt) * (val(profit_pc) / 100);

        // 3. Total (No GST)
        const totalAmount = subtotal + interestAmt + profitAmt;
        const divisorQty = div(qty);
        const ratePerPc = totalAmount / divisorQty;

        // Per piece breakdown
        const paperPcs = paperCost / divisorQty;
        const printingPcs = printingAmt / divisorQty;
        const platePcs = plateAmt / divisorQty;
        const coatingPcs = aquaAmt / divisorQty;
        const punchingPcs = punchingAmt / divisorQty;
        const pastingPcs = pastingAmt / divisorQty;
        const packingPcs = packingAmt / divisorQty;
        const extraPcs = val(extra_cost) / divisorQty;
        const subtotalPcs = subtotal / divisorQty;
        const foilPcs = foilAmt / divisorQty;
        const profitPcs = profitAmt / divisorQty;
        const interestPcs = interestAmt / divisorQty;

        const amountPerSheet = (val(size_h) * val(size_w) * val(gsm) * val(rate_kg)) / 1550000;
        const paperQty = nQty / nUps;

        setCalculations({
            amountPerSheet,
            paperQty,
            paperOrder: paperOrderQty,
            paperCost,
            paperWt: paperWeight,
            packingAmt,
            printingQty,
            printingAmt,
            aquaAmt,
            punchingAmt,
            plateAmt,
            pastingAmt,
            foilAmt,
            subtotal,
            interestAmt,
            profitAmt,
            totalAmt: totalAmount,
            ratePcs: ratePerPc,
            breakdown: {
                paperPcs, printingPcs, platePcs, coatingPcs, punchingPcs,
                punchRatePcs: punchRateAmt / divisorQty,
                pastingPcs, packingPcs, subtotalPcs, foilPcs, profitPcs,
                interestPcs, extraPcs
            }
        });
    };

    const handleChange = (e: any) => {
        const { name, value, type } = e.target;
        // Allow empty string for number fields to support clearing the input
        // If type is number, preserve empty string, otherwise parse
        const newValue = type === 'number' && value === '' ? '' : (type === 'number' ? parseFloat(value) : value);

        setFormData((prev: any) => ({
            ...prev,
            [name]: newValue
        }));
    };

    const handleSave = async () => {
        if (!formData.customer_id || !formData.product_id) {
            alert('Please select both Customer and Product');
            return;
        }

        setSaving(true);
        try {
            const num = (v: any) => (v === '' || v === null || isNaN(Number(v))) ? 0 : Number(v);

            const dataToSave: any = {
                ...formData,

                // Map calculations to snake_case
                amount_per_sheet: calculations.amountPerSheet,
                paper_qty: calculations.paperQty,
                paper_cost: calculations.paperCost,
                paper_wt: calculations.paperWt,
                packing_amt: calculations.packingAmt,
                printing_qty: calculations.printingQty,
                printing_amt: calculations.printingAmt,
                aqua_amt: calculations.aquaAmt,
                punching_amt: calculations.punchingAmt,
                plate_amt: calculations.plateAmt,
                pasting_amt: calculations.pastingAmt,
                foil_amt: calculations.foilAmt,
                subtotal: calculations.subtotal,
                interest_amt: calculations.interestAmt,
                profit_amt: calculations.profitAmt,
                total_amt: calculations.totalAmt,
                rate_pcs: calculations.ratePcs,

                // Explicitly clean all numeric inputs to avoid empty string errors
                qty: num(formData.qty),
                size_h: num(formData.size_h),
                size_w: num(formData.size_w),
                gsm: num(formData.gsm),
                rate_kg: num(formData.rate_kg),
                ups_sheet: num(formData.ups_sheet),
                paper_order: num(formData.paper_order),
                buffer_qty: num(formData.buffer_qty),
                colour: num(formData.colour),
                printing_ups: num(formData.printing_ups),
                printing_rate: num(formData.printing_rate),
                print_size_h: num(formData.print_size_h),
                print_size_w: num(formData.print_size_w),
                aqua_rt: num(formData.aqua_rt),
                punch_rate: num(formData.punch_rate),
                punching_rt: num(formData.punching_rt),
                plate_rate: num(formData.plate_rate),
                pasting_rate: num(formData.pasting_rate),
                foil_pc: num(formData.foil_pc),
                extra_cost: num(formData.extra_cost),
                packing_rate: num(formData.packing_rate),
                interest_pc: num(formData.interest_pc),
                profit_pc: num(formData.profit_pc),

                // Safe breakdown access
                subtotal_pcs: calculations.breakdown?.subtotalPcs || 0,
                paper_pcs: calculations.breakdown?.paperPcs || 0,
                printing_pcs: calculations.breakdown?.printingPcs || 0,
                plate_pcs: calculations.breakdown?.platePcs || 0,
                coating_pcs: calculations.breakdown?.coatingPcs || 0,
                punching_pcs: calculations.breakdown?.punchingPcs || 0,
                punch_rate_pcs: calculations.breakdown?.punchRatePcs || 0,
                pasting_pcs: calculations.breakdown?.pastingPcs || 0,
                foil_pcs: calculations.breakdown?.foilPcs || 0,
                profit_pcs: calculations.breakdown?.profitPcs || 0,
                interest_pcs: calculations.breakdown?.interestPcs || 0,
                packing_pcs: calculations.breakdown?.packingPcs || 0,
                extra_pcs: calculations.breakdown?.extraPcs || 0,
            };
            // delete dataToSave.breakdown; // No longer needed as we didn't spread calculations

            const { error } = await supabase.from('quotations').upsert(dataToSave);
            if (error) throw error;
            router.push('/quotations');
        } catch (error) {
            console.error('Error saving quotation:', error);
            alert(`Error saving quotation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-full mx-auto pb-10 px-2 font-montserrat">
            <PageHeader
                title="Quotation"
                icon={<Calculator className="w-6 h-6" />}
                showBackButton={true}
                actions={
                    <>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2 rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                    </>
                }
            />

            <div className="grid grid-cols-12 gap-1">
                {/* Left Side: Inputs */}
                <div className="col-span-12 lg:col-span-8 space-y-2">
                    {/* Customer & Product Section - Compact 2 Columns */}
                    <div className="bg-[#f8fafc] border border-slate-300 rounded-lg p-2 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                            <div className="space-y-2">
                                <div className="grid grid-cols-[60px,1fr] items-center gap-2">
                                    <label className="text-[9px] font-bold text-slate-900 uppercase tracking-wider">customer:</label>
                                    <SearchableSelect
                                        options={customers}
                                        value={formData.customer_id}
                                        onChange={(val) => {
                                            const cust = customers.find(c => c.id === val);
                                            setFormData((prev: any) => ({ ...prev, customer_id: val as number, customer: cust?.name || '' }));
                                        }}
                                        placeholder="Select Customer"
                                        inputClassName="w-full px-2 py-1 bg-white border border-slate-400 rounded shadow-sm text-[11px] md:text-xs focus:border-indigo-500 outline-none font-bold text-slate-950"
                                    />
                                </div>
                                <div className="grid grid-cols-[60px,1fr] items-center gap-2">
                                    <label className="text-[9px] font-bold text-slate-900 uppercase tracking-wider">Product:</label>
                                    <SearchableSelect
                                        options={products}
                                        value={formData.product_id}
                                        onChange={(val) => handleProductChange(val as string)}
                                        placeholder="Select Product"
                                        inputClassName="w-full px-2 py-1 bg-white border border-slate-400 rounded shadow-sm text-[11px] md:text-xs focus:border-indigo-500 outline-none font-bold text-slate-950"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-[60px,1fr] items-center gap-2">
                                    <label className="text-[9px] font-bold text-slate-900 uppercase tracking-wider">DATE</label>
                                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded shadow-sm text-[11px] md:text-xs outline-none font-bold text-slate-950" />
                                </div>
                                <div className="grid grid-cols-[60px,1fr] md:grid-cols-[60px,80px] items-center gap-2">
                                    <label className="text-[9px] font-bold text-indigo-900 uppercase tracking-wider">Qty (Nos)</label>
                                    <input type="number" name="qty" value={formData.qty} onChange={handleChange} className="w-full px-2 py-1 bg-indigo-50 border border-indigo-400 rounded text-[11px] md:text-xs font-bold text-indigo-950 focus:border-indigo-500 outline-none shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dimensions - Compact 5 Columns (2 Rows) */}
                    <div className="bg-[#f8fafc] border border-slate-300 rounded-lg p-2 shadow-sm">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {/* Row 1 */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">Size (H)</label>
                                <input type="number" name="size_h" value={formData.size_h} onChange={handleChange} className="w-full px-1.5 py-1 bg-white border border-slate-400 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">Size (W)</label>
                                <input type="number" name="size_w" value={formData.size_w} onChange={handleChange} className="w-full px-1.5 py-1 bg-white border border-slate-400 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">GSM</label>
                                <input type="number" name="gsm" value={formData.gsm} onChange={handleChange} className="w-full px-1.5 py-1 bg-white border border-slate-400 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">R1-Kg</label>
                                <input type="number" name="rate_kg" value={formData.rate_kg} onChange={handleChange} className="w-full px-1.5 py-1 bg-white border border-slate-400 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">Amt-Sheet</label>
                                <div className="px-1.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold text-slate-950">₹{calculations.amountPerSheet?.toFixed(2)}</div>
                            </div>

                            {/* Row 2 */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">UPS-Sheet</label>
                                <input type="number" name="ups_sheet" value={formData.ups_sheet} onChange={handleChange} className="w-full px-1.5 py-1 bg-white border border-slate-400 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-blue-900 uppercase">Paper QTY</label>
                                <div className="px-1.5 py-1 bg-blue-50 border border-blue-300 rounded text-xs font-mono font-bold text-blue-900">{calculations.paperQty?.toFixed(0)}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-indigo-900 uppercase">Paper Extra</label>
                                <input type="number" name="buffer_qty" value={formData.buffer_qty} onChange={handleChange} className="w-full px-1.5 py-1 bg-indigo-50 border border-indigo-300 rounded text-xs outline-none font-bold text-indigo-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-950 uppercase">Paper Order</label>
                                <div className="px-1.5 py-1 bg-slate-100 border border-slate-400 rounded text-xs font-mono font-black text-slate-950">{calculations.paperOrder}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-indigo-900 uppercase">PAPER Wt</label>
                                <div className="px-1.5 py-1 bg-indigo-50 border border-indigo-300 rounded text-xs font-mono font-black text-indigo-950">{calculations.paperWt?.toFixed(2)} KG</div>
                            </div>
                        </div>
                    </div>

                    {/* Production Specifications - Compact Grid */}
                    <div className="bg-[#f8fafc] border border-slate-300 rounded-lg p-2 shadow-sm space-y-2">
                        <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-1">Production Specifications</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-2 gap-y-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">colour</label>
                                <input type="number" name="colour" value={formData.colour} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">printing ups</label>
                                <input type="number" name="printing_ups" value={formData.printing_ups} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">Plate Rate</label>
                                <input type="number" name="plate_rate" value={formData.plate_rate} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">Print Rate</label>
                                <input type="number" name="printing_rate" value={formData.printing_rate} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">Aqua RT</label>
                                <input type="number" name="aqua_rt" value={formData.aqua_rt} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1 bg-amber-50/50 p-1 rounded border border-amber-400">
                                <label className="text-[9px] font-bold text-amber-900 uppercase">Punch Rate (Die)</label>
                                <input type="number" name="punch_rate" value={formData.punch_rate} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-xs outline-none font-bold text-amber-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">Punching RT</label>
                                <input type="number" name="punching_rt" value={formData.punching_rt} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">Pasting RT</label>
                                <input type="number" name="pasting_rate" value={formData.pasting_rate} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-900 uppercase">foil / PC</label>
                                <input type="number" name="foil_pc" value={formData.foil_pc} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </div>
                        </div>
                    </div>

                    {/* Margins & Taxes - 3 Columns (No GST) */}
                    <div className="bg-[#f8fafc] border border-slate-300 rounded-lg p-2 shadow-sm grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-indigo-900 uppercase tracking-widest">Extra Cost</label>
                            <input type="number" name="extra_cost" value={formData.extra_cost} onChange={handleChange} className="w-full px-2 py-1 bg-indigo-50 border border-indigo-300 rounded text-xs outline-none font-bold text-indigo-950 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">INTEREST %</label>
                            <input type="number" name="interest_pc" value={formData.interest_pc} onChange={handleChange} className="w-full px-2 py-1 bg-white border border-slate-400 rounded text-xs outline-none font-bold text-slate-950 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-emerald-900 uppercase tracking-widest">Profit %</label>
                            <input type="number" name="profit_pc" value={formData.profit_pc} onChange={handleChange} className="w-full px-2 py-1 bg-emerald-50 border border-emerald-300 rounded text-xs outline-none font-bold text-emerald-950 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>
                    </div>
                </div>

                {/* Right Side: Summary Table */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="bg-[#f1f5f9] border border-slate-300 rounded-xl overflow-hidden shadow-xl sticky top-6 mb-20 md:mb-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[300px]">
                                <thead className="bg-[#334155] text-white">
                                    <tr>
                                        <th className="py-2.5 md:py-3 px-3 md:px-4 text-left font-black uppercase text-[9px] md:text-[10px] tracking-widest border-r border-white/10">Breakdown</th>
                                        <th className="py-2.5 md:py-3 px-3 md:px-4 text-right font-black uppercase text-[9px] md:text-[10px] tracking-widest border-r border-white/10">Total (₹)</th>
                                        <th className="py-2.5 md:py-3 px-3 md:px-4 text-right font-black uppercase text-[9px] md:text-[10px] tracking-widest">Per PC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300 bg-[#e2e8f0]">
                                    <BreakdownRow label="Paper Cost" total={calculations.paperCost} perPc={calculations.breakdown?.paperPcs} />
                                    <BreakdownRow label="Plate Amt" total={calculations.plateAmt} perPc={calculations.breakdown?.platePcs} />
                                    <BreakdownRow label="Printing Amt" total={calculations.printingAmt} perPc={calculations.breakdown?.printingPcs} />
                                    <BreakdownRow label="Aqua Amt" total={calculations.aquaAmt} perPc={calculations.breakdown?.coatingPcs} />
                                    <BreakdownRow label="Punch Rate (Die)" total={calculations.breakdown?.punchRatePcs * Number(formData.qty)} perPc={calculations.breakdown?.punchRatePcs} />
                                    <BreakdownRow label="Punching Amt" total={calculations.punchingAmt} perPc={calculations.breakdown?.punchingPcs} />
                                    <BreakdownRow label="Pasting Amt" total={calculations.pastingAmt} perPc={calculations.breakdown?.pastingPcs} />
                                    <BreakdownRow label="Foil Amt" total={calculations.foilAmt} perPc={calculations.breakdown?.foilPcs} />
                                    <BreakdownRow label="Packing" total={calculations.packingAmt} perPc={calculations.breakdown?.packingPcs} />
                                    <BreakdownRow label="Extra Cost" total={Number(formData.extra_cost) || 0} perPc={calculations.breakdown?.extraPcs} />

                                    <tr className="bg-[#cbd5e1] font-bold border-y border-slate-300">
                                        <td className="py-2 px-3 md:px-4 text-slate-600 uppercase text-[8px] md:text-[9px] border-r border-slate-300">Cost Subtotal</td>
                                        <td className="py-2 px-3 md:px-4 text-right font-mono text-slate-700 border-r border-slate-300">₹{calculations.subtotal?.toFixed(2)}</td>
                                        <td className="py-2 px-3 md:px-4 text-right font-mono text-slate-600 text-[10px] md:text-xs">{(calculations.subtotal / (Number(formData.qty) || 1)).toFixed(4)}</td>
                                    </tr>

                                    <BreakdownRow label="Interest Amt" total={calculations.interestAmt} perPc={calculations.breakdown?.interestPcs} />
                                    <BreakdownRow label="Net Profit" total={calculations.profitAmt} perPc={calculations.breakdown?.profitPcs} color="text-indigo-900 font-bold" />

                                    <tr className="bg-slate-900 font-bold border-y-2 border-slate-900">
                                        <td className="py-2.5 px-3 md:px-4 text-white uppercase text-[9px] md:text-[10px] border-r border-slate-700">Net Total</td>
                                        <td className="py-2.5 px-3 md:px-4 text-right font-mono text-white border-r border-slate-700">₹{calculations.totalAmt?.toFixed(2)}</td>
                                        <td className="py-2.5 px-3 md:px-4 text-right font-mono text-amber-400 tracking-tighter text-[11px] md:text-sm">{calculations.ratePcs?.toFixed(4)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BreakdownRow({ label, total, perPc, color = "text-slate-800" }: any) {
    return (
        <tr className="hover:bg-slate-200/50 transition-colors">
            <td className="py-2 px-3 md:px-4 text-slate-900 font-bold text-[10px] md:text-[11px] uppercase">{label}</td>
            <td className="py-2 px-3 md:px-4 text-right font-mono text-black text-[10px] md:text-xs font-bold">₹{total?.toFixed(2) || '0.00'}</td>
            <td className={`py-2 px-3 md:px-4 text-right font-mono ${color} text-[10px] md:text-xs font-bold`}>{perPc?.toFixed(4) || '0.0000'}</td>
        </tr>
    );
}
