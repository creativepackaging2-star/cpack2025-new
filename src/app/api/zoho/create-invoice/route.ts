import { NextRequest, NextResponse } from 'next/server';

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
        const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
        const zohoOrgId = process.env.ZOHO_ORG_ID || '651108650';
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

        // 3. Format line items for Zoho Books
        const isInterState = taxType === 'IGST';
        const lineItems = (items || []).map((it: any) => {
            // First line: Material Code, then PO Item Name
            let fullName = it.name || 'Item';
            if (it.materialCode && !fullName.includes(it.materialCode)) {
                fullName = `Material Code : ${it.materialCode}\n${it.name}`;
            }

            // Next: Packing details under that
            let description = it.description || '';
            if (it.packingDetail && it.packingDetail !== '-' && !description.includes(it.packingDetail)) {
                description = description ? `${description}\nPacking Details: ${it.packingDetail}` : `Packing Details: ${it.packingDetail}`;
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

            return {
                name: fullName,
                description: description,
                rate: it.rate,
                quantity: it.quantity,
                hsn_or_sac: it.hsn_or_sac || '48192010',
                tax_id: taxId,
            };
        });

        const formattedDate = formatDateForZoho(invoiceDate);

        // 4. Create invoice in Zoho Books with ignore_auto_number_generation=true
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
                    reference_number: poNumber || '',
                    invoice_number: invoiceNo,
                    date: formattedDate,
                    line_items: lineItems,
                    notes: `Billed from: ${billFromCompany} | PO: ${poNumber || 'N/A'}\nDelivery Address: ${deliveryAddress || '-'}`,
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
