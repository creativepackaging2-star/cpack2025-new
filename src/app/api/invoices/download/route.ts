import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

async function appendCoaPageToMergedDoc(mergedDoc: PDFDocument, ord: any, companyConfig: any) {
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const page = mergedDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const fontRegular = await mergedDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

    const pad = 36;
    const width = A4_WIDTH - pad * 2;
    let y = A4_HEIGHT - pad;

    // Header: Company
    page.drawText(companyConfig.name, { x: pad, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
    y -= 14;
    page.drawText(companyConfig.address, { x: pad, y, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    y -= 11;
    page.drawText(`Email: ${companyConfig.email} | M: ${companyConfig.mobile} | GSTN: ${companyConfig.gstn}`, { x: pad, y, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    y -= 10;

    page.drawLine({ start: { x: pad, y }, end: { x: pad + width, y }, thickness: 1.5, color: rgb(0.1, 0.1, 0.2) });
    y -= 22;

    // Title: CERTIFICATE OF ANALYSIS
    const title = 'CERTIFICATE OF ANALYSIS';
    const titleW = fontBold.widthOfTextAtSize(title, 14);
    page.drawText(title, { x: pad + (width - titleW) / 2, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.3) });
    y -= 18;

    page.drawLine({ start: { x: pad + 80, y }, end: { x: pad + width - 80, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 18;

    // Customer
    page.drawText('Customer Name:', { x: pad, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(ord.customer_name || 'BDR Pharmaceuticals International Pvt. Ltd.', { x: pad + 90, y, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
    y -= 14;
    page.drawText('Address:', { x: pad, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    const addr = (ord.delivery_address || 'Survey No. 51/1, At Vanseti Village, Po: Tajpura, Taluka - Halol, Dist. Panchamahals.').slice(0, 80);
    page.drawText(addr, { x: pad + 90, y, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    y -= 20;

    // Grid details
    const gridH = 68;
    const colW = width / 2;
    page.drawRectangle({ x: pad, y: y - gridH, width, height: gridH, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1 });
    page.drawLine({ start: { x: pad + colW, y }, end: { x: pad + colW, y: y - gridH }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });

    const d = new Date();
    const todayFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const dateStr = ord.delivery_date ? ord.delivery_date.split('-').reverse().join('/') : todayFormatted;

    const leftFields = [
        ['Date:', dateStr],
        ['Invoice No:', ord.invoice_no || '-'],
        ['Batch No:', ord.batch_no || '-'],
        ['Mfg Date:', dateStr]
    ];
    const rightFields = [
        ['Item Name:', (ord.product_name || '-').slice(0, 32)],
        ['Quantity:', Number(ord.qty_delivered || ord.quantity || 0).toLocaleString()],
        ['Artwork Code:', ord.artwork_code || '-']
    ];

    let rowY = y - 13;
    for (const [lbl, val] of leftFields) {
        page.drawText(lbl, { x: pad + 8, y: rowY, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(val, { x: pad + 70, y: rowY, size: 8, font: fontRegular, color: rgb(0, 0, 0) });
        rowY -= 15;
    }

    rowY = y - 13;
    for (const [lbl, val] of rightFields) {
        page.drawText(lbl, { x: pad + colW + 8, y: rowY, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(val, { x: pad + colW + 80, y: rowY, size: 8, font: fontRegular, color: rgb(0, 0, 0) });
        rowY -= 15;
    }
    y -= (gridH + 20);

    // Tests Table
    const col1 = 35;  // SR NO
    const col2 = 110; // TEST
    const col3 = width - col1 - col2 - 80; // SPECIFICATION
    const col4 = 80;  // RESULT

    page.drawRectangle({ x: pad, y: y - 18, width, height: 18, color: rgb(0.93, 0.95, 0.97), borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1 });
    page.drawText('SR NO', { x: pad + 6, y: y - 13, size: 8, font: fontBold });
    page.drawText('TEST', { x: pad + col1 + 8, y: y - 13, size: 8, font: fontBold });
    page.drawText('SPECIFICATION', { x: pad + col1 + col2 + 8, y: y - 13, size: 8, font: fontBold });
    page.drawText('RESULT', { x: pad + col1 + col2 + col3 + 18, y: y - 13, size: 8, font: fontBold });
    y -= 18;

    const descSpec = (ord.specification || ord.specs || ord.product_name || '').slice(0, 50);
    const gsmVal = ord.gsm_value || '';
    const gsmSpec = gsmVal ? `${gsmVal} +/- 5%` : 'Standard +/- 5%';
    const constVal = ord.construction_type || ord.construction || 'As per approved specimen';
    const dimVal = (ord.dimension || '').slice(0, 30);
    const dimSpec = dimVal ? `${dimVal} mm +/-2mm` : 'Standard mm +/-2mm';

    const tests = [
        ['1', 'Description', descSpec],
        ['2', 'GSM', gsmSpec],
        ['3', 'Construction', constVal],
        ['4', 'Dimensions', dimSpec],
        ['5', 'Shade', 'Will comply with shade']
    ];

    const rowH = 22;
    for (const [sr, tName, spec] of tests) {
        page.drawRectangle({ x: pad, y: y - rowH, width, height: rowH, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
        page.drawText(sr, { x: pad + 12, y: y - 14, size: 8, font: fontRegular });
        page.drawText(tName, { x: pad + col1 + 8, y: y - 14, size: 8, font: fontBold });
        page.drawText(spec, { x: pad + col1 + col2 + 8, y: y - 14, size: 7.5, font: fontRegular });
        page.drawText('OK', { x: pad + col1 + col2 + col3 + 28, y: y - 14, size: 8, font: fontBold, color: rgb(0.1, 0.5, 0.2) });
        y -= rowH;
    }
    y -= 18;

    // Remark
    page.drawText('Remark: The above consignment complies with our specified quality control parameters & approved specimens.', { x: pad, y, size: 7.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 50;

    // Footer Signatures
    page.drawText('Checked By : Laxman', { x: pad + 10, y, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText('Approved By : Saahil', { x: pad + width - 140, y, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    y -= 14;
    page.drawText(`For ${companyConfig.name}`, { x: pad + width - 140, y, size: 8.5, font: fontBold, color: rgb(0.1, 0.2, 0.7) });
    y -= 10;
    page.drawText(companyConfig.proprietor_label || 'Authorised Signatory', { x: pad + width - 140, y, size: 7.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
}

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

        const isPackaging = matchedOrgId === '649079892' || trimmed.startsWith('U-');
        const companyConfig = {
            name: isPackaging ? 'CREATIVE PACKAGING' : 'CREATIVE PRINTERS',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '8097032001',
            gstn: isPackaging ? '27AAPFS8382R1ZL' : '27CGTPS8217E1ZT',
            proprietor_label: 'Proprietor',
        };

        for (const ord of (orders || [])) {
            try {
                await appendCoaPageToMergedDoc(mergedDoc, ord, companyConfig);
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
