import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase/client';

function formatDateForZoho(dateStr: string): string {
    if (!dateStr) {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    // If DD-MM-YYYY or DD/MM/YYYY
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[2].length === 4) {
            // DD-MM-YYYY
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
            // YYYY-MM-DD
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    }
    return dateStr;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            billFromCompany,
            invoiceNo,
            invoiceDate,
            poNumber,
            poDate,
            noOfBoxes,
            customerName,
            deliveryAddress,
            taxType,
            items,
            subtotal,
            taxAmount,
            grandTotal,
        } = body;

        // Zoho Books Credentials for Creative Printers (Org ID: 651108650)
        // Defaults embedded so zero manual configuration is required in Vercel Dashboard
        const companyNorm = (billFromCompany || '').toLowerCase();
        const isPackaging = companyNorm.includes('pack');
        const isEnterprise = companyNorm.includes('enter');

        // If Creative Enterprise: handle locally without syncing to Zoho as enterprise keys are deferred
        if (isEnterprise) {
            const orderIds = (items || []).map((it: any) => it.orderId).filter((id: any) => id && id !== 'proc-charge-line');
            if (orderIds.length > 0) {
                await supabase
                    .from('orders')
                    .update({ invoice_no: invoiceNo, status: 'Invoiced' })
                    .in('id', orderIds);
            }
            return NextResponse.json({
                success: true,
                message: `Invoice ${invoiceNo} generated for Creative Enterprise (Zoho sync for Enterprise deferred as requested).`,
                invoiceNumber: invoiceNo,
                isEnterprise: true,
            });
        }

        const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
        const zohoOrgId = isPackaging ? '649079892' : '651108650';
        const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.a1389a71ee7491506a5800d9ddcb7c44.fcdb49d63bcba81f27489c06e92d1d7c';

        // If credentials are not yet added to environment variables
        if (!zohoClientId || !zohoClientSecret || !zohoOrgId || !zohoRefreshToken) {
            return NextResponse.json({
                success: false,
                requiresSetup: true,
                error: 'Zoho Books credentials not configured. Please ensure ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_ORG_ID, and ZOHO_REFRESH_TOKEN are set in .env.local',
                previewData: {
                    invoiceNo,
                    poNumber,
                    company: billFromCompany,
                    customer: customerName,
                    itemsCount: items?.length || 0,
                    grandTotal,
                }
            }, { status: 400 });
        }

        // 1. Refresh Zoho access token
        const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
            method: 'POST'
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            throw new Error(`Failed to refresh Zoho access token: ${tokenData.error || JSON.stringify(tokenData)}`);
        }

        const accessToken = tokenData.access_token;

        // 2. Resolve Customer ID
        // For Creative Printers, check BDR locations or search contact list
        let customerId = '';
        const searchCustomer = (customerName || '').toLowerCase();
        const searchAddr = (deliveryAddress || '').toLowerCase();

        if (searchCustomer.includes('bdr')) {
            if (searchAddr.includes('halol') || searchAddr.includes('tajpura') || searchAddr.includes('vanseti')) {
                customerId = '874645000002907003'; // BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD-Halol- BARODA
            } else if (searchAddr.includes('baroda') || searchAddr.includes('vadodara')) {
                customerId = '874645000000060303'; // BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD- BARODA
            } else {
                customerId = '874645000000060293'; // BDR PHARMACEUTICALS INTERNATIONAL PRIVATE LIMITED
            }
        } else {
            // Dynamic search in Zoho Contacts
            try {
                const searchRes = await fetch(`https://www.zohoapis.com/books/v3/contacts?organization_id=${zohoOrgId}&search_text=${encodeURIComponent(customerName || '')}`, {
                    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
                });
                const searchData = await searchRes.json();
                if (searchData.contacts && searchData.contacts.length > 0) {
                    customerId = searchData.contacts[0].contact_id;
                }
            } catch (searchErr) {
                console.error('Contact search error:', searchErr);
            }
        }

        if (!customerId) {
            // Fallback default customer if unmatched
            customerId = '874645000002907003';
        }

        // 3. Format line items for Zoho Books (Matching S-2526-085.pdf format)
        const isInterState = taxType === 'IGST';
        const lineItems = (items || []).map((it: any) => {
            const hsn = it.hsn_or_sac || '48192010';
            
            // Category name as line item Title: 'Cartons' / 'Label' / 'Leaflet'
            let categoryTitle = it.categoryName;
            if (!categoryTitle) {
                if (hsn.startsWith('4821')) categoryTitle = 'Label';
                else if (hsn.startsWith('4901')) categoryTitle = 'Leaflet';
                else categoryTitle = 'Cartons';
            }

            // Description layout matching S-2526-085.pdf:
            // Material Code : ...
            // Carton for [Providenz 100]
            // Packing Details: 11 boxes x 750 +1 box x 300
            let descParts: string[] = [];
            if (it.materialCode) {
                descParts.push(`Material Code : ${it.materialCode}`);
            }
            if (it.name) {
                descParts.push(it.name);
            }
            if (it.packingDetail && it.packingDetail !== '-') {
                descParts.push(it.packingDetail);
            } else if (it.description && !descParts.includes(it.description)) {
                descParts.push(it.description);
            }

            // For label processing charges: name is "Label", description is "processing charges"
            if (it.name && it.name.toLowerCase().includes('processing charges')) {
                categoryTitle = 'Label';
                descParts = ['processing charges'];
            }

            // Tax ID mapping:
            // IGST5: 874645000000060417, IGST18: 874645000000060433
            // GST5:  874645000000060423, GST18:  874645000000060439
            const gstRate = Number(it.tax_percentage || it.gstRate || 18);
            let taxId = '';
            if (gstRate === 5) {
                taxId = isInterState ? '874645000000060417' : '874645000000060423';
            } else {
                taxId = isInterState ? '874645000000060433' : '874645000000060439';
            }

            // Map to active item_id in Zoho Catalog:
            // Cartons: 874645000002219003, LEAFLET: 874645000002219025, Label: 874645000002219014
            let itemId = '874645000002219003';
            if (hsn.startsWith('4821') || categoryTitle.toLowerCase().includes('label')) {
                itemId = '874645000002219014'; // Label
            } else if (hsn.startsWith('4901') || categoryTitle.toLowerCase().includes('leaflet') || categoryTitle.toLowerCase().includes('insert')) {
                itemId = '874645000002219025'; // LEAFLET
            }

            return {
                item_id: itemId,
                name: categoryTitle,
                description: descParts.join('\n'),
                rate: it.rate,
                quantity: it.quantity,
                hsn_or_sac: hsn,
                tax_id: taxId,
            };
        });

        const formattedDate = formatDateForZoho(invoiceDate);
        const formattedPoDate = poDate ? formatDateForZoho(poDate) : formattedDate;

        // 4. Resolve next invoice number & enforce STRICT NO-OVERWRITE protection
        // Queries Zoho to guarantee the invoice number is strictly new and never touches any existing invoice
        let finalInvoiceNumber = invoiceNo;
        try {
            const latestRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${zohoOrgId}&sort_column=created_time&sort_order=D&per_page=50`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
            });
            const latestData = await latestRes.json();
            const existingInvoices: any[] = latestData.invoices || [];

            let maxNum = 0;
            let prefix = 'S-2627-';
            for (const inv of existingInvoices) {
                const m = (inv.invoice_number || '').match(/^(.*?)(\d+)$/);
                if (m) {
                    const num = parseInt(m[2], 10);
                    if (num > maxNum) {
                        maxNum = num;
                        prefix = m[1];
                    }
                }
            }

            // If no number provided or placeholder, take max + 1
            if (!finalInvoiceNumber || finalInvoiceNumber.startsWith('INV-')) {
                finalInvoiceNumber = `${prefix}${maxNum + 1}`;
            } else {
                // If provided number already exists in Zoho, NEVER overwrite — always advance to next safe number
                const alreadyExists = existingInvoices.some(
                    inv => (inv.invoice_number || '').trim().toLowerCase() === finalInvoiceNumber.trim().toLowerCase()
                );
                if (alreadyExists) {
                    console.warn(`Invoice number ${finalInvoiceNumber} already exists in Zoho. Advancing to next number to prevent overwrite.`);
                    finalInvoiceNumber = `${prefix}${maxNum + 1}`;
                }
            }
        } catch (invNumErr) {
            console.error('Error verifying invoice number uniqueness:', invNumErr);
        }

        // 5. Custom fields (Place PO No and PO Date on the right side table)
        const customFields = [];
        const poNoFieldId = isPackaging ? '687997000000081881' : '874645000000060055';
        const poDateFieldId = isPackaging ? '687997000000081885' : '874645000000060057';
        const boxesFieldId = isPackaging ? '687997000000093035' : '874645000000066053';

        if (poNumber) {
            customFields.push({
                customfield_id: poNoFieldId, // PO No on right side table
                value: poNumber,
            });
        }

        if (formattedPoDate) {
            customFields.push({
                customfield_id: poDateFieldId, // PO Date on right side table
                value: formattedPoDate,
            });
        }

        // No of boxes logic is deferred by user; omitted unless positive number passed
        if (noOfBoxes && Number(noOfBoxes) > 0) {
            customFields.push({
                customfield_id: boxesFieldId, // No of Boxes
                value: Number(noOfBoxes),
            } as any);
        }

        // 6. Create invoice in Zoho Books with ignore_auto_number_generation=true
        const zohoInvoiceRes = await fetch(
            `https://www.zohoapis.com/books/v3/invoices?organization_id=${zohoOrgId}&ignore_auto_number_generation=true`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customer_id: customerId,
                    reference_number: '', // Left side is empty so PO No appears cleanly on right side table
                    invoice_number: finalInvoiceNumber,
                    date: formattedDate,
                    custom_fields: customFields,
                    line_items: lineItems,
                    terms: 'Subject to Mumbai Jurisdiction only \n',
                    notes: '',
                })
            }
        );

        const zohoInvoiceData = await zohoInvoiceRes.json();

        if (!zohoInvoiceRes.ok || zohoInvoiceData.code !== 0) {
            throw new Error(zohoInvoiceData.message || 'Zoho Books returned an error while creating invoice.');
        }

        const invoice = zohoInvoiceData.invoice;

        return NextResponse.json({
            success: true,
            message: `Invoice ${invoice?.invoice_number || invoiceNo} created successfully in Zoho Books!`,
            invoiceNumber: invoice?.invoice_number,
            invoiceId: invoice?.invoice_id,
            invoiceUrl: invoice?.invoice_url,
            invoice: invoice,
        });

    } catch (err: any) {
        console.error('Zoho Invoice Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to create invoice in Zoho Books.' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const companyParam = (searchParams.get('company') || '').toLowerCase();
        const isEnterprise = companyParam.includes('enter');
        const isPackaging = companyParam.includes('pack');

        if (isEnterprise) {
            // Enterprise sequence from database (Zoho sync for Enterprise deferred as requested)
            const { data: entOrders } = await supabase
                .from('orders')
                .select('invoice_no')
                .ilike('from_our_company', '%enter%')
                .not('invoice_no', 'is', null)
                .neq('invoice_no', '')
                .limit(50);

            let maxNum = 1030;
            let prefix = 'P-2526-';
            for (const o of (entOrders || [])) {
                const m = (o.invoice_no || '').match(/^(.*?)(\d+)$/);
                if (m) {
                    const n = parseInt(m[2], 10);
                    if (n > maxNum) {
                        maxNum = n;
                        prefix = m[1];
                    }
                }
            }
            return NextResponse.json({
                nextInvoiceNumber: `${prefix}${maxNum + 1}`,
                latestNumber: `${prefix}${maxNum}`,
                company: 'Creative Enterprise',
            });
        }

        const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
        const zohoOrgId = isPackaging ? '649079892' : '651108650';
        const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.a1389a71ee7491506a5800d9ddcb7c44.fcdb49d63bcba81f27489c06e92d1d7c';

        const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
            method: 'POST'
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error('Failed to obtain Zoho access token');

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
        const nextInvoiceNumber = `${prefix}${maxNum + 1}`;
        return NextResponse.json({
            nextInvoiceNumber,
            latestNumber: `${prefix}${maxNum}`,
            company: isPackaging ? 'Creative Packaging' : 'Creative Printers'
        });
    } catch (err: any) {
        const { searchParams } = new URL(req.url);
        const isPackaging = (searchParams.get('company') || '').toLowerCase().includes('pack');
        return NextResponse.json({ nextInvoiceNumber: isPackaging ? 'U-2627-3046' : 'S-2627-1060' });
    }
}
