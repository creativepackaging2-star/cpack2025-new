import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/utils/supabase/client';
import { PDFDocument } from 'pdf-lib';
import { appendCoaPageToMergedDoc, getCompanyBranding } from '@/utils/generateCoaPdf';
import { getWhatsAppConfig, sendWhatsAppDocument, formatWhatsAppTarget } from '@/utils/whatsappService';

export const dynamic = 'force-dynamic';

export async function GET() {
    const config = getWhatsAppConfig();
    return NextResponse.json({
        configured: config.configured,
        provider: config.provider,
        defaultTarget: config.defaultTarget || '',
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            invoiceNo,
            target,
            caption,
            customerName,
            plant,
            products = [],
        } = body;

        if (!invoiceNo) {
            return NextResponse.json({ error: 'Invoice number is required.' }, { status: 400 });
        }

        const trimmedInv = invoiceNo.trim();
        const config = getWhatsAppConfig();

        if (!config.configured) {
            return NextResponse.json({
                error: 'WhatsApp gateway is not configured. Please add ULTRAMSG_INSTANCE_ID & ULTRAMSG_TOKEN or EVOLUTION_API_URL & EVOLUTION_API_KEY in .env.local.'
            }, { status: 500 });
        }

        const finalTarget = (target || config.defaultTarget || '').trim();
        if (!finalTarget) {
            return NextResponse.json({ error: 'Recipient WhatsApp phone number or Group ID is required.' }, { status: 400 });
        }

        // 1. Locate or generate PDF
        const fileName = `Dispatch_Documents_${trimmedInv}.pdf`;
        let pdfBuffer: Buffer | null = null;

        const publicPath = path.join(process.cwd(), 'public', 'downloads', fileName);
        const altPublicPath = path.join(process.cwd(), 'public', 'downloads', `Dispatch_Package_${trimmedInv}.pdf`);
        const winDownloadsPath = path.join('C:', 'Users', 'Admin', 'Downloads', fileName);

        if (fs.existsSync(publicPath)) {
            pdfBuffer = fs.readFileSync(publicPath);
        } else if (fs.existsSync(altPublicPath)) {
            pdfBuffer = fs.readFileSync(altPublicPath);
        } else if (fs.existsSync(winDownloadsPath)) {
            pdfBuffer = fs.readFileSync(winDownloadsPath);
        }

        // If not on disk, try compiling from Zoho Books or Supabase
        if (!pdfBuffer) {
            try {
                const zohoClientId = process.env.ZOHO_CLIENT_ID || '1000.KQGYJ0LFL0T9WADU4SCLRN3EW2QQIK';
                const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '4830f463f279d0aa784dcede69553d81307437d76d';
                const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.a1389a71ee7491506a5800d9ddcb7c44.fcdb49d63bcba81f27489c06e92d1d7c';

                const tokenRes = await fetch(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${zohoRefreshToken}&client_id=${zohoClientId}&client_secret=${zohoClientSecret}&grant_type=refresh_token`, {
                    method: 'POST'
                });
                const tokenData = await tokenRes.json();
                const accessToken = tokenData.access_token;

                if (accessToken) {
                    const orgIds = ['649079892', '651108650'];
                    if (trimmedInv.startsWith('S-')) orgIds.reverse();

                    let zohoInvoiceId: string | null = null;
                    let matchedOrgId = orgIds[0];

                    for (const orgId of orgIds) {
                        const searchRes = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${orgId}&invoice_number=${encodeURIComponent(trimmedInv)}`, {
                            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
                        });
                        const searchData = await searchRes.json();
                        if (searchData.invoices && searchData.invoices.length > 0) {
                            zohoInvoiceId = searchData.invoices[0].invoice_id;
                            matchedOrgId = orgId;
                            break;
                        }
                    }

                    if (zohoInvoiceId) {
                        const pdfFetchRes = await fetch(`https://www.zohoapis.com/books/v3/invoices/${zohoInvoiceId}?organization_id=${matchedOrgId}&accept=pdf`, {
                            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
                        });
                        if (pdfFetchRes.ok) {
                            const officialPdf = Buffer.from(await pdfFetchRes.arrayBuffer());
                            const zohoDoc = await PDFDocument.load(officialPdf);
                            const mergedDoc = await PDFDocument.create();

                            for (let c = 1; c <= 3; c++) {
                                const [cp] = await mergedDoc.copyPages(zohoDoc, [0]);
                                mergedDoc.addPage(cp);
                            }

                            const { data: orders } = await supabase
                                .from('orders')
                                .select('*')
                                .eq('invoice_no', trimmedInv);

                            const brand = getCompanyBranding(trimmedInv);
                            for (const ord of (orders || [])) {
                                await appendCoaPageToMergedDoc(mergedDoc, ord, brand);
                            }

                            const finalBytes = await mergedDoc.save();
                            pdfBuffer = Buffer.from(finalBytes);

                            // Cache on disk
                            try {
                                const pubDir = path.join(process.cwd(), 'public', 'downloads');
                                if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
                                fs.writeFileSync(path.join(pubDir, fileName), pdfBuffer);
                            } catch {}
                        }
                    }
                }
            } catch (compileErr) {
                console.warn('Could not auto-generate invoice package on the fly:', compileErr);
            }
        }

        if (!pdfBuffer) {
            return NextResponse.json({
                error: `PDF document for invoice ${trimmedInv} is not available on disk yet. Please generate or view the document first.`
            }, { status: 404 });
        }

        // 2. Build default caption if none supplied
        let defaultCaption = caption;
        if (!defaultCaption) {
            const productNames = (products || []).map((p: any) => p.name || p.product_name).filter(Boolean).slice(0, 3).join(', ');
            const plantLabel = plant ? ` - Plant: ${plant}` : '';
            defaultCaption = `📄 *Dispatch Documents - Invoice ${trimmedInv}*\n` +
                (customerName ? `👤 *Customer:* ${customerName}\n` : '') +
                (plantLabel ? `🏭 *Plant:* ${plant}\n` : '') +
                (productNames ? `📦 *Items:* ${productNames}\n` : '') +
                `📎 Attached: 3 Tax Invoices & Official COAs\n` +
                `_Generated by Creative Group Operations_`;
        }

        // 3. Dispatch to WhatsApp
        const result = await sendWhatsAppDocument({
            target: finalTarget,
            filename: fileName,
            fileBuffer: pdfBuffer,
            caption: defaultCaption,
        });

        if (!result.success) {
            return NextResponse.json({
                error: result.error || 'Failed to deliver document via WhatsApp.',
                provider: result.provider,
                rawResponse: result.rawResponse,
            }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            provider: result.provider,
            messageId: result.messageId,
            target: formatWhatsAppTarget(finalTarget),
            filename: fileName,
            message: `Dispatch package for ${trimmedInv} sent successfully via WhatsApp to ${finalTarget}.`
        });

    } catch (err: any) {
        console.error('Error sending WhatsApp document:', err);
        return NextResponse.json({ error: err.message || 'Internal error dispatching WhatsApp message' }, { status: 500 });
    }
}
