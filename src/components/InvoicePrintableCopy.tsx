'use client';

import React from 'react';
import { CompanyName } from './GenerateDocsModal';

export interface InvoiceCopyItem {
    orderId: number | string;
    materialCode?: string;
    exactPoName: string;
    packingDetail: string;
    hsn: string;
    gstRate?: number;
    deliveryQty: number;
    rate: number;
    amount: number;
}

interface InvoicePrintableCopyProps {
    copyType: 'ORIGINAL FOR RECIPIENT' | 'DUPLICATE FOR TRANSPORTER' | 'TRIPLICATE FOR SUPPLIER';
    company: CompanyName;
    invoiceNo: string;
    invoiceDate: string;
    poNumber: string;
    customerName: string;
    deliveryAddress: string;
    taxType: 'IGST' | 'CGST_SGST';
    items: InvoiceCopyItem[];
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
    taxBreakdown?: {
        taxable5: number;
        tax5: number;
        taxable18: number;
        tax18: number;
        totalTax: number;
    };
}

const COMPANY_CONFIG: Record<CompanyName, {
    fullName: string;
    address: string;
    city: string;
    gstin: string;
    state: string;
    stateCode: string;
    phone: string;
    email: string;
    logo: string;
    signature: string;
    signLabel: string;
    logoWidth: string;
}> = {
    'Creative Packaging': {
        fullName: 'CREATIVE PACKAGING',
        address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli',
        city: 'Mumbai - 400 030, Maharashtra, India',
        gstin: '27AAIPS3624G1ZL',
        state: 'Maharashtra',
        stateCode: '27',
        phone: '8097032001',
        email: 'creativepackaging@outlook.com',
        logo: '/logo_packaging.png',
        signature: '/sign_packaging.png',
        signLabel: 'Authorised Signatory',
        logoWidth: 'w-48',
    },
    'Creative Printers': {
        fullName: 'CREATIVE PRINTERS',
        address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli',
        city: 'Mumbai - 400 030, Maharashtra, India',
        gstin: '27CGTPS8217E1ZT',
        state: 'Maharashtra',
        stateCode: '27',
        phone: '8097032001',
        email: 'creativepackaging@outlook.com',
        logo: '/logo_printers.png',
        signature: '/sign_printers.png',
        signLabel: 'Proprietor',
        logoWidth: 'w-56',
    },
    'Creative Enterprise': {
        fullName: 'CREATIVE ENTERPRISE',
        address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli',
        city: 'Mumbai - 400 030, Maharashtra, India',
        gstin: '27AARHP2206E1Z8',
        state: 'Maharashtra',
        stateCode: '27',
        phone: '9146178720',
        email: 'creativepackaging@outlook.com',
        logo: '/creative_logo.png',
        signature: '/pr_shah_sign_new.png',
        signLabel: 'Proprietor',
        logoWidth: 'w-60',
    },
};

function numberToIndianWords(num: number): string {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
        if (n === 0) return '';
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + inWords(n % 100);
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
        return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
    };

    const whole = Math.floor(num);
    const decimal = Math.round((num - whole) * 100);
    let str = inWords(whole).trim();
    if (!str) str = 'Zero';
    str = 'INR ' + str;
    if (decimal > 0) {
        str += ' and ' + inWords(decimal).trim() + 'Paise';
    }
    return str + ' Only';
}

export default function InvoicePrintableCopy({
    copyType,
    company,
    invoiceNo,
    invoiceDate,
    poNumber,
    customerName,
    deliveryAddress,
    taxType,
    items,
    subtotal,
    taxAmount,
    grandTotal,
    taxBreakdown,
}: InvoicePrintableCopyProps) {
    const config = COMPANY_CONFIG[company] || COMPANY_CONFIG['Creative Packaging'];
    const totalQty = items.reduce((sum, it) => sum + (it.deliveryQty || 0), 0);

    // Compute breakdown if not explicitly passed
    const computedBreakdown = React.useMemo(() => {
        if (taxBreakdown) return taxBreakdown;
        let t5 = 0;
        let t18 = 0;
        let tb5 = 0;
        let tb18 = 0;
        for (const it of items) {
            const amt = it.amount || (it.deliveryQty * it.rate);
            const rate = it.gstRate || (it.hsn?.startsWith('4821') ? 18 : 5);
            if (rate === 5) {
                tb5 += amt;
                t5 += amt * 0.05;
            } else {
                tb18 += amt;
                t18 += amt * 0.18;
            }
        }
        return {
            taxable5: tb5,
            tax5: Math.round(t5 * 100) / 100,
            taxable18: tb18,
            tax18: Math.round(t18 * 100) / 100,
            totalTax: Math.round((t5 + t18) * 100) / 100,
        };
    }, [items, taxBreakdown]);

    return (
        <div className="invoice-copy-page bg-white text-slate-900 font-sans p-8 md:p-10 border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-6 print:m-0 w-full max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between"
            style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
        >
            <div>
                {/* Copy Badge Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        TAX INVOICE
                    </span>
                    <span className="px-3 py-1 rounded bg-slate-900 text-white font-extrabold text-[10px] tracking-widest uppercase">
                        {copyType}
                    </span>
                </div>

                {/* Company Header */}
                <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="space-y-1">
                        <div className={`${config.logoWidth} mb-2`}>
                            <img src={config.logo} alt={config.fullName} className="max-h-16 w-auto object-contain" />
                        </div>
                        <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                            {config.fullName}
                        </h2>
                        <p className="text-[11px] text-slate-600 leading-snug">{config.address}</p>
                        <p className="text-[11px] text-slate-600 leading-snug">{config.city}</p>
                        <p className="text-[11px] text-slate-700 font-bold mt-1">
                            GSTIN: <span className="font-mono text-slate-950">{config.gstin}</span> | State: {config.state} ({config.stateCode})
                        </p>
                        <p className="text-[10px] text-slate-500">
                            Email: {config.email} | Mobile: {config.phone}
                        </p>
                    </div>

                    {/* Invoice Meta Table */}
                    <div className="border border-slate-300 rounded text-xs shrink-0 w-64 overflow-hidden bg-slate-50/50">
                        <div className="flex border-b border-slate-300">
                            <span className="w-24 p-1.5 font-bold text-slate-600 bg-slate-100 border-r border-slate-300 text-[10px] uppercase">Invoice No:</span>
                            <span className="p-1.5 font-mono font-bold text-slate-900">{invoiceNo}</span>
                        </div>
                        <div className="flex border-b border-slate-300">
                            <span className="w-24 p-1.5 font-bold text-slate-600 bg-slate-100 border-r border-slate-300 text-[10px] uppercase">Date:</span>
                            <span className="p-1.5 font-bold text-slate-900">{invoiceDate}</span>
                        </div>
                        <div className="flex border-b border-slate-300">
                            <span className="w-24 p-1.5 font-bold text-slate-600 bg-slate-100 border-r border-slate-300 text-[10px] uppercase">Buyer PO No:</span>
                            <span className="p-1.5 font-mono font-bold text-indigo-900">{poNumber || '-'}</span>
                        </div>
                        <div className="flex">
                            <span className="w-24 p-1.5 font-bold text-slate-600 bg-slate-100 border-r border-slate-300 text-[10px] uppercase">Place of Supply:</span>
                            <span className="p-1.5 font-bold text-slate-800">Gujarat (24)</span>
                        </div>
                    </div>
                </div>

                {/* Bill To & Ship To Boxes */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="border border-slate-300 rounded p-3 bg-slate-50/30">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-0.5">
                            Details of Receiver / Billed To:
                        </p>
                        <p className="font-bold text-slate-950 text-xs">{customerName}</p>
                        <p className="text-[11px] text-slate-700 whitespace-pre-wrap mt-0.5 leading-snug">
                            {deliveryAddress || 'Padra / Halol, Gujarat, India'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-700 mt-1">
                            State: <span className="font-semibold text-slate-900">Gujarat (State Code: 24)</span>
                        </p>
                    </div>

                    <div className="border border-slate-300 rounded p-3 bg-slate-50/30">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-0.5">
                            Details of Consignee / Shipped To:
                        </p>
                        <p className="font-bold text-slate-950 text-xs">{customerName}</p>
                        <p className="text-[11px] text-slate-700 whitespace-pre-wrap mt-0.5 leading-snug">
                            {deliveryAddress || 'Padra / Halol, Gujarat, India'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-700 mt-1">
                            State: <span className="font-semibold text-slate-900">Gujarat (State Code: 24)</span>
                        </p>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-slate-800 rounded-sm overflow-hidden mb-4">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-800 text-[10px] font-black text-slate-800 uppercase">
                                <th className="p-2 border-r border-slate-800 w-10 text-center">Sr</th>
                                <th className="p-2 border-r border-slate-800">Description of Goods</th>
                                <th className="p-2 border-r border-slate-800 w-16 text-center">HSN</th>
                                <th className="p-2 border-r border-slate-800 w-24 text-right">Qty</th>
                                <th className="p-2 border-r border-slate-800 w-20 text-right">Rate (₹)</th>
                                <th className="p-2 w-28 text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {items.map((item, idx) => {
                                const effectiveGst = item.gstRate || (item.hsn?.startsWith('4821') ? 18 : 5);
                                return (
                                    <tr key={item.orderId || idx} className="align-top">
                                        <td className="p-2 border-r border-slate-800 text-center font-bold text-slate-500">
                                            {idx + 1}
                                        </td>
                                        <td className="p-2 border-r border-slate-800 space-y-0.5">
                                            {/* First thing in line item: Material Code directly from PO */}
                                            {item.materialCode ? (
                                                <p className="font-mono font-bold text-slate-900 text-xs leading-tight">
                                                    Material Code : {item.materialCode}
                                                </p>
                                            ) : null}

                                            {/* Exact PO Item Name */}
                                            <p className="font-extrabold text-slate-950 uppercase tracking-tight text-xs leading-snug">
                                                {item.exactPoName}
                                            </p>

                                            {/* Directly underneath: Packing Details */}
                                            {item.packingDetail && item.packingDetail !== '-' ? (
                                                <p className="text-[11px] font-semibold text-slate-700 bg-amber-50/70 inline-block px-1.5 py-0.5 rounded border border-amber-200 mt-1">
                                                    Packing Details: <span className="text-slate-950 font-bold">{item.packingDetail}</span>
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 italic">No packing details</p>
                                            )}
                                        </td>
                                        <td className="p-2 border-r border-slate-800 text-center font-mono font-bold text-slate-700 text-[11px]">
                                            {item.hsn || '48192010'}
                                            <div className="text-[9px] text-slate-500 font-normal">
                                                ({effectiveGst}% GST)
                                            </div>
                                        </td>
                                        <td className="p-2 border-r border-slate-800 text-right font-bold text-slate-950">
                                            {item.deliveryQty.toLocaleString()}
                                        </td>
                                        <td className="p-2 border-r border-slate-800 text-right font-semibold text-slate-800">
                                            {item.rate.toFixed(2)}
                                        </td>
                                        <td className="p-2 text-right font-extrabold text-slate-950">
                                            {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-800 bg-slate-50 font-bold text-xs">
                                <td colSpan={3} className="p-2 border-r border-slate-800 text-right font-black uppercase text-[10px]">
                                    Total Quantity:
                                </td>
                                <td className="p-2 border-r border-slate-800 text-right font-black text-indigo-950">
                                    {totalQty.toLocaleString()}
                                </td>
                                <td className="p-2 border-r border-slate-800 text-right font-black uppercase text-[10px]">
                                    Sub Total:
                                </td>
                                <td className="p-2 text-right font-black text-slate-950">
                                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Tax Breakdown & Total Block */}
                <div className="flex justify-between items-start gap-4 mb-4 text-xs">
                    <div className="flex-1 border border-slate-300 rounded p-2.5 bg-slate-50/40 text-[11px] space-y-1">
                        <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Amount in Words:</p>
                        <p className="font-extrabold text-indigo-950 italic">{numberToIndianWords(grandTotal)}</p>
                        <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                            <span className="font-bold text-slate-700 uppercase">Declaration:</span> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                        </div>
                    </div>

                    <div className="w-64 border border-slate-800 rounded-sm overflow-hidden text-xs shrink-0">
                        <div className="flex justify-between p-1.5 border-b border-slate-300 bg-slate-50">
                            <span className="text-slate-600 font-bold text-[11px]">Sub Total:</span>
                            <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>

                        {taxType === 'IGST' ? (
                            <>
                                {computedBreakdown.taxable5 > 0 && (
                                    <div className="flex justify-between p-1.5 border-b border-slate-300">
                                        <span className="text-slate-600 font-bold text-[11px]">IGST (5%):</span>
                                        <span className="font-bold text-slate-900">₹{computedBreakdown.tax5.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {computedBreakdown.taxable18 > 0 && (
                                    <div className="flex justify-between p-1.5 border-b border-slate-300">
                                        <span className="text-slate-600 font-bold text-[11px]">IGST (18%):</span>
                                        <span className="font-bold text-slate-900">₹{computedBreakdown.tax18.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {computedBreakdown.taxable5 === 0 && computedBreakdown.taxable18 === 0 && (
                                    <div className="flex justify-between p-1.5 border-b border-slate-300">
                                        <span className="text-slate-600 font-bold text-[11px]">IGST:</span>
                                        <span className="font-bold text-slate-900">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {computedBreakdown.taxable5 > 0 && (
                                    <>
                                        <div className="flex justify-between p-1.5 border-b border-slate-300">
                                            <span className="text-slate-600 font-bold text-[11px]">CGST (2.5%):</span>
                                            <span className="font-bold text-slate-900">₹{(computedBreakdown.tax5 / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5 border-b border-slate-300">
                                            <span className="text-slate-600 font-bold text-[11px]">SGST (2.5%):</span>
                                            <span className="font-bold text-slate-900">₹{(computedBreakdown.tax5 / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                )}
                                {computedBreakdown.taxable18 > 0 && (
                                    <>
                                        <div className="flex justify-between p-1.5 border-b border-slate-300">
                                            <span className="text-slate-600 font-bold text-[11px]">CGST (9%):</span>
                                            <span className="font-bold text-slate-900">₹{(computedBreakdown.tax18 / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5 border-b border-slate-300">
                                            <span className="text-slate-600 font-bold text-[11px]">SGST (9%):</span>
                                            <span className="font-bold text-slate-900">₹{(computedBreakdown.tax18 / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                )}
                                {computedBreakdown.taxable5 === 0 && computedBreakdown.taxable18 === 0 && (
                                    <>
                                        <div className="flex justify-between p-1.5 border-b border-slate-300">
                                            <span className="text-slate-600 font-bold text-[11px]">CGST:</span>
                                            <span className="font-bold text-slate-900">₹{(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between p-1.5 border-b border-slate-300">
                                            <span className="text-slate-600 font-bold text-[11px]">SGST:</span>
                                            <span className="font-bold text-slate-900">₹{(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        <div className="flex justify-between p-2 bg-slate-900 text-white font-black text-sm">
                            <span className="uppercase text-[11px] tracking-wider">Grand Total:</span>
                            <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signature & Stamp Footer */}
            <div className="border-t-2 border-slate-800 pt-3 mt-4">
                <div className="flex justify-between items-end">
                    <div className="text-[10px] text-slate-500 space-y-0.5">
                        <p className="font-bold text-slate-700">Terms & Conditions:</p>
                        <p>1. Goods once sold will not be taken back or exchanged.</p>
                        <p>2. Subject to Mumbai Jurisdiction only.</p>
                    </div>

                    <div className="text-right">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                            For {config.fullName}
                        </p>
                        <div className="h-12 my-1 flex justify-end items-center">
                            <img src={config.signature} alt={config.signLabel} className="h-full w-auto object-contain" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 uppercase border-t border-slate-300 pt-0.5 inline-block px-3">
                            {config.signLabel}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
