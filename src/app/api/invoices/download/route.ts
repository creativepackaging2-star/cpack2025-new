import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { appendCoaPageToMergedDoc, getCompanyBranding } from '@/utils/generateCoaPdf';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const invoiceNumber = searchParams.get('invoiceNumber');

        if (!invoiceNumber) {
            return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
        }

        const trimmed = invoiceNumber.trim();
        const fileName = `Dispatch_Documents_${trimmed}.pdf`;

        // 1. Check if cached locally on disk
        const localPath = path.join(process.cwd(), 'public', 'downloads', fileName);
        if (fs.existsSync(localPath)) {
            const fileBuf = fs.readFileSync(localPath);
            return new NextResponse(fileBuf, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                }
            });
        }

        // 2. Fetch directly from Zoho Books
        const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
        const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.a1389a71ee7491506a5800d9ddcb7c44.fcdb49d63bcba81f27489c06e92d1d7c';

        const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
            method: 'POST'
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error('Failed to obtain Zoho access token');

        const orgIds = ['649079892', '651108650'];
        if (trimmed.startsWith('S-')) {
            orgIds.reverse(); // Prioritize Printers for S- invoices
        }

        let zohoInvoiceId: string | null = null;
        let matchedOrgId = orgIds[0];

        for (const orgId of orgIds) {
            const searchRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${orgId}&invoice_number=${encodeURIComponent(trimmed)}`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
            });
            const searchData = await searchRes.json();
            if (searchData.invoices && searchData.invoices.length > 0) {
                zohoInvoiceId = searchData.invoices[0].invoice_id;
                matchedOrgId = orgId;
                break;
            }
        }

        if (!zohoInvoiceId) {
            return NextResponse.json({ error: `Invoice ${trimmed} not found in Zoho Books.` }, { status: 404 });
        }

        const pdfFetchRes = await fetch(`https://www.zohoapis.com/books/v3/invoices/${zohoInvoiceId}?organization_id=${matchedOrgId}&accept=pdf`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
        });

        if (!pdfFetchRes.ok) {
            throw new Error(`Failed to download invoice PDF from Zoho: HTTP ${pdfFetchRes.status}`);
        }

        const officialPdfBuffer = Buffer.from(await pdfFetchRes.arrayBuffer());
        const zohoDoc = await PDFDocument.load(officialPdfBuffer);

        // Build 3-copy package + COAs
        const mergedDoc = await PDFDocument.create();
        for (let copy = 1; copy <= 3; copy++) {
            const [copiedPage] = await mergedDoc.copyPages(zohoDoc, [0]);
            mergedDoc.addPage(copiedPage);
        }

        // Fetch linked orders
        const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .eq('invoice_no', trimmed);

        const brand = getCompanyBranding(trimmed);

        for (const ord of (orders || [])) {
            try {
                await appendCoaPageToMergedDoc(mergedDoc, ord, brand);
            } catch (e) {
                console.error(`Error appending COA for order ${ord.id}:`, e);
            }
        }

        const finalPdfBytes = await mergedDoc.save();
        const finalBuffer = Buffer.from(finalPdfBytes);

        // Cache locally if possible
        try {
            const publicDownloadsDir = path.resolve(process.cwd(), 'public', 'downloads');
            if (!fs.existsSync(publicDownloadsDir)) fs.mkdirSync(publicDownloadsDir, { recursive: true });
            fs.writeFileSync(path.join(publicDownloadsDir, fileName), finalBuffer);
        } catch {}

        // Copy to Windows User Downloads if available
        try {
            const winDownloadsPath = path.join('C:', 'Users', 'Admin', 'Downloads', fileName);
            fs.writeFileSync(winDownloadsPath, finalBuffer);
        } catch {}

        return new NextResponse(finalBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            }
        });

    } catch (err: any) {
        console.error('Error generating download package:', err);
        return NextResponse.json({ error: err.message || 'Failed to download dispatch package' }, { status: 500 });
    }
}
