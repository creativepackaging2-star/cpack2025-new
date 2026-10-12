'use client';

import { useEffect, useState, useMemo, useDeferredValue, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import {
    Loader2,
    Database,
    Search,
    X,
    Plus,
    Trash2,
    History,
    Save,
    CheckCircle2,
    FileText,
    Layers,
    PackageCheck,
    ArrowRightLeft
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { format } from 'date-fns';
import Link from 'next/link';

// Cutoff ID so old historical orders do not clutter the new Paper Purchase ledger
// Order #1741 (MIXNIOS ‐ B 5miu Cartons, Oct 6 2026) is the first entry under the new tracking
const PURCHASE_ORDER_CUTOFF_ID = 1741;
const MANUAL_TX_CUTOFF_DATE = '2026-10-06T00:00:00';

interface PaperPurchaseItem {
    uid: string;
    source: 'order' | 'manual';
    record_id: number | string;
    order_code?: string;
    created_at: string;
    vendor: string;
    printer: string;
    purchase_qty: number;
    gsm: string;
    actual_gsm?: string;
    size: string;
    colour: string;
    product_name: string;
    used_qty: number;
    balance_qty: number;
    bill_no: string;
    paper_rate: string;
}

interface StockItem {
    gsm_id: number;
    paper_type_id: number;
    paper_order_size_id: number;
    printer_id: number | null;
    gsm_name: string;
    paper_type_name: string;
    size_name: string;
    warehouse_name: string;
    total_in: number;
    total_out: number;
    net_stock: number;
    remarks?: string;
    stock_key?: string;
}

function parseMetaJson(raw: string | null | undefined): {
    bill_no?: string;
    paper_rate?: string;
    vendor?: string;
    printer?: string;
    product_name?: string;
    used_qty?: number;
} {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch {
        // If plain string was in file_no before, ignore or treat as empty
    }
    return {};
}

function getWarehouseInfo(tx: any, printerMap: Record<number, string>): { warehouseName: string; warehouseKey: string } {
    if (tx.notes) {
        const match = tx.notes.match(/Warehouse:\s*([^|\n\r()]+)/i);
        if (match && match[1].trim()) {
            const raw = match[1].trim();
            return {
                warehouseName: raw,
                warehouseKey: raw.toLowerCase().trim()
            };
        }
    }
    if (tx.printer_id && printerMap[tx.printer_id]) {
        const pName = printerMap[tx.printer_id];
        return {
            warehouseName: pName,
            warehouseKey: pName.toLowerCase().trim()
        };
    }
    return {
        warehouseName: 'Stock',
        warehouseKey: 'stock'
    };
}

export default function InventoryPage() {
    const printerMapRef = useRef<Record<number, string>>({});
    const [activeTab, setActiveTab] = useState<'purchases' | 'stock'>('purchases');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Purchases Ledger State
    const [purchases, setPurchases] = useState<PaperPurchaseItem[]>([]);
    // Local edits map: uid -> { bill_no, paper_rate, vendor, printer, used_qty }
    const [edits, setEdits] = useState<Record<string, { bill_no: string; paper_rate: string; vendor: string; printer: string; used_qty: string }>>({});
    const [savingUid, setSavingUid] = useState<string | null>(null);
    const [savedUid, setSavedUid] = useState<string | null>(null);

    // Stock Summary State
    const [stock, setStock] = useState<StockItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showHistory, setShowHistory] = useState<any>(null);

    // Stock Remarks State
    const [stockRemarks, setStockRemarks] = useState<Record<string, string>>({});
    const [savingStockKey, setSavingStockKey] = useState<string | null>(null);
    const [savedStockKey, setSavedStockKey] = useState<string | null>(null);

    // Stock Transfer Modal State
    const [transferModalItem, setTransferModalItem] = useState<StockItem | null>(null);
    const [transferToPrinterId, setTransferToPrinterId] = useState<string>('');
    const [transferQty, setTransferQty] = useState<string>('');
    const [transferRemarks, setTransferRemarks] = useState<string>('');
    const [isTransferring, setIsTransferring] = useState<boolean>(false);

    // New Purchase Entry Form State
    const [entryData, setEntryData] = useState({
        vendor: '',
        printer: '',
        gsm_id: '',
        paper_type_id: '',
        paper_order_size_id: '',
        printer_id: '',
        qty: '',
        used_for_product: '',
        used_qty: '0',
        bill_no: '',
        paper_rate: '',
        tx_type: 'IN',
    });

    // Lookup resources
    const [resources, setResources] = useState({
        gsms: [] as any[],
        paperTypes: [] as any[],
        sizes: [] as any[],
        printers: [] as any[],
        vendors: [] as any[],
    });

    const deferredSearchTerm = useDeferredValue(searchTerm);

    const fetchInventoryData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [txRes, ptRes, gsmRes, sizeRes, printerRes, vendorRes, ordersRes] = await Promise.all([
                supabase.from('paper_transactions').select('*').order('created_at', { ascending: false }),
                supabase.from('paper_types').select('id, name'),
                supabase.from('gsm').select('id, name'),
                supabase.from('sizes').select('id, name'),
                supabase.from('printers').select('id, name, phone').order('name'),
                supabase.from('paperwala').select('id, name, phone').order('name'),
                supabase
                    .from('orders')
                    .select('id, order_id, product_name, paperwala_name, printer_name, printer_id, paper_order_qty, paper_required, total_print_qty, gsm_value, actual_gsm_used, paper_type_name, paper_order_size, file_no, created_at, order_date')
                    .gte('id', PURCHASE_ORDER_CUTOFF_ID)
                    .order('id', { ascending: false })
            ]);

            if (txRes.error) throw txRes.error;
            if (ordersRes.error) throw ordersRes.error;

            const transactions = txRes.data || [];
            const recentOrders = ordersRes.data || [];

            const paperTypeMap = Object.fromEntries((ptRes.data || []).map(i => [i.id, i.name]));
            const gsmMap = Object.fromEntries((gsmRes.data || []).map(i => [i.id, i.name]));
            const sizeMap = Object.fromEntries((sizeRes.data || []).map(i => [i.id, i.name]));
            const printerMap = Object.fromEntries((printerRes.data || []).map(i => [i.id, i.name]));
            printerMapRef.current = printerMap;

            // Merge custom vendors & printers stored in paper_transactions META rows
            const mergedVendors: any[] = [...(vendorRes.data || [])];
            const mergedPrinters: any[] = [...(printerRes.data || [])];

            transactions.forEach(tx => {
                if (tx.tx_type === 'META') {
                    try {
                        const parsed = JSON.parse(tx.notes || '{}');
                        if (!parsed.name) return;
                        const cleanName = String(parsed.name).trim();
                        if (tx.reference === 'CUSTOM_VENDOR') {
                            if (!mergedVendors.some(v => v.name?.toLowerCase() === cleanName.toLowerCase())) {
                                mergedVendors.push({ id: `custom-${tx.id}`, name: cleanName, phone: parsed.phone || '', isCustom: true });
                            }
                        } else if (tx.reference === 'CUSTOM_PRINTER') {
                            if (!mergedPrinters.some(p => p.name?.toLowerCase() === cleanName.toLowerCase())) {
                                mergedPrinters.push({ id: `custom-${tx.id}`, name: cleanName, phone: parsed.phone || '', isCustom: true });
                            }
                        }
                    } catch {
                        // ignore malformed notes
                    }
                }
            });

            mergedVendors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            mergedPrinters.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            setResources({
                gsms: gsmRes.data || [],
                paperTypes: ptRes.data || [],
                sizes: sizeRes.data || [],
                printers: mergedPrinters,
                vendors: mergedVendors,
            });

            // 1. Build Paper Purchases Ledger (From cutoff onwards, even if completely used)
            const purchaseList: PaperPurchaseItem[] = [];

            // A. From Orders (id >= PURCHASE_ORDER_CUTOFF_ID where paper is ordered)
            recentOrders.forEach(ord => {
                const pQty = Number(ord.paper_order_qty) || 0;
                const hasVendor = Boolean(ord.paperwala_name && ord.paperwala_name.trim() !== '');
                // Include if paper_order_qty > 0 or vendor is specified
                if (pQty > 0 || hasVendor) {
                    const meta = parseMetaJson(ord.file_no);
                    const uQty = meta.used_qty !== undefined ? Number(meta.used_qty) : (Number(ord.paper_required) || 0);
                    const bal = pQty - uQty;
                    const uid = `order-${ord.id}`;

                    purchaseList.push({
                        uid,
                        source: 'order',
                        record_id: ord.id,
                        order_code: ord.order_id,
                        created_at: ord.order_date || ord.created_at,
                        vendor: meta.vendor !== undefined ? meta.vendor : (ord.paperwala_name || ''),
                        printer: meta.printer !== undefined ? meta.printer : (ord.printer_name || ''),
                        purchase_qty: pQty,
                        gsm: ord.gsm_value || '-',
                        actual_gsm: ord.actual_gsm_used || '',
                        size: ord.paper_order_size || '-',
                        colour: ord.paper_type_name || '-',
                        product_name: ord.product_name || '-',
                        used_qty: uQty,
                        balance_qty: bal,
                        bill_no: meta.bill_no || '',
                        paper_rate: meta.paper_rate || '',
                    });
                }
            });

            // B. From Manual Paper Purchase Entries in paper_transactions (created after cutoff & reference === 'Manual Purchase')
            transactions.forEach(tx => {
                if (
                    tx.tx_type === 'IN' &&
                    tx.reference === 'Manual Purchase' &&
                    tx.created_at >= MANUAL_TX_CUTOFF_DATE
                ) {
                    const meta = parseMetaJson(tx.notes);
                    const pQty = Number(tx.qty) || 0;
                    const uQty = Number(meta.used_qty) || 0;
                    const bal = pQty - uQty;
                    const uid = `tx-${tx.id}`;

                    purchaseList.push({
                        uid,
                        source: 'manual',
                        record_id: tx.id,
                        created_at: tx.created_at,
                        vendor: meta.vendor || '',
                        printer: meta.printer || printerMap[tx.printer_id] || '',
                        purchase_qty: pQty,
                        gsm: gsmMap[tx.gsm_id] || '-',
                        size: sizeMap[tx.paper_order_size_id] || '-',
                        colour: paperTypeMap[tx.paper_type_id] || '-',
                        product_name: meta.product_name || 'General Stock',
                        used_qty: uQty,
                        balance_qty: bal,
                        bill_no: meta.bill_no || '',
                        paper_rate: meta.paper_rate || '',
                    });
                }
            });

            // Initialize local edit state
            const initialEdits: Record<string, { bill_no: string; paper_rate: string; vendor: string; printer: string; used_qty: string }> = {};
            purchaseList.forEach(item => {
                initialEdits[item.uid] = {
                    bill_no: item.bill_no,
                    paper_rate: item.paper_rate,
                    vendor: item.vendor,
                    printer: item.printer,
                    used_qty: String(item.used_qty),
                };
            });
            setEdits(initialEdits);
            setPurchases(purchaseList);

            // Parse remarks for stock items
            const stockRemarksMap: Record<string, string> = {};
            transactions.forEach(tx => {
                if (tx.tx_type === 'META' && tx.reference === 'STOCK_REMARK') {
                    try {
                        const parsed = JSON.parse(tx.notes || '{}');
                        if (parsed.key && parsed.remark !== undefined && stockRemarksMap[parsed.key] === undefined) {
                            stockRemarksMap[parsed.key] = parsed.remark;
                        }
                    } catch {}
                }
            });

            // 2. Build Aggregate Stock Summary
            const grouping: Record<string, StockItem> = {};
            transactions.forEach(tx => {
                if (tx.tx_type !== 'IN' && tx.tx_type !== 'OUT') return;
                const wh = getWarehouseInfo(tx, printerMap);
                const key = `${tx.gsm_id}-${tx.paper_type_id}-${tx.paper_order_size_id}-${wh.warehouseKey}`;
                if (!grouping[key]) {
                    grouping[key] = {
                        gsm_id: tx.gsm_id,
                        paper_type_id: tx.paper_type_id,
                        paper_order_size_id: tx.paper_order_size_id,
                        printer_id: tx.printer_id,
                        gsm_name: gsmMap[tx.gsm_id] || '-',
                        paper_type_name: paperTypeMap[tx.paper_type_id] || '-',
                        size_name: sizeMap[tx.paper_order_size_id] || '-',
                        warehouse_name: wh.warehouseName,
                        total_in: 0,
                        total_out: 0,
                        net_stock: 0,
                        stock_key: key,
                        remarks: stockRemarksMap[key] || '',
                    };
                }
                const qty = Number(tx.qty) || 0;
                if (tx.tx_type === 'IN') grouping[key].total_in += qty;
                else if (tx.tx_type === 'OUT') grouping[key].total_out += qty;
            });

            const finalStock = Object.values(grouping)
                .map(item => {
                    const whKey = item.warehouse_name.toLowerCase().trim();
                    const key = `${item.gsm_id}-${item.paper_type_id}-${item.paper_order_size_id}-${whKey}`;
                    return {
                        ...item,
                        stock_key: key,
                        remarks: stockRemarksMap[key] || '',
                        net_stock: item.total_in - item.total_out
                    };
                })
                .filter(item => item.net_stock !== 0)
                .sort((a, b) => b.net_stock - a.net_stock);

            const initialStockRemarks: Record<string, string> = {};
            finalStock.forEach(item => {
                if (item.stock_key) {
                    initialStockRemarks[item.stock_key] = item.remarks || '';
                }
            });
            setStockRemarks(initialStockRemarks);
            setStock(finalStock);
        } catch (err: any) {
            console.error('Inventory Fetch Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventoryData();
    }, [fetchInventoryData]);

    const handleEditChange = (uid: string, field: 'bill_no' | 'paper_rate' | 'vendor' | 'printer' | 'used_qty', value: string) => {
        setEdits(prev => ({
            ...prev,
            [uid]: {
                ...(prev[uid] || { bill_no: '', paper_rate: '', vendor: '', printer: '', used_qty: '0' }),
                [field]: value
            }
        }));
    };

    const handleSaveRow = async (
        item: PaperPurchaseItem,
        overrideEdit?: { bill_no: string; paper_rate: string; vendor: string; printer: string; used_qty: string }
    ) => {
        const rowEdit = overrideEdit || edits[item.uid];
        if (!rowEdit) return;

        setSavingUid(item.uid);
        try {
            const usedQtyNum = Number(rowEdit.used_qty) || 0;
            const cleanVendor = rowEdit.vendor.trim();
            const cleanPrinter = rowEdit.printer.trim();

            const metaPayload = JSON.stringify({
                bill_no: rowEdit.bill_no.trim(),
                paper_rate: rowEdit.paper_rate.trim(),
                vendor: cleanVendor,
                printer: cleanPrinter,
                product_name: item.product_name,
                used_qty: usedQtyNum,
            });

            if (item.source === 'order') {
                const matchedVendor = resources.vendors.find(v => v.name === cleanVendor);
                const matchedPrinter = resources.printers.find(p => p.name === cleanPrinter);

                const updatePayload: Record<string, any> = {
                    file_no: metaPayload,
                    paperwala_name: cleanVendor,
                    printer_name: cleanPrinter,
                    paper_required: usedQtyNum,
                    paperwala_id: typeof matchedVendor?.id === 'number' ? matchedVendor.id : null,
                    printer_id: typeof matchedPrinter?.id === 'number' ? matchedPrinter.id : null,
                };

                const { error: updErr } = await supabase
                    .from('orders')
                    .update(updatePayload)
                    .eq('id', item.record_id);

                if (updErr) throw updErr;
            } else {
                const matchedPrinter = resources.printers.find(p => p.name === cleanPrinter);
                const { error: updErr } = await supabase
                    .from('paper_transactions')
                    .update({
                        notes: metaPayload,
                        printer_id: typeof matchedPrinter?.id === 'number' ? matchedPrinter.id : null,
                    })
                    .eq('id', item.record_id);

                if (updErr) throw updErr;
            }

            // Update local state
            setPurchases(prev =>
                prev.map(p =>
                    p.uid === item.uid
                        ? {
                              ...p,
                              bill_no: rowEdit.bill_no.trim(),
                              paper_rate: rowEdit.paper_rate.trim(),
                              vendor: cleanVendor,
                              printer: cleanPrinter,
                              used_qty: usedQtyNum,
                              balance_qty: p.purchase_qty - usedQtyNum,
                          }
                        : p
                )
            );

            setSavedUid(item.uid);
            setTimeout(() => {
                setSavedUid(prev => (prev === item.uid ? null : prev));
            }, 2000);
        } catch (err: any) {
            alert('Error saving details: ' + err.message);
        } finally {
            setSavingUid(null);
        }
    };

    const handleAddNewVendor = async (targetUid?: string) => {
        const rawName = window.prompt('Enter New Vendor (Paperwala) Name:');
        if (!rawName || !rawName.trim()) return;
        const name = rawName.trim();
        const rawPhone = window.prompt('Enter Vendor Phone (optional):') || '';
        const phoneDigits = rawPhone.replace(/\D/g, '');
        const phoneNum = phoneDigits ? Number(phoneDigits) : null;

        try {
            let newItem: any = { id: `custom-${Date.now()}`, name, phone: phoneDigits, isCustom: true };
            const { data, error: insErr } = await supabase
                .from('paperwala')
                .insert([{ name, phone: phoneNum }])
                .select()
                .single();

            if (!insErr && data) {
                newItem = data;
            } else {
                const { data: metaData, error: metaErr } = await supabase
                    .from('paper_transactions')
                    .insert([{
                        tx_type: 'META',
                        qty: 0,
                        reference: 'CUSTOM_VENDOR',
                        notes: JSON.stringify({ name, phone: phoneDigits })
                    }])
                    .select('id')
                    .single();
                if (metaErr) throw metaErr;
                if (metaData) newItem.id = `custom-${metaData.id}`;
            }

            setResources(prev => {
                const exists = prev.vendors.some(v => v.name?.toLowerCase() === name.toLowerCase());
                const updated = exists ? prev.vendors : [...prev.vendors, newItem].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                return { ...prev, vendors: updated };
            });

            if (targetUid === '__ENTRY__') {
                setEntryData(prev => ({ ...prev, vendor: name }));
            } else if (targetUid) {
                const item = purchases.find(p => p.uid === targetUid);
                const currentEdit = edits[targetUid] || (item ? {
                    bill_no: item.bill_no,
                    paper_rate: item.paper_rate,
                    vendor: item.vendor,
                    printer: item.printer,
                    used_qty: String(item.used_qty),
                } : null);
                if (currentEdit && item) {
                    const updatedEdit = { ...currentEdit, vendor: name };
                    setEdits(prev => ({ ...prev, [targetUid]: updatedEdit }));
                    await handleSaveRow(item, updatedEdit);
                }
            }
        } catch (err: any) {
            alert('Error adding vendor: ' + err.message);
        }
    };

    const handleAddNewPrinter = async (targetUid?: string) => {
        const rawName = window.prompt('Enter New Printer Name:');
        if (!rawName || !rawName.trim()) return;
        const name = rawName.trim();
        const rawPhone = window.prompt('Enter Printer Phone (optional):') || '';
        const phoneDigits = rawPhone.replace(/\D/g, '');
        const phoneNum = phoneDigits ? Number(phoneDigits) : null;

        try {
            let newItem: any = { id: `custom-${Date.now()}`, name, phone: phoneDigits, isCustom: true };
            const { data, error: insErr } = await supabase
                .from('printers')
                .insert([{ name, phone: phoneNum }])
                .select()
                .single();

            if (!insErr && data) {
                newItem = data;
            } else {
                const { data: metaData, error: metaErr } = await supabase
                    .from('paper_transactions')
                    .insert([{
                        tx_type: 'META',
                        qty: 0,
                        reference: 'CUSTOM_PRINTER',
                        notes: JSON.stringify({ name, phone: phoneDigits })
                    }])
                    .select('id')
                    .single();
                if (metaErr) throw metaErr;
                if (metaData) newItem.id = `custom-${metaData.id}`;
            }

            setResources(prev => {
                const exists = prev.printers.some(p => p.name?.toLowerCase() === name.toLowerCase());
                const updated = exists ? prev.printers : [...prev.printers, newItem].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                return { ...prev, printers: updated };
            });

            if (targetUid === '__ENTRY__') {
                setEntryData(prev => ({
                    ...prev,
                    printer: name,
                    printer_id: typeof newItem.id === 'number' ? String(newItem.id) : ''
                }));
            } else if (targetUid) {
                const item = purchases.find(p => p.uid === targetUid);
                const currentEdit = edits[targetUid] || (item ? {
                    bill_no: item.bill_no,
                    paper_rate: item.paper_rate,
                    vendor: item.vendor,
                    printer: item.printer,
                    used_qty: String(item.used_qty),
                } : null);
                if (currentEdit && item) {
                    const updatedEdit = { ...currentEdit, printer: name };
                    setEdits(prev => ({ ...prev, [targetUid]: updatedEdit }));
                    await handleSaveRow(item, updatedEdit);
                }
            }
        } catch (err: any) {
            alert('Error adding printer: ' + err.message);
        }
    };

    const handleManualSubmit = async () => {
        if (!entryData.gsm_id || !entryData.paper_type_id || !entryData.paper_order_size_id || !entryData.qty) {
            alert('Please fill GSM, Colour (Paper Type), Size, and Purchase Qty');
            return;
        }

        setIsSubmitting(true);
        try {
            const pQty = parseFloat(entryData.qty) || 0;
            const uQty = parseFloat(entryData.used_qty) || 0;
            const matchedPrinter = resources.printers.find(p => p.name === entryData.printer);
            const resolvedPrinterId = typeof matchedPrinter?.id === 'number' ? matchedPrinter.id : (parseInt(entryData.printer_id) || null);

            const metaNotes = JSON.stringify({
                vendor: entryData.vendor.trim(),
                printer: entryData.printer.trim(),
                product_name: entryData.used_for_product.trim() || 'General Stock',
                used_qty: uQty,
                bill_no: entryData.bill_no.trim(),
                paper_rate: entryData.paper_rate.trim(),
            });

            const payload = {
                gsm_id: parseInt(entryData.gsm_id),
                paper_type_id: parseInt(entryData.paper_type_id),
                paper_order_size_id: parseInt(entryData.paper_order_size_id),
                printer_id: resolvedPrinterId,
                qty: pQty,
                tx_type: 'IN',
                reference: 'Manual Purchase',
                notes: metaNotes
            };

            const { error: insErr } = await supabase.from('paper_transactions').insert([payload]);
            if (insErr) throw insErr;

            // If used_qty > 0, also record an OUT transaction for stock accuracy
            if (uQty > 0) {
                await supabase.from('paper_transactions').insert([{
                    gsm_id: parseInt(entryData.gsm_id),
                    paper_type_id: parseInt(entryData.paper_type_id),
                    paper_order_size_id: parseInt(entryData.paper_order_size_id),
                    printer_id: resolvedPrinterId,
                    qty: uQty,
                    tx_type: 'OUT',
                    reference: 'Manual Purchase Used',
                    notes: `Used for: ${entryData.used_for_product.trim() || 'Job'}`
                }]);
            }

            setShowEntryForm(false);
            setEntryData({
                vendor: '',
                printer: '',
                gsm_id: '',
                paper_type_id: '',
                paper_order_size_id: '',
                printer_id: '',
                qty: '',
                used_for_product: '',
                used_qty: '0',
                bill_no: '',
                paper_rate: '',
                tx_type: 'IN',
            });
            await fetchInventoryData();
        } catch (err: any) {
            console.error('Submit Error:', err);
            alert('Error: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStockRemarkChange = (key: string, value: string) => {
        setStockRemarks(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveStockRemark = async (key: string) => {
        if (!key) return;
        const remark = stockRemarks[key] ?? '';
        setSavingStockKey(key);
        try {
            const { error: insErr } = await supabase.from('paper_transactions').insert([{
                tx_type: 'META',
                qty: 0,
                reference: 'STOCK_REMARK',
                notes: JSON.stringify({ key, remark })
            }]);
            if (insErr) throw insErr;
            setSavedStockKey(key);
            setTimeout(() => {
                setSavedStockKey(prev => (prev === key ? null : prev));
            }, 2000);
        } catch (err: any) {
            alert('Error saving remark: ' + err.message);
        } finally {
            setSavingStockKey(null);
        }
    };

    const handleOpenTransferModal = (item: StockItem) => {
        setTransferModalItem(item);
        setTransferToPrinterId('');
        setTransferQty(item.net_stock > 0 ? String(item.net_stock) : '0');
        setTransferRemarks('');
    };

    const handleConfirmTransfer = async () => {
        if (!transferModalItem) return;
        const qtyNum = parseFloat(transferQty);
        if (!qtyNum || qtyNum <= 0) {
            alert('Please enter a valid transfer quantity');
            return;
        }
        if (transferToPrinterId === '') {
            alert('Please select the destination warehouse / printer');
            return;
        }

        const selectedPrinter = transferToPrinterId === 'stock'
            ? { id: null, name: 'Stock' }
            : resources.printers.find(p => String(p.id) === String(transferToPrinterId));

        const destName = selectedPrinter?.name || (transferToPrinterId === 'stock' ? 'Stock' : 'Warehouse');
        const destPrinterId = typeof selectedPrinter?.id === 'number' ? selectedPrinter.id : null;

        const sourceName = transferModalItem.warehouse_name;
        const sourcePrinterId = typeof transferModalItem.printer_id === 'number' ? transferModalItem.printer_id : null;

        if (sourceName.toLowerCase().trim() === destName.toLowerCase().trim()) {
            alert('Source and destination warehouse cannot be the same');
            return;
        }

        setIsTransferring(true);
        try {
            const cleanRemarks = transferRemarks.trim();
            const transferNoteOut = `Warehouse: ${sourceName} | Transferred to ${destName}${cleanRemarks ? ` - ${cleanRemarks}` : ''}`;
            const transferNoteIn = `Warehouse: ${destName} | Transferred from ${sourceName}${cleanRemarks ? ` - ${cleanRemarks}` : ''}`;

            const outTx = {
                gsm_id: transferModalItem.gsm_id,
                paper_type_id: transferModalItem.paper_type_id,
                paper_order_size_id: transferModalItem.paper_order_size_id,
                printer_id: sourcePrinterId,
                qty: qtyNum,
                tx_type: 'OUT',
                reference: 'Stock Transfer',
                notes: transferNoteOut,
            };

            const inTx = {
                gsm_id: transferModalItem.gsm_id,
                paper_type_id: transferModalItem.paper_type_id,
                paper_order_size_id: transferModalItem.paper_order_size_id,
                printer_id: destPrinterId,
                qty: qtyNum,
                tx_type: 'IN',
                reference: 'Stock Transfer',
                notes: transferNoteIn,
            };

            const { error: insErr } = await supabase.from('paper_transactions').insert([outTx, inTx]);
            if (insErr) throw insErr;

            setTransferModalItem(null);
            await fetchInventoryData();
        } catch (err: any) {
            alert('Transfer Error: ' + err.message);
        } finally {
            setIsTransferring(false);
        }
    };

    const deleteTransaction = async (id: string | number) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) return;
        try {
            const { error: delErr } = await supabase.from('paper_transactions').delete().eq('id', id);
            if (delErr) throw delErr;
            if (showHistory) {
                const { data } = await supabase.from('paper_transactions')
                    .select('*')
                    .eq('gsm_id', showHistory.gsm_id)
                    .eq('paper_type_id', showHistory.paper_type_id)
                    .eq('paper_order_size_id', showHistory.paper_order_size_id)
                    .order('created_at', { ascending: false });

                const matched = (data || []).filter(tx => {
                    const wh = getWarehouseInfo(tx, printerMapRef.current);
                    return wh.warehouseName.toLowerCase().trim() === showHistory.warehouse_name.toLowerCase().trim();
                });
                setShowHistory((prev: any) => ({ ...prev, transactions: matched }));
            }
            fetchInventoryData();
        } catch (err: any) {
            alert('Delete Error: ' + err.message);
        }
    };

    const fetchHistory = async (item: StockItem) => {
        setLoading(true);
        try {
            const { data, error: hErr } = await supabase.from('paper_transactions')
                .select('*')
                .eq('gsm_id', item.gsm_id)
                .eq('paper_type_id', item.paper_type_id)
                .eq('paper_order_size_id', item.paper_order_size_id)
                .order('created_at', { ascending: false });

            if (hErr) throw hErr;
            const matched = (data || []).filter(tx => {
                const wh = getWarehouseInfo(tx, printerMapRef.current);
                return wh.warehouseName.toLowerCase().trim() === item.warehouse_name.toLowerCase().trim();
            });

            setShowHistory({ ...item, transactions: matched });
        } catch (err: any) {
            alert('History Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredPurchases = useMemo(() => {
        if (!deferredSearchTerm) return purchases;
        const s = deferredSearchTerm.toLowerCase();
        return purchases.filter(item =>
            (item.vendor || '').toLowerCase().includes(s) ||
            (item.printer || '').toLowerCase().includes(s) ||
            (item.product_name || '').toLowerCase().includes(s) ||
            (item.gsm || '').toLowerCase().includes(s) ||
            (item.size || '').toLowerCase().includes(s) ||
            (item.colour || '').toLowerCase().includes(s) ||
            (item.bill_no || '').toLowerCase().includes(s)
        );
    }, [purchases, deferredSearchTerm]);

    const filteredStock = useMemo(() => {
        if (!deferredSearchTerm) return stock;
        const s = deferredSearchTerm.toLowerCase();
        return stock.filter(item =>
            item.gsm_name.toLowerCase().includes(s) ||
            item.paper_type_name.toLowerCase().includes(s) ||
            item.size_name.toLowerCase().includes(s) ||
            item.warehouse_name.toLowerCase().includes(s)
        );
    }, [stock, deferredSearchTerm]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Loading Paper Purchase & Inventory Records...</p>
            </div>
        );
    }

    return (
        <div className="font-montserrat space-y-6 pb-16">
            <PageHeader
                title="Paper Purchases & Inventory"
                icon={<Database className="w-6 h-6" />}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setShowEntryForm(!showEntryForm)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-lg ${
                                showEntryForm
                                    ? 'bg-slate-100 text-slate-700 shadow-slate-200'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                            }`}
                        >
                            {showEntryForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {showEntryForm ? 'Close Form' : 'Add Paper Purchase'}
                        </button>
                        <div className="relative w-56 md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Vendor, Product, GSM, Bill..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm text-xs sm:text-sm text-white placeholder:text-slate-400 font-semibold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                }
            />

            {/* View Toggle Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button
                        onClick={() => setActiveTab('purchases')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                            activeTab === 'purchases'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Paper Purchases (All Entries)</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                            activeTab === 'purchases' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {purchases.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                            activeTab === 'stock'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span>Warehouse Stock Summary</span>
                    </button>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                    Showing all paper purchases from Oct 2026 onwards (including fully used stock)
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold flex items-center gap-2">
                    <X className="w-5 h-5" />
                    <span>Error: {error}</span>
                </div>
            )}

            {/* ADD PAPER PURCHASE FORM */}
            {showEntryForm && (
                <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-xl animate-in zoom-in-95 fade-in duration-200">
                    <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 uppercase">Add New Paper Purchase</h3>
                                <p className="text-xs text-slate-500 font-medium">Record vendor paper purchase, printer, usage, bill no. & rate</p>
                            </div>
                        </div>
                        <button onClick={() => setShowEntryForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Vendor (Paperwala)</label>
                            <div className="flex gap-1.5">
                                <select
                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-sm"
                                    value={entryData.vendor}
                                    onChange={e => {
                                        if (e.target.value === '__ADD_NEW__') {
                                            handleAddNewVendor('__ENTRY__');
                                            return;
                                        }
                                        setEntryData(p => ({ ...p, vendor: e.target.value }));
                                    }}
                                >
                                    <option value="">Select Vendor...</option>
                                    {entryData.vendor && !resources.vendors.some(v => v.name === entryData.vendor) && (
                                        <option value={entryData.vendor}>{entryData.vendor}</option>
                                    )}
                                    {resources.vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                    <option value="__ADD_NEW__" className="font-bold text-indigo-600">+ Add New Vendor...</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handleAddNewVendor('__ENTRY__')}
                                    title="Add New Vendor"
                                    className="px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl flex items-center justify-center transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Printer</label>
                            <div className="flex gap-1.5">
                                <select
                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-sm"
                                    value={entryData.printer}
                                    onChange={e => {
                                        if (e.target.value === '__ADD_NEW__') {
                                            handleAddNewPrinter('__ENTRY__');
                                            return;
                                        }
                                        const val = e.target.value;
                                        const matched = resources.printers.find(pr => pr.name === val);
                                        setEntryData(p => ({
                                            ...p,
                                            printer: val,
                                            printer_id: typeof matched?.id === 'number' ? String(matched.id) : ''
                                        }));
                                    }}
                                >
                                    <option value="">Select Printer...</option>
                                    {entryData.printer && !resources.printers.some(p => p.name === entryData.printer) && (
                                        <option value={entryData.printer}>{entryData.printer}</option>
                                    )}
                                    {resources.printers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    <option value="__ADD_NEW__" className="font-bold text-indigo-600">+ Add New Printer...</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handleAddNewPrinter('__ENTRY__')}
                                    title="Add New Printer"
                                    className="px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl flex items-center justify-center transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Purchase Qty *</label>
                            <input
                                type="number"
                                placeholder="e.g. 2200"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                                value={entryData.qty}
                                onChange={e => setEntryData(p => ({ ...p, qty: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">GSM *</label>
                            <select
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-sm"
                                value={entryData.gsm_id}
                                onChange={e => setEntryData(p => ({ ...p, gsm_id: e.target.value }))}
                            >
                                <option value="">Select GSM...</option>
                                {resources.gsms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Size *</label>
                            <select
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-sm"
                                value={entryData.paper_order_size_id}
                                onChange={e => setEntryData(p => ({ ...p, paper_order_size_id: e.target.value }))}
                            >
                                <option value="">Select Size...</option>
                                {resources.sizes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Colour / Type *</label>
                            <select
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-sm"
                                value={entryData.paper_type_id}
                                onChange={e => setEntryData(p => ({ ...p, paper_type_id: e.target.value }))}
                            >
                                <option value="">Select Colour...</option>
                                {resources.paperTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Used For Product</label>
                            <input
                                type="text"
                                placeholder="e.g. BD Tera 500mg inner carton"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-sm"
                                value={entryData.used_for_product}
                                onChange={e => setEntryData(p => ({ ...p, used_for_product: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Used Qty</label>
                            <input
                                type="number"
                                placeholder="0"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-sm"
                                value={entryData.used_qty}
                                onChange={e => setEntryData(p => ({ ...p, used_qty: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Bill No.</label>
                            <input
                                type="text"
                                placeholder="Enter Bill No."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-sm"
                                value={entryData.bill_no}
                                onChange={e => setEntryData(p => ({ ...p, bill_no: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Rate (₹)</label>
                            <input
                                type="text"
                                placeholder="Enter Rate"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-sm"
                                value={entryData.paper_rate}
                                onChange={e => setEntryData(p => ({ ...p, paper_rate: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowEntryForm(false)}
                            className="px-5 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleManualSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Paper Purchase
                        </button>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 1: PAPER PURCHASES LEDGER (SHOWS ALL PURCHASES EVEN IF USED = 0)  */}
            {/* ===================================================================== */}
            {activeTab === 'purchases' ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="px-2.5 py-3">Date</th>
                                    <th className="px-2.5 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <span>Vendor</span>
                                            <button
                                                type="button"
                                                onClick={() => handleAddNewVendor()}
                                                title="Add New Vendor"
                                                className="p-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </th>
                                    <th className="px-2.5 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <span>Printer</span>
                                            <button
                                                type="button"
                                                onClick={() => handleAddNewPrinter()}
                                                title="Add New Printer"
                                                className="p-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </th>
                                    <th className="px-2.5 py-3 text-right">Qty</th>
                                    <th className="px-2.5 py-3 text-center">GSM</th>
                                    <th className="px-2.5 py-3">Size</th>
                                    <th className="px-2.5 py-3">Colour</th>
                                    <th className="px-2.5 py-3 min-w-[180px]">Used For Product</th>
                                    <th className="px-2.5 py-3 text-right">Used Qty</th>
                                    <th className="px-2.5 py-3 text-right bg-indigo-50/40">Balance Qty</th>
                                    <th className="px-2.5 py-3 w-32">Bill No.</th>
                                    <th className="px-2.5 py-3 w-24">Rate (₹)</th>
                                    <th className="px-2.5 py-3 text-center w-14">Save</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-xs">
                                {filteredPurchases.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                                            No paper purchase entries found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPurchases.map((item) => {
                                        const rowEdit = edits[item.uid] || {
                                            bill_no: item.bill_no,
                                            paper_rate: item.paper_rate,
                                            vendor: item.vendor,
                                            printer: item.printer,
                                            used_qty: String(item.used_qty),
                                        };
                                        const liveUsedQty = Number(rowEdit.used_qty) || 0;
                                        const liveBalance = item.purchase_qty - liveUsedQty;
                                        const isDirty =
                                            rowEdit.bill_no !== item.bill_no ||
                                            rowEdit.paper_rate !== item.paper_rate ||
                                            rowEdit.vendor !== item.vendor ||
                                            rowEdit.printer !== item.printer ||
                                            liveUsedQty !== item.used_qty;

                                        return (
                                            <tr key={item.uid} className="hover:bg-slate-50/80 transition-colors">
                                                {/* Date */}
                                                <td className="px-2.5 py-2.5 whitespace-nowrap text-slate-500 font-medium">
                                                    {item.created_at ? format(new Date(item.created_at), 'dd MMM yy') : '-'}
                                                </td>

                                                {/* Vendor Dropdown + Add New */}
                                                <td className="px-2.5 py-2.5">
                                                    <div className="flex items-center gap-1">
                                                        <select
                                                            value={rowEdit.vendor}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                if (val === '__ADD_NEW__') {
                                                                    handleAddNewVendor(item.uid);
                                                                    return;
                                                                }
                                                                const updatedEdit = { ...rowEdit, vendor: val };
                                                                setEdits(prev => ({ ...prev, [item.uid]: updatedEdit }));
                                                                handleSaveRow(item, updatedEdit);
                                                            }}
                                                            className="w-28 sm:w-32 px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition cursor-pointer"
                                                        >
                                                            <option value="">Select Vendor...</option>
                                                            {rowEdit.vendor && !resources.vendors.some(v => v.name === rowEdit.vendor) && (
                                                                <option value={rowEdit.vendor}>{rowEdit.vendor}</option>
                                                            )}
                                                            {resources.vendors.map(v => (
                                                                <option key={v.id} value={v.name}>{v.name}</option>
                                                            ))}
                                                            <option value="__ADD_NEW__" className="font-bold text-indigo-600">+ Add New Vendor...</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddNewVendor(item.uid)}
                                                            title="Add New Vendor"
                                                            className="p-1 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition-colors shrink-0"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Printer Dropdown + Add New */}
                                                <td className="px-2.5 py-2.5">
                                                    <div className="flex items-center gap-1">
                                                        <select
                                                            value={rowEdit.printer}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                if (val === '__ADD_NEW__') {
                                                                    handleAddNewPrinter(item.uid);
                                                                    return;
                                                                }
                                                                const updatedEdit = { ...rowEdit, printer: val };
                                                                setEdits(prev => ({ ...prev, [item.uid]: updatedEdit }));
                                                                handleSaveRow(item, updatedEdit);
                                                            }}
                                                            className="w-28 sm:w-36 px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition cursor-pointer"
                                                        >
                                                            <option value="">Select Printer...</option>
                                                            {rowEdit.printer && !resources.printers.some(p => p.name === rowEdit.printer) && (
                                                                <option value={rowEdit.printer}>{rowEdit.printer}</option>
                                                            )}
                                                            {resources.printers.map(p => (
                                                                <option key={p.id} value={p.name}>{p.name}</option>
                                                            ))}
                                                            <option value="__ADD_NEW__" className="font-bold text-indigo-600">+ Add New Printer...</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddNewPrinter(item.uid)}
                                                            title="Add New Printer"
                                                            className="p-1 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 transition-colors shrink-0"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Purchase Qty */}
                                                <td className="px-2.5 py-2.5 text-right font-mono font-bold text-slate-900">
                                                    {item.purchase_qty.toLocaleString()}
                                                </td>

                                                {/* GSM */}
                                                <td className="px-2.5 py-2.5 text-center font-semibold text-slate-700 whitespace-nowrap">
                                                    <span>{item.gsm}</span>
                                                    {item.actual_gsm && item.actual_gsm !== item.gsm && (
                                                        <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded" title="Actual GSM Used">
                                                            Act: {item.actual_gsm}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Size */}
                                                <td className="px-2.5 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                                                    {item.size}
                                                </td>

                                                {/* Colour */}
                                                <td className="px-2.5 py-2.5">
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                                        {item.colour}
                                                    </span>
                                                </td>

                                                {/* Used For Product */}
                                                <td className="px-2.5 py-2.5">
                                                    <div className="font-bold text-slate-900 leading-snug">
                                                        {item.product_name}
                                                    </div>
                                                    {item.source === 'order' && item.order_code && (
                                                        <Link
                                                            href={`/orders/${item.record_id}`}
                                                            className="inline-block mt-0.5 text-[10px] font-mono font-semibold text-indigo-600 hover:underline"
                                                        >
                                                            {item.order_code}
                                                        </Link>
                                                    )}
                                                </td>

                                                {/* Used Qty */}
                                                <td className="px-2.5 py-2.5 text-right font-mono">
                                                    <input
                                                        type="number"
                                                        value={rowEdit.used_qty}
                                                        onChange={e => handleEditChange(item.uid, 'used_qty', e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveRow(item); }}
                                                        onBlur={() => { if (isDirty) handleSaveRow(item); }}
                                                        className="w-20 px-2 py-1 text-right font-mono font-semibold text-rose-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-400 rounded-lg outline-none transition"
                                                    />
                                                </td>

                                                {/* Balance Qty */}
                                                <td className="px-2.5 py-2.5 text-right font-mono bg-indigo-50/20">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                                                        liveBalance > 0
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : liveBalance === 0
                                                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                        {liveBalance.toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Bill No. Input */}
                                                <td className="px-2.5 py-2.5">
                                                    <input
                                                        type="text"
                                                        placeholder="Bill No..."
                                                        value={rowEdit.bill_no}
                                                        onChange={e => handleEditChange(item.uid, 'bill_no', e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveRow(item); }}
                                                        onBlur={() => { if (isDirty) handleSaveRow(item); }}
                                                        className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition"
                                                    />
                                                </td>

                                                {/* Rate Input */}
                                                <td className="px-2.5 py-2.5">
                                                    <input
                                                        type="text"
                                                        placeholder="Rate..."
                                                        value={rowEdit.paper_rate}
                                                        onChange={e => handleEditChange(item.uid, 'paper_rate', e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveRow(item); }}
                                                        onBlur={() => { if (isDirty) handleSaveRow(item); }}
                                                        className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition"
                                                    />
                                                </td>

                                                {/* Save Button / Status */}
                                                <td className="px-2.5 py-2.5 text-center">
                                                    {savingUid === item.uid ? (
                                                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin mx-auto" />
                                                    ) : savedUid === item.uid ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSaveRow(item)}
                                                            title="Save Details"
                                                            className={`p-1.5 rounded-lg transition ${
                                                                isDirty
                                                                    ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                                                                    : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <Save className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ===================================================================== */
                /* TAB 2: WAREHOUSE STOCK SUMMARY                                        */
                /* ===================================================================== */
                <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Warehouse</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Paper Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">GSM</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Size</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500 bg-indigo-50/30">Stock</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">IN</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">OUT</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500 w-32">Move Stock</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 min-w-[220px]">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                                {filteredStock.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic font-medium">No inventory records found matching your search.</td>
                                    </tr>
                                ) : (
                                    filteredStock.map((item, idx) => {
                                        const stockKey = item.stock_key || `${item.gsm_id}-${item.paper_type_id}-${item.paper_order_size_id}-${item.printer_id}`;
                                        const currentRemark = stockRemarks[stockKey] ?? item.remarks ?? '';
                                        const isRemarkSaving = savingStockKey === stockKey;
                                        const isRemarkSaved = savedStockKey === stockKey;

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors group cursor-default border-b border-slate-200 last:border-0">
                                                <td className="px-6 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.warehouse_name}</span>
                                                        <button
                                                            onClick={() => fetchHistory(item)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                            title="View Transaction History"
                                                        >
                                                            <History className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 text-sm text-slate-600 font-medium">
                                                    {item.paper_type_name}
                                                </td>
                                                <td className="px-6 py-2 text-sm font-semibold text-slate-700">
                                                    {item.gsm_name}
                                                </td>
                                                <td className="px-6 py-2 text-sm text-slate-500 tracking-tight font-medium">
                                                    {item.size_name}
                                                </td>
                                                <td className="px-6 py-2 text-right bg-indigo-50/10 font-mono">
                                                    <span className={`text-sm font-semibold tracking-tight ${item.net_stock < 0 ? 'text-rose-700' : 'text-indigo-900'}`}>
                                                        {item.net_stock.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right border-l border-slate-100 font-mono">
                                                    <div className="text-slate-500 font-medium text-[11px]">
                                                        {item.total_in.toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono">
                                                    <div className="text-slate-400 font-medium text-[11px]">
                                                        {item.total_out.toLocaleString()}
                                                    </div>
                                                </td>
                                                {/* Move Stock Action */}
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => handleOpenTransferModal(item)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-sm transition active:scale-95"
                                                        title="Move stock to another warehouse"
                                                    >
                                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                                        <span>Move</span>
                                                    </button>
                                                </td>
                                                {/* Remarks - LAST COLUMN */}
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="Add remark..."
                                                            value={currentRemark}
                                                            onChange={e => handleStockRemarkChange(stockKey, e.target.value)}
                                                            onBlur={() => handleSaveStockRemark(stockKey)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleSaveStockRemark(stockKey);
                                                            }}
                                                            className="w-full px-2.5 py-1 text-xs text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition"
                                                        />
                                                        {isRemarkSaving ? (
                                                            <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                                                        ) : isRemarkSaved ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveStockRemark(stockKey)}
                                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition shrink-0"
                                                                title="Save Remark"
                                                            >
                                                                <Save className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TRANSFER STOCK MODAL */}
            {transferModalItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2">
                                    <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                                    Move Warehouse Stock
                                </h3>
                                <p className="text-xs text-slate-500 font-semibold mt-1">
                                    {transferModalItem.paper_type_name} | {transferModalItem.gsm_name} | {transferModalItem.size_name}
                                </p>
                            </div>
                            <button
                                onClick={() => setTransferModalItem(null)}
                                className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Current / Source Warehouse */}
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center">
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider">Current Warehouse</div>
                                    <div className="text-sm font-bold text-slate-800">{transferModalItem.warehouse_name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider">Available Stock</div>
                                    <div className="text-sm font-black text-indigo-700">{transferModalItem.net_stock.toLocaleString()} sheets</div>
                                </div>
                            </div>

                            {/* Destination Warehouse */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Move To Warehouse / Printer <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={transferToPrinterId}
                                    onChange={e => setTransferToPrinterId(e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl outline-none transition"
                                >
                                    <option value="">Select Destination Warehouse...</option>
                                    {transferModalItem.warehouse_name.toLowerCase() !== 'stock' && (
                                        <option value="stock">Stock (General Warehouse)</option>
                                    )}
                                    {resources.printers
                                        .filter(p => p.name.toLowerCase().trim() !== transferModalItem.warehouse_name.toLowerCase().trim())
                                        .map(p => (
                                            <option key={p.id} value={String(p.id)}>{p.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            {/* Transfer Quantity */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Quantity to Move (Sheets) <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max={transferModalItem.net_stock > 0 ? transferModalItem.net_stock : undefined}
                                        value={transferQty}
                                        onChange={e => setTransferQty(e.target.value)}
                                        placeholder="Enter quantity..."
                                        className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl outline-none transition"
                                    />
                                    {transferModalItem.net_stock > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setTransferQty(String(transferModalItem.net_stock))}
                                            className="px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition whitespace-nowrap"
                                        >
                                            All ({transferModalItem.net_stock.toLocaleString()})
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Transfer Remarks */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Transfer Remarks / Reason (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={transferRemarks}
                                    onChange={e => setTransferRemarks(e.target.value)}
                                    placeholder="e.g. Sent for urgent job printing, moved to Ashutosh, etc."
                                    className="w-full px-3 py-2 text-sm font-medium text-slate-800 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl outline-none transition"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setTransferModalItem(null)}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmTransfer}
                                disabled={isTransferring}
                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                            >
                                {isTransferring ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Moving Stock...</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowRightLeft className="w-4 h-4" />
                                        <span>Confirm Move</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSACTION HISTORY MODAL */}
            {showHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase">Stock History</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                                    {showHistory.paper_type_name} | {showHistory.gsm_name} | {showHistory.size_name} | {showHistory.warehouse_name}
                                </p>
                            </div>
                            <button onClick={() => setShowHistory(null)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-white">
                                    <tr className="text-left border-b border-slate-100">
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                        <th className="py-3 pl-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference / Notes</th>
                                        <th className="py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {showHistory.transactions.map((tx: any) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 text-sm font-bold text-slate-600">
                                                {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${tx.tx_type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {tx.tx_type}
                                                </span>
                                            </td>
                                            <td className={`py-3 text-right text-sm font-black ${tx.tx_type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.tx_type === 'IN' ? '+' : '-'}{Number(tx.qty).toLocaleString()}
                                            </td>
                                            <td className="py-3 pl-6">
                                                <div className="text-sm font-bold text-slate-900">{tx.reference || '-'}</div>
                                                <div className="text-[11px] text-slate-400 font-medium">{tx.notes}</div>
                                            </td>
                                            <td className="py-3 text-right text-slate-900">
                                                <button
                                                    onClick={() => deleteTransaction(tx.id)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete Transaction"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {showHistory.transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 italic">No transaction history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setShowHistory(null)}
                                className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
