import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { normalizeCompany, parseOrderPoInfo, CompanyName } from '@/components/GenerateDocsModal';

export const dynamic = 'force-dynamic';

function getEdgeOrChromePath(): string {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const edgePath64 = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    if (fs.existsSync(edgePath)) return edgePath;
    if (fs.existsSync(edgePath64)) return edgePath64;
    if (fs.existsSync(chromePath)) return chromePath;
    throw new Error('No compatible headless browser (Edge/Chrome) found on system.');
}

function convertHtmlToPdf(htmlContent: string, outputPath: string) {
    const browserPath = getEdgeOrChromePath();
    const tempHtml = outputPath.replace(/\.pdf$/i, '.html');
    fs.writeFileSync(tempHtml, htmlContent, 'utf-8');

    try {
        execFileSync(browserPath, [
            '--headless',
            '--disable-gpu',
            '--no-pdf-header-footer',
            `--print-to-pdf=${outputPath}`,
            `file:///${tempHtml.replace(/\\/g, '/')}`
        ], { stdio: 'pipe' });
    } finally {
        if (fs.existsSync(tempHtml)) {
            try { fs.unlinkSync(tempHtml); } catch {}
        }
    }
}

function formatDateForZoho(dateStr: string): string {
    if (!dateStr) {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    }
    return dateStr;
}

function detectDefaultHsnAndGst(productName: string, artworkCode?: string) {
    const p = (productName || '').toLowerCase();
    const ac = (artworkCode || '').toLowerCase();

    if (p.includes('insert') || p.includes('leaflet') || p.includes('outsert') || p.includes('pil') || ac.includes('/i')) {
        return { hsn: '49011020', gstRate: 5 };
    }
    if (p.includes('label') || p.includes('sticker') || ac.includes('/l')) {
        return { hsn: '48211020', gstRate: 18 };
    }
    return { hsn: '48192010', gstRate: 5 }; // Carton
}

function getBase64Image(filePath: string): string {
    const full = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(full)) {
        return `data:image/png;base64,${fs.readFileSync(full).toString('base64')}`;
    }
    return '';
}

function buildOfficialCoaHtml(order: any, companyConfig: any): string {
    const logoB64 = getBase64Image('public/logo_printers.png');
    const signB64 = getBase64Image('public/sign_printers.png');

    const d = new Date();
    const todayFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const dateStr = order.delivery_date ? order.delivery_date.split('-').reverse().join('/') : todayFormatted;
    const mfgDateStr = dateStr;
    const qtyNum = order.qty_delivered || order.quantity || 0;
    const qtyStr = Number(qtyNum).toLocaleString();

    // 1. Description
    const descSpec = order.specification || order.specs || order.product_name;

    // 2. GSM
    const gsmVal = order.gsm_value || '';
    const gsmSpec = gsmVal ? `${gsmVal} +/- 5%` : 'Standard +/- 5%';

    // 3. Construction
    const constVal = order.construction_type || order.construction || 'As per approved specimen';
    const foldingDim = order.folding_dim || order.folding_dimension || '';
    const isInsert = (order.category_name || '').toLowerCase().includes('insert') || (order.product_name || '').toLowerCase().includes('leaflet') || (order.product_name || '').toLowerCase().includes('insert');
    const constSpec = isInsert && foldingDim ? `${constVal} (${foldingDim})` : constVal;

    // 4. Dimensions
    const dimVal = order.dimension || '';
    const dimSpec = dimVal ? `${dimVal} mm +/-2mm` : 'Standard mm +/-2mm';

    // 5. Shade
    const shadeSpec = 'Will comply with shade';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certificate of Analysis</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Herr+Von+Muellerhoff&display=swap');
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: black; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .coa-page { width: 210mm; min-height: 297mm; padding: 20mm 18mm 15mm 18mm; margin: 0 auto; position: relative; background: white; display: flex; flex-direction: column; }
        .header { border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px; }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .logo { width: 200px; height: auto; }
        .header-info { font-size: 11px; font-weight: 500; color: #475569; margin-top: 6px; }
        .title-box { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
        .title { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #0f172a; }
        .customer-section { margin-bottom: 20px; font-size: 13px; }
        .customer-row { display: flex; margin-bottom: 6px; }
        .customer-label { width: 140px; font-weight: bold; color: #334155; }
        .customer-value { flex: 1; font-weight: 600; color: #0f172a; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #94a3b8; margin-bottom: 24px; font-size: 12px; }
        .detail-row { display: flex; border-bottom: 1px solid #94a3b8; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { width: 130px; font-weight: bold; background-color: #f8fafc; padding: 8px 10px; border-right: 1px solid #94a3b8; color: #334155; }
        .detail-value { flex: 1; padding: 8px 10px; font-weight: 600; color: #0f172a; }
        .border-r { border-right: 1px solid #94a3b8; }
        table.test-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
        table.test-table th { background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 10px; font-weight: bold; color: #1e293b; text-align: left; }
        table.test-table td { border: 1px solid #94a3b8; padding: 8px 10px; vertical-align: middle; }
        td.text-center { text-align: center; }
        td.font-medium { font-weight: 500; }
        .ok-text { font-weight: bold; color: #047857; }
        .signatures-section { margin-top: auto; padding-top: 16px; }
        .sign-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
        .sign-col { font-size: 13px; }
        .sign-col.text-right { text-align: right; }
        .sign-name { font-weight: bold; color: #334155; }
        .script-sign { margin-top: 4px; font-size: 36px; color: #1e3a8a; transform: rotate(-3deg); margin-left: 8px; line-height: 1; font-family: 'Great Vibes', cursive; }
        .script-sign-right { margin-top: 4px; font-size: 42px; color: #1e3a8a; transform: rotate(-4deg); margin-right: 12px; line-height: 1; font-family: 'Herr Von Muellerhoff', cursive; }
        .proprietor-box { border-top: 1px solid #94a3b8; padding-top: 12px; text-align: right; }
        .proprietor-content { display: inline-block; text-align: center; }
        .sign-img { height: 28px; width: auto; margin-bottom: 4px; }
        .proprietor-label { color: #1d4ed8; font-weight: bold; font-size: 11px; text-transform: uppercase; border-top: 1px solid #cbd5e1; padding-top: 3px; display: inline-block; padding-left: 14px; padding-right: 14px; }
    </style>
</head>
<body>
    <div class="coa-page">
        <!-- Header -->
        <div class="header">
            <div class="header-top">
                <img src="${logoB64}" alt="${companyConfig.name}" class="logo">
            </div>
            <div class="header-info">
                <p>${companyConfig.address}</p>
                <p style="margin-top: 4px;">Email: ${companyConfig.email} | M: ${companyConfig.mobile} | GSTN: ${companyConfig.gstn}</p>
            </div>
        </div>

        <!-- Title -->
        <div class="title-box">
            <h1 class="title">Certificate of Analysis</h1>
        </div>

        <!-- Customer Section -->
        <div class="customer-section">
            <div class="customer-row">
                <span class="customer-label">Customer Name:</span>
                <span class="customer-value">${order.customer_name || 'BDR Pharmaceuticals International Pvt. Ltd.'}</span>
            </div>
            <div class="customer-row">
                <span class="customer-label">Address:</span>
                <span class="customer-value" style="white-space: pre-wrap;">${order.delivery_address || ''}</span>
            </div>
        </div>

        <!-- 7 Details Fields Grid -->
        <div class="details-grid">
            <div class="border-r">
                <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${dateStr}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invoice No:</span>
                    <span class="detail-value">${order.invoice_no || ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Batch No:</span>
                    <span class="detail-value">${order.batch_no || ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Mfg Date:</span>
                    <span class="detail-value">${mfgDateStr}</span>
                </div>
            </div>
            <div>
                <div class="detail-row">
                    <span class="detail-label">Item Name:</span>
                    <span class="detail-value">${order.product_name || ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Quantity:</span>
                    <span class="detail-value">${qtyStr}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Artwork Code:</span>
                    <span class="detail-value">${order.artwork_code || ''}</span>
                </div>
            </div>
        </div>

        <!-- 5 Official Tests Table -->
        <table class="test-table">
            <thead>
                <tr>
                    <th style="width: 60px;" class="text-center">Sr. No.</th>
                    <th style="width: 140px;">Test</th>
                    <th>Specification</th>
                    <th style="width: 140px;" class="text-center">Observation</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="text-center font-medium">1</td>
                    <td style="font-weight: bold; color: #1e293b;">Description</td>
                    <td style="color: #334155;">${descSpec}</td>
                    <td class="text-center ok-text">OK</td>
                </tr>
                <tr>
                    <td class="text-center font-medium">2</td>
                    <td style="font-weight: bold; color: #1e293b;">GSM</td>
                    <td style="color: #334155;">${gsmSpec}</td>
                    <td class="text-center ok-text">OK</td>
                </tr>
                <tr>
                    <td class="text-center font-medium">3</td>
                    <td style="font-weight: bold; color: #1e293b;">Construction</td>
                    <td style="color: #334155;">${constSpec}</td>
                    <td class="text-center ok-text">OK</td>
                </tr>
                <tr>
                    <td class="text-center font-medium">4</td>
                    <td style="font-weight: bold; color: #1e293b;">Dimensions</td>
                    <td style="color: #334155;">${dimSpec}</td>
                    <td class="text-center ok-text">OK</td>
                </tr>
                <tr>
                    <td class="text-center font-medium">5</td>
                    <td style="font-weight: bold; color: #1e293b;">Shade</td>
                    <td style="color: #334155;">${shadeSpec}</td>
                    <td class="text-center ok-text">OK</td>
                </tr>
            </tbody>
        </table>

        <!-- Official Signatures Section -->
        <div class="signatures-section">
            <div class="sign-row">
                <div class="sign-col">
                    <p class="sign-name">Checked By : <span style="font-weight: 500;">Laxman</span></p>
                    <div class="script-sign">LS</div>
                </div>
                <div class="sign-col text-right">
                    <p class="sign-name">Approved By : <span style="font-weight: 500;">Saahil</span></p>
                    <div class="script-sign-right">Sps</div>
                </div>
            </div>

            <div class="proprietor-box">
                <div class="proprietor-content">
                    <div style="height: 28px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                        <img src="${signB64}" alt="${companyConfig.proprietor_label}" class="sign-img">
                    </div>
                    <p class="proprietor-label">${companyConfig.proprietor_label}</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            orderIds = [],
            noOfBoxes = 0,
            hasProcessing = false,
            procQty = 1,
            procAmount = 0,
            procName = 'Label Processing Charges',
        } = body;

        if (!orderIds || orderIds.length === 0) {
            return NextResponse.json({ error: 'No orders selected.' }, { status: 400 });
        }

        // 1. Fetch full order details
        const { data: orders, error: ordErr } = await supabase
            .from('orders')
            .select(`
                *,
                products (
                    id,
                    product_name,
                    artwork_code,
                    dimension,
                    folding,
                    folding_dim,
                    ink,
                    plate_no,
                    coating,
                    special_effects,
                    specs,
                    gsm!fk_gsm (name),
                    paper_types!fk_paper_type (name),
                    constructions!fk_construction (name),
                    specifications!fk_specification (name)
                )
            `)
            .in('id', orderIds);

        if (ordErr || !orders || orders.length === 0) {
            return NextResponse.json({ error: ordErr?.message || 'Failed to fetch orders.' }, { status: 400 });
        }

        const billingCompany = normalizeCompany(orders[0].from_our_company);
        const isPackaging = billingCompany.toLowerCase().includes('pack');
        const isEnterprise = billingCompany.toLowerCase().includes('enter');

        // Customer & Delivery info
        const customerName = orders[0].customer_name?.trim() || 'BDR Pharmaceuticals International Pvt. Ltd.';
        const deliveryAddress = orders[0].delivery_address?.trim() || '';

        // Extract PO info
        let poNumber = '';
        let poDate = '';
        for (const o of orders) {
            const poInfo = parseOrderPoInfo(o.remarks);
            if (poInfo.isTagged) {
                if (poInfo.poNumber && !poNumber) poNumber = poInfo.poNumber;
                if (poInfo.poDate && !poDate) poDate = poInfo.poDate;
            }
        }

        // Credentials
        const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
        const zohoOrgId = isPackaging ? '649079892' : '651108650';
        const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.a1389a71ee7491506a5800d9ddcb7c44.fcdb49d63bcba81f27489c06e92d1d7c';

        let finalInvoiceNumber = '';
        let zohoInvoiceId = '';
        let invoiceViewUrl = '';
        let officialInvoicePdfBuffer: Buffer | null = null;

        if (isEnterprise) {
            // Enterprise: handle locally
            finalInvoiceNumber = `P-2627-${Date.now().toString().slice(-4)}`;
        } else {
            // Zoho Books OAuth token
            const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
                method: 'POST'
            });
            const tokenData = await tokenRes.json();
            const accessToken = tokenData.access_token;
            if (!accessToken) throw new Error('Failed to obtain Zoho access token');

            // Find next safe invoice number
            const latestRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${zohoOrgId}&sort_column=created_time&sort_order=D&per_page=50`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
            });
            const latestData = await latestRes.json();
            let maxNum = 0;
            let prefix = isPackaging ? 'U-2627-' : 'S-2627-';
            for (const inv of (latestData.invoices || [])) {
                const m = (inv.invoice_number || '').match(/^(.*?)(\d+)$/);
                if (m) {
                    const num = parseInt(m[2], 10);
                    if (num > maxNum) {
                        maxNum = num;
                        prefix = m[1];
                    }
                }
            }
            finalInvoiceNumber = `${prefix}${maxNum + 1}`;

            // Resolve contact ID
            let customerId = isPackaging ? '687997000000062001' : '874645000000060001';
            try {
                const searchKeyword = customerName.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/)[0] || 'BDR';
                const searchRes = await fetch(`https://www.zohoapis.com/books/v3/contacts?organization_id=${zohoOrgId}&search_text=${encodeURIComponent(searchKeyword)}`, {
                    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
                });
                const searchData = await searchRes.json();
                if (searchData.contacts && searchData.contacts.length > 0) {
                    if (isPackaging && deliveryAddress.toLowerCase().includes('padra')) {
                        const padra = searchData.contacts.find((c: any) => (c.contact_name || '').toLowerCase().includes('padra'));
                        customerId = padra ? padra.contact_id : searchData.contacts[0].contact_id;
                    } else {
                        customerId = searchData.contacts[0].contact_id;
                    }
                }
            } catch {}

            // Line items
            const isInterState = true;
            const lineItems: any[] = [];
            for (const o of orders) {
                const poInfo = parseOrderPoInfo(o.remarks, o.rate);
                const exactName = poInfo.isTagged && poInfo.poItemName ? poInfo.poItemName : o.product_name;
                const rate = poInfo.isTagged && poInfo.rate ? poInfo.rate : (o.rate || 0);
                const qty = o.qty_delivered || o.quantity || 0;
                const hsnGst = detectDefaultHsnAndGst(o.product_name, o.artwork_code);

                let desc = '';
                if (poInfo.materialCode) desc += `Material Code : ${poInfo.materialCode}\n`;
                desc += `${exactName}\n`;
                if (o.packing_detail) desc += o.packing_detail;

                const isInsert = exactName.toLowerCase().includes('insert') || exactName.toLowerCase().includes('leaflet') || o.product_name.toLowerCase().includes('insert');
                const isLabel = hsnGst.gstRate === 18 || exactName.toLowerCase().includes('label') || o.product_name.toLowerCase().includes('label');

                // Catalog Item ID & Tax ID
                let catalogItemId: string | undefined;
                let taxId: string | undefined;

                if (isPackaging) {
                    if (isLabel) {
                        catalogItemId = '687997000000078025'; // LABELS
                        taxId = '687997000000059078'; // IGST 18%
                    } else if (isInsert) {
                        catalogItemId = '687997000000069007'; // LEAFLET
                        taxId = '687997000000059054'; // IGST 5%
                    } else {
                        catalogItemId = '687997000000061011'; // CARTON
                        taxId = '687997000000059054'; // IGST 5%
                    }
                } else {
                    catalogItemId = isLabel ? '874645000002219014' : '874645000002219003';
                    taxId = isLabel ? '874645000000060043' : '874645000000060037';
                }

                lineItems.push({
                    ...(catalogItemId ? { item_id: catalogItemId } : {}),
                    name: isLabel ? 'LABELS' : (isInsert ? 'LEAFLET' : 'CARTON'),
                    description: desc.trim(),
                    rate,
                    quantity: qty,
                    hsn_or_sac: hsnGst.hsn,
                    ...(taxId ? { tax_id: taxId } : {}),
                    tax_name: isInterState ? `IGST [${hsnGst.gstRate}%]` : `GST [${hsnGst.gstRate}%]`,
                    tax_percentage: hsnGst.gstRate,
                });
            }

            // Optional processing charge
            if (hasProcessing && Number(procAmount) > 0) {
                const procTaxId = isPackaging ? '687997000000059078' : '874645000000060043';
                const procItemId = isPackaging ? '687997000000078025' : '874645000002219014';
                lineItems.push({
                    item_id: procItemId,
                    name: 'LABELS',
                    description: procName || 'Label Processing Charges',
                    rate: Number(procAmount),
                    quantity: Number(procQty) || 1,
                    hsn_or_sac: '48211020',
                    tax_id: procTaxId,
                    tax_name: isInterState ? 'IGST [18%]' : 'GST [18%]',
                    tax_percentage: 18,
                });
            }

            // Custom fields
            const customFields = [];
            const poNoFieldId = isPackaging ? '687997000000081881' : '874645000000060055';
            const poDateFieldId = isPackaging ? '687997000000081885' : '874645000000060057';
            const boxesFieldId = isPackaging ? '687997000000093035' : '874645000000066053';

            if (poNumber) customFields.push({ customfield_id: poNoFieldId, value: poNumber });
            if (poDate) customFields.push({ customfield_id: poDateFieldId, value: formatDateForZoho(poDate) });
            if (noOfBoxes && Number(noOfBoxes) > 0) customFields.push({ customfield_id: boxesFieldId, value: Number(noOfBoxes) });

            const todayZoho = formatDateForZoho('');

            // Create Invoice in Zoho Books
            const createRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${zohoOrgId}&ignore_auto_number_generation=true`, {
                method: 'POST',
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_id: customerId,
                    invoice_number: finalInvoiceNumber,
                    date: todayZoho,
                    line_items: lineItems,
                    custom_fields: customFields,
                    reference_number: '',
                    notes: 'This is a computer generated invoice, does not require signature.',
                    terms: 'Due on Receipt',
                })
            });

            const createData = await createRes.json();
            if (!createRes.ok || createData.code !== 0) {
                throw new Error(createData.message || 'Zoho Books returned an error while creating invoice.');
            }

            zohoInvoiceId = createData.invoice.invoice_id;
            invoiceViewUrl = createData.invoice.invoice_url;
            finalInvoiceNumber = createData.invoice.invoice_number || finalInvoiceNumber;

            // Fetch the official 1-page PDF directly from Zoho Books
            const pdfFetchRes = await fetch(`https://www.zohoapis.com/books/v3/invoices/${zohoInvoiceId}?organization_id=${zohoOrgId}&accept=pdf`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
            });
            if (pdfFetchRes.ok) {
                officialInvoicePdfBuffer = Buffer.from(await pdfFetchRes.arrayBuffer());
            }
        }

        // 2. Update orders in Supabase
        await supabase
            .from('orders')
            .update({
                invoice_no: finalInvoiceNumber,
                status: 'Complete'
            })
            .in('id', orderIds);

        // 3. Build Unified 3-Copy Invoices + Client COAs Package
        const mergedDoc = await PDFDocument.create();

        // Add 3 identical copies of the official Zoho invoice
        if (officialInvoicePdfBuffer) {
            const zohoDoc = await PDFDocument.load(officialInvoicePdfBuffer);
            for (let copy = 1; copy <= 3; copy++) {
                const [copiedPage] = await mergedDoc.copyPages(zohoDoc, [0]);
                mergedDoc.addPage(copiedPage);
            }
        }

        // Add official client COAs for physical products
        const companyConfig = {
            name: isPackaging ? 'CREATIVE PACKAGING' : 'CREATIVE PRINTERS',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '8097032001',
            gstn: isPackaging ? '27AAPFS8382R1ZL' : '27CGTPS8217E1ZT',
            proprietor_label: 'Proprietor',
        };

        const tempDir = path.resolve(process.cwd(), 'temp_build');
        fs.mkdirSync(tempDir, { recursive: true });

        for (const ord of orders) {
            // Attach invoice_no to order object for COA
            ord.invoice_no = finalInvoiceNumber;
            const coaHtml = buildOfficialCoaHtml(ord, companyConfig);
            const coaPdfPath = path.join(tempDir, `coa_${ord.id}_${Date.now()}.pdf`);

            try {
                convertHtmlToPdf(coaHtml, coaPdfPath);
                if (fs.existsSync(coaPdfPath)) {
                    const coaBuffer = fs.readFileSync(coaPdfPath);
                    const coaDoc = await PDFDocument.load(coaBuffer);
                    for (let pIdx = 0; pIdx < coaDoc.getPageCount(); pIdx++) {
                        const [cPage] = await mergedDoc.copyPages(coaDoc, [pIdx]);
                        mergedDoc.addPage(cPage);
                    }
                    fs.unlinkSync(coaPdfPath);
                }
            } catch (coaErr) {
                console.error(`Error generating COA for order ${ord.id}:`, coaErr);
            }
        }

        // Clean temp dir
        try { fs.rmdirSync(tempDir); } catch {}

        // Save unified PDF
        const finalPdfBytes = await mergedDoc.save();
        const publicDownloadsDir = path.resolve(process.cwd(), 'public', 'downloads');
        fs.mkdirSync(publicDownloadsDir, { recursive: true });

        const publicFileName = `Dispatch_Documents_${finalInvoiceNumber.trim()}.pdf`;
        const publicFilePath = path.join(publicDownloadsDir, publicFileName);
        fs.writeFileSync(publicFilePath, Buffer.from(finalPdfBytes));

        // Copy to Windows User Downloads folder if available
        const winDownloadsPath = path.join('C:', 'Users', 'Admin', 'Downloads', publicFileName);
        try {
            fs.writeFileSync(winDownloadsPath, Buffer.from(finalPdfBytes));
        } catch {}

        return NextResponse.json({
            success: true,
            invoiceNumber: finalInvoiceNumber,
            invoiceId: zohoInvoiceId,
            invoiceUrl: invoiceViewUrl,
            downloadUrl: `/downloads/${publicFileName}`,
            invoice: {
                invoice_number: finalInvoiceNumber,
                date: new Date().toISOString().slice(0, 10),
                customer_name: orders[0]?.customer_name || 'BDR Pharmaceuticals International Pvt. Ltd.',
                delivery_address: orders[0]?.delivery_address || '',
                company: isPackaging ? 'Creative Packaging' : 'Creative Printers',
                orders: orders.map((o: any) => ({
                    product_name: o.product_name,
                    qty_delivered: o.qty_delivered || o.quantity,
                    packing_detail: o.packing_detail,
                })),
                pdf_available: true,
                pdf_url: `/downloads/${publicFileName}`,
                po_number: poNumber,
                total_boxes: noOfBoxes,
            },
            message: `Invoice ${finalInvoiceNumber} created in Zoho Books and unified 3-copy + COA package compiled!`,
        });

    } catch (err: any) {
        console.error('Error in create-dispatch-package:', err);
        return NextResponse.json({ error: err.message || 'Failed to create dispatch package.' }, { status: 500 });
    }
}
