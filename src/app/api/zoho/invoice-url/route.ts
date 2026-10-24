import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const invoiceId = searchParams.get('invoiceId');
        const invoiceNumber = searchParams.get('invoiceNumber');

        const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
        const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.a1389a71ee7491506a5800d9ddcb7c44.fcdb49d63bcba81f27489c06e92d1d7c';

        const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
            method: 'POST'
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error('Failed to obtain Zoho access token');

        // Check both Creative Printers and Creative Packaging
        const orgIds = ['651108650', '649079892'];
        if (invoiceNumber && (invoiceNumber.startsWith('U-') || invoiceNumber.toLowerCase().includes('pack'))) {
            orgIds.reverse(); // Prioritize Packaging for U- invoices
        }

        let targetId = invoiceId;
        let matchedOrgId = orgIds[0];
        let foundInvoice: any = null;

        for (const orgId of orgIds) {
            if (targetId) {
                const invRes = await fetch(`https://www.zohoapis.com/books/v3/invoices/${targetId}?organization_id=${orgId}`, {
                    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
                });
                const invData = await invRes.json();
                if (invRes.ok && invData.invoice) {
                    matchedOrgId = orgId;
                    foundInvoice = invData.invoice;
                    break;
                }
            } else if (invoiceNumber) {
                const searchRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${orgId}&invoice_number=${encodeURIComponent(invoiceNumber)}`, {
                    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
                });
                const searchData = await searchRes.json();
                if (searchData.invoices && searchData.invoices.length > 0) {
                    matchedOrgId = orgId;
                    targetId = searchData.invoices[0].invoice_id;
                    const invRes = await fetch(`https://www.zohoapis.com/books/v3/invoices/${targetId}?organization_id=${orgId}`, {
                        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
                    });
                    const invData = await invRes.json();
                    if (invRes.ok && invData.invoice) {
                        foundInvoice = invData.invoice;
                        break;
                    }
                }
            }
        }

        if (!foundInvoice) {
            return NextResponse.json({ error: 'Invoice not found in Zoho Books (checked Printers and Packaging)' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            invoiceNumber: foundInvoice.invoice_number,
            invoiceUrl: foundInvoice.invoice_url,
            total: foundInvoice.total,
            status: foundInvoice.status,
            date: foundInvoice.date,
            lineItems: foundInvoice.line_items,
            orgId: matchedOrgId,
        });

    } catch (err: any) {
        console.error('Error fetching Zoho invoice url:', err);
        return NextResponse.json({ error: err.message || 'Error communicating with Zoho' }, { status: 500 });
    }
}
