import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const invoiceId = searchParams.get('invoiceId');
        const invoiceNumber = searchParams.get('invoiceNumber');

        const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
        const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
        const zohoOrgId = process.env.ZOHO_ORG_ID || '651108650';
        const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.a1389a71ee7491506a5800d9ddcb7c44.fcdb49d63bcba81f27489c06e92d1d7c';

        const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
            method: 'POST'
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error('Failed to obtain Zoho access token');

        let targetId = invoiceId;
        if (!targetId && invoiceNumber) {
            // Search by invoice number
            const searchRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${zohoOrgId}&invoice_number=${encodeURIComponent(invoiceNumber)}`, {
                headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
            });
            const searchData = await searchRes.json();
            if (searchData.invoices && searchData.invoices.length > 0) {
                targetId = searchData.invoices[0].invoice_id;
            }
        }

        if (!targetId) {
            return NextResponse.json({ error: 'Invoice not found in Zoho Books' }, { status: 404 });
        }

        const invRes = await fetch(`https://www.zohoapis.com/books/v3/invoices/${targetId}?organization_id=${zohoOrgId}`, {
            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
        });
        const invData = await invRes.json();
        if (!invRes.ok || !invData.invoice) {
            return NextResponse.json({ error: invData.message || 'Invoice details not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            invoiceNumber: invData.invoice.invoice_number,
            invoiceUrl: invData.invoice.invoice_url,
            total: invData.invoice.total,
            status: invData.invoice.status,
            date: invData.invoice.date,
            lineItems: invData.invoice.line_items,
        });

    } catch (err: any) {
        console.error('Error fetching Zoho invoice url:', err);
        return NextResponse.json({ error: err.message || 'Error communicating with Zoho' }, { status: 500 });
    }
}
