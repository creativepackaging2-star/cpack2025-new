import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
        const zohoOrgId = process.env.ZOHO_ORG_ID || '651108650';
        const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.a1389a71ee7491506a5800d9ddcb7c44.fcdb49d63bcba81f27489c06e92d1d7c';

        // 1. Fetch invoiced orders from Supabase
        const { data: dbOrders, error: dbError } = await supabase
            .from('orders')
            .select(`
                id,
                order_id,
                product_name,
                artwork_code,
                quantity,
                qty_delivered,
                rate,
                packing_detail,
                from_our_company,
                customer_name,
                remarks,
                status,
                delivery_date,
                created_at,
                invoice_no
            `)
            .not('invoice_no', 'is', null)
            .neq('invoice_no', '')
            .order('id', { ascending: false });

        if (dbError) {
            console.error('Database fetch error:', dbError);
        }

        // Group Supabase orders by invoice_no
        const invoiceMap: Record<string, any> = {};

        (dbOrders || []).forEach(ord => {
            const rawInv = (ord.invoice_no || '').trim();
            if (!rawInv || rawInv === '-' || rawInv.toLowerCase() === 'null') return;

            if (!invoiceMap[rawInv]) {
                invoiceMap[rawInv] = {
                    invoice_number: rawInv,
                    date: ord.delivery_date || ord.created_at?.split('T')[0] || '',
                    customer_name: ord.customer_name?.trim() || 'BDR Pharmaceuticals International Pvt. Ltd.',
                    company: ord.from_our_company || 'Creative Printers',
                    orders: [],
                    total_delivered_qty: 0,
                    total_amount: 0,
                    source: 'supabase',
                    pdf_available: false,
                    pdf_url: '',
                    invoice_url: '',
                };
            }

            const delQty = ord.qty_delivered || ord.quantity || 0;
            const amt = Math.round(delQty * (ord.rate || 0) * 100) / 100;
            invoiceMap[rawInv].orders.push({
                id: ord.id,
                order_id: ord.order_id,
                product_name: ord.product_name,
                artwork_code: ord.artwork_code,
                quantity: ord.quantity,
                qty_delivered: delQty,
                packing_detail: ord.packing_detail,
                rate: ord.rate,
                amount: amt,
                remarks: ord.remarks,
            });

            invoiceMap[rawInv].total_delivered_qty += delQty;
            invoiceMap[rawInv].total_amount += amt;
        });

        // 2. Fetch live invoices from Zoho Books to enrich with payment status, total, and live secure view URL
        let zohoInvoices: any[] = [];
        try {
            const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
                method: 'POST'
            });
            const tokenData = await tokenRes.json();
            if (tokenData.access_token) {
                const zRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${zohoOrgId}&sort_column=created_time&sort_order=D&per_page=50`, {
                    headers: { 'Authorization': `Zoho-oauthtoken ${tokenData.access_token}` }
                });
                const zData = await zRes.json();
                if (zData.invoices) {
                    zohoInvoices = zData.invoices;
                }
            }
        } catch (zErr) {
            console.warn('Zoho Books fetch warning:', zErr);
        }

        // Merge Zoho Books data into invoiceMap or add new Zoho invoices
        for (const zInv of zohoInvoices) {
            const invNum = zInv.invoice_number;
            if (!invNum) continue;

            const existing = invoiceMap[invNum];
            if (existing) {
                existing.zoho_id = zInv.invoice_id;
                existing.status = zInv.status;
                existing.date = zInv.date || existing.date;
                existing.total_amount = zInv.total || existing.total_amount;
                existing.customer_name = zInv.customer_name || existing.customer_name;
            } else {
                invoiceMap[invNum] = {
                    invoice_number: invNum,
                    zoho_id: zInv.invoice_id,
                    date: zInv.date || '',
                    customer_name: zInv.customer_name || 'Customer',
                    company: 'Creative Printers',
                    orders: [],
                    total_delivered_qty: 0,
                    total_amount: zInv.total || 0,
                    status: zInv.status || 'draft',
                    source: 'zoho',
                    pdf_available: false,
                    pdf_url: '',
                    invoice_url: '',
                };
            }
        }

        // 3. Check for generated unified PDF files in public/downloads
        const publicDownloadsDir = path.join(process.cwd(), 'public', 'downloads');
        const invoicesList = Object.values(invoiceMap);

        for (const inv of invoicesList) {
            const sanitizedNum = inv.invoice_number.trim();
            const fileName = `Dispatch_Documents_${sanitizedNum}.pdf`;
            const filePath = path.join(publicDownloadsDir, fileName);

            if (fs.existsSync(filePath)) {
                inv.pdf_available = true;
                inv.pdf_url = `/downloads/${fileName}`;
            } else {
                // Check fallback alternative
                const altFileName = `Dispatch_Package_${sanitizedNum}.pdf`;
                const altFilePath = path.join(publicDownloadsDir, altFileName);
                if (fs.existsSync(altFilePath)) {
                    inv.pdf_available = true;
                    inv.pdf_url = `/downloads/${altFileName}`;
                }
            }

            // Default status if missing
            if (!inv.status) {
                inv.status = 'generated';
            }
        }

        // Sort by invoice_number descending (latest first)
        invoicesList.sort((a, b) => {
            const numA = parseInt(a.invoice_number.replace(/\D/g, '') || '0', 10);
            const numB = parseInt(b.invoice_number.replace(/\D/g, '') || '0', 10);
            return numB - numA;
        });

        return NextResponse.json({
            success: true,
            invoices: invoicesList,
            count: invoicesList.length
        });

    } catch (err: any) {
        console.error('Error in /api/invoices:', err);
        return NextResponse.json({ error: err.message || 'Failed to list sales invoices' }, { status: 500 });
    }
}
