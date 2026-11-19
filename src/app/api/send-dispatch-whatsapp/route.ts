import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/utils/supabase/client';
import { PDFDocument } from 'pdf-lib';
import { appendCoaPageToMergedDoc, getCompanyBranding } from '@/utils/generateCoaPdf';
import { getWhatsAppConfig, saveWhatsAppConfig, sendWhatsAppDocument, formatWhatsAppTarget } from '@/utils/whatsappService';

export const dynamic = 'force-dynamic';

export async function GET() {
    const config = getWhatsAppConfig();
    return NextResponse.json({
        configured: config.configured,
        provider: config.provider,
        ultraInstance: config.ultraInstance || '',
        defaultTarget: config.defaultTarget || '',
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Config save action
        if (body.action === 'save_config') {
            const { ultraInstance, ultraToken, defaultTarget } = body;
            const saved = saveWhatsAppConfig({ ultraInstance, ultraToken, defaultTarget });
            if (!saved) {
                return NextResponse.json({ error: 'Failed to write configuration to .env.local' }, { status: 500 });
            }
            const updated = getWhatsAppConfig();
            return NextResponse.json({
                success: true,
                message: 'UltraMsg configuration saved successfully.',
                configured: updated.configured,
                provider: updated.provider,
            });
        }

        const {
            invoiceNo,
            targets = [],
            target,
            caption = '', // Default empty: No write up, just the PDF
        } = body;

        if (!invoiceNo) {
            return NextResponse.json({ error: 'Invoice number is required.' }, { status: 400 });
        }

        const trimmedInv = invoiceNo.trim();
        const config = getWhatsAppConfig();

        if (!config.configured) {
            return NextResponse.json({
                error: 'WhatsApp gateway is not configured. Please enter your UltraMsg Instance ID & Token.'
            }, { status: 500 });
        }

        // Collect all target numbers
        let recipientList: string[] = [];
        if (Array.isArray(targets) && targets.length > 0) {
            recipientList = targets.map((t: any) => String(t || '').trim()).filter(Boolean);
        } else if (target && String(target).trim()) {
            recipientList = [String(target).trim()];
        } else if (config.defaultTarget) {
            recipientList = [config.defaultTarget];
        }

        if (recipientList.length === 0) {
            return NextResponse.json({ error: 'At least one recipient phone number or Group ID is required.' }, { status: 400 });
        }

        // 2. Locate or generate PDF
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

        // 3. Dispatch to all recipient targets (No write up, just the PDF)
        const results = [];
        let successCount = 0;

        for (const t of recipientList) {
            const sendRes = await sendWhatsAppDocument({
                target: t,
                filename: fileName,
                fileBuffer: pdfBuffer,
                caption: caption, // Empty string = pure PDF document only
            });

            results.push({
                target: t,
                formatted: formatWhatsAppTarget(t),
                success: sendRes.success,
                messageId: sendRes.messageId,
                error: sendRes.error,
            });

            if (sendRes.success) successCount++;
        }

        if (successCount === 0) {
            return NextResponse.json({
                error: results[0]?.error || 'Failed to deliver document via WhatsApp.',
                results,
            }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            provider: config.provider,
            filename: fileName,
            successCount,
            totalCount: recipientList.length,
            results,
            message: `PDF document sent to ${successCount} of ${recipientList.length} WhatsApp recipient(s).`
        });

    } catch (err: any) {
        console.error('Error sending WhatsApp document:', err);
        return NextResponse.json({ error: err.message || 'Internal error dispatching WhatsApp message' }, { status: 500 });
    }
}
