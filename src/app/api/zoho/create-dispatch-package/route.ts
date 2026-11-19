import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { normalizeCompany, parseOrderPoInfo, CompanyName } from '@/utils/orderUtils';
import { appendCoaPageToMergedDoc, getCompanyBranding } from '@/utils/generateCoaPdf';
import { resolveZohoAddress } from '@/utils/zohoAddressHelper';

export const dynamic = 'force-dynamic';

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

            // Resolve exact customer ID, shipping address ID, and place of supply
            const zohoAddr = resolveZohoAddress(isPackaging, customerName, deliveryAddress);
            let customerId = zohoAddr.customerId;
            let shippingAddressId = zohoAddr.shippingAddressId;
            let billingAddressId = zohoAddr.billingAddressId;
            let contactPlaceOfSupply = zohoAddr.placeOfSupply;
            let isInterState = zohoAddr.isInterState;

            // Line items
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
                        taxId = isInterState ? '687997000000059078' : '687997000000059084'; // IGST 18% vs Standard Rate(18)
                    } else if (isInsert) {
                        catalogItemId = '687997000000069007'; // LEAFLET
                        taxId = isInterState ? '687997000000059054' : '687997000000059068'; // IGST 5% vs Reduced Rate(5)
                    } else {
                        catalogItemId = '687997000000061011'; // CARTON
                        taxId = isInterState ? '687997000000059054' : '687997000000059068'; // IGST 5% vs Reduced Rate(5)
                    }
                } else {
                    // Creative Printers
                    if (isLabel) {
                        catalogItemId = '874645000002219014'; // Label
                        taxId = isInterState ? '874645000000060433' : '874645000000060439'; // IGST 18% vs GST 18%
                    } else if (isInsert) {
                        catalogItemId = '874645000002219025'; // LEAFLET
                        taxId = isInterState ? '874645000000060417' : '874645000000060423'; // IGST 5% vs GST 5%
                    } else {
                        catalogItemId = '874645000002219003'; // Cartons
                        taxId = isInterState ? '874645000000060417' : '874645000000060423'; // IGST 5% vs GST 5%
                    }
                }

                lineItems.push({
                    ...(catalogItemId ? { item_id: catalogItemId } : {}),
                    name: isLabel ? 'LABELS' : (isInsert ? 'LEAFLET' : 'CARTON'),
                    description: desc.trim(),
                    rate,
                    quantity: qty,
                    hsn_or_sac: hsnGst.hsn,
                    ...(taxId ? { tax_id: taxId } : {}),
                });
            }

            // Optional processing charge
            if (hasProcessing && Number(procAmount) > 0) {
                const procTaxId = isPackaging
                    ? (isInterState ? '687997000000059078' : '687997000000059084')
                    : (isInterState ? '874645000000060433' : '874645000000060439');
                const procItemId = isPackaging ? '687997000000078025' : '874645000002219014';
                lineItems.push({
                    item_id: procItemId,
                    name: 'LABELS',
                    description: procName || 'Label Processing Charges',
                    rate: Number(procAmount),
                    quantity: Number(procQty) || 1,
                    hsn_or_sac: '48211020',
                    tax_id: procTaxId,
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
                    ...(shippingAddressId ? { shipping_address_id: shippingAddressId } : {}),
                    ...(billingAddressId ? { billing_address_id: billingAddressId } : {}),
                    place_of_supply: contactPlaceOfSupply,
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

        // Add official client COAs for physical products matching COATemplate.tsx
        const brand = getCompanyBranding(finalInvoiceNumber);

        for (const ord of orders) {
            ord.invoice_no = finalInvoiceNumber;
            try {
                await appendCoaPageToMergedDoc(mergedDoc, ord, brand);
            } catch (coaErr) {
                console.error(`Error appending in-memory COA for order ${ord.id}:`, coaErr);
            }
        }

        // Save unified PDF completely in memory
        const finalPdfBytes = await mergedDoc.save();
        const finalPdfBase64 = `data:application/pdf;base64,${Buffer.from(finalPdfBytes).toString('base64')}`;
        const publicFileName = `Dispatch_Documents_${finalInvoiceNumber.trim()}.pdf`;

        // Safe file writing (optional local cache, ignored if filesystem is read-only)
        try {
            const publicDownloadsDir = path.resolve(process.cwd(), 'public', 'downloads');
            if (!fs.existsSync(publicDownloadsDir)) {
                fs.mkdirSync(publicDownloadsDir, { recursive: true });
            }
            const publicFilePath = path.join(publicDownloadsDir, publicFileName);
            fs.writeFileSync(publicFilePath, Buffer.from(finalPdfBytes));
        } catch (writeErr) {
            console.warn('public/downloads is read-only in this environment, serving PDF via base64 data URI.');
        }

        // Copy to Windows User Downloads folder if available
        try {
            const winDownloadsPath = path.join('C:', 'Users', 'Admin', 'Downloads', publicFileName);
            fs.writeFileSync(winDownloadsPath, Buffer.from(finalPdfBytes));
        } catch {}

        return NextResponse.json({
            success: true,
            orderIds,
            invoiceNumber: finalInvoiceNumber,
            invoiceId: zohoInvoiceId,
            invoiceUrl: invoiceViewUrl,
            downloadUrl: `/downloads/${publicFileName}`,
            pdfBase64: finalPdfBase64,
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
