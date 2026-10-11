import { NextRequest, NextResponse } from 'next/server';

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

        const zohoClientId = process.env.ZOHO_CLIENT_ID;
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET;
        const zohoOrgId = process.env.ZOHO_ORG_ID;
        const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN;

        // If credentials are not yet added to environment variables
        if (!zohoClientId || !zohoClientSecret || !zohoOrgId) {
            return NextResponse.json({
                success: false,
                requiresSetup: true,
                error: 'Zoho Books credentials not yet configured in environment variables (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_ORG_ID). Please provide these details to enable 1-click sync.',
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

        // When credentials exist, perform OAuth token exchange and create invoice in Zoho Books
        // 1. Get access token from Zoho Accounts
        const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
            method: 'POST'
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            throw new Error(`Failed to refresh Zoho access token: ${tokenData.error || 'Unknown error'}`);
        }

        const accessToken = tokenData.access_token;

        // 2. Format line items for Zoho Books
        const lineItems = (items || []).map((it: any) => ({
            name: it.name,
            description: it.description || '',
            rate: it.rate,
            quantity: it.quantity,
            hsn_or_sac: it.hsn_or_sac,
        }));

        // 3. Create invoice in Zoho Books
        const zohoInvoiceRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${zohoOrgId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customer_name: customerName,
                reference_number: poNumber, // PO Number in Zoho
                invoice_number: invoiceNo,
                date: invoiceDate,
                line_items: lineItems,
                notes: `Billed from: ${billFromCompany} | Delivery to: ${deliveryAddress || '-'}`,
            })
        });

        const zohoInvoiceData = await zohoInvoiceRes.json();

        if (!zohoInvoiceRes.ok || zohoInvoiceData.code !== 0) {
            throw new Error(zohoInvoiceData.message || 'Zoho Books returned an error while creating invoice.');
        }

        return NextResponse.json({
            success: true,
            message: `Invoice ${invoiceNo} created successfully in Zoho Books!`,
            invoice: zohoInvoiceData.invoice,
        });

    } catch (err: any) {
        console.error('Zoho Invoice Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to create invoice in Zoho Books.' }, { status: 500 });
    }
}
