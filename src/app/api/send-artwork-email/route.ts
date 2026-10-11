import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import zlib from 'zlib';
import { supabase } from '@/utils/supabase/client';

function getIndianFormattedDate(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).formatToParts(date);

    const day = parts.find(p => p.type === 'day')?.value || String(date.getDate()).padStart(2, '0');
    const month = parts.find(p => p.type === 'month')?.value || String(date.getMonth() + 1).padStart(2, '0');
    const year = parts.find(p => p.type === 'year')?.value || String(date.getFullYear());
    return `${day}-${month}-${year}`;
}

function getCleanBrandName(rawName?: string | null): string {
    if (!rawName) return 'Product';
    const cleaned = rawName
        .replace(/\b(cartons?|labels?|leaflets?|inserts?|boxes?|box|foil|blister)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned || rawName;
}

const DEFAULT_APPROVAL_MESSAGE = `Dear Team,

PFA Artwork for approval.
Request you to check the artwork, text matter & specifications (GSM, size, board, special effects) mentioned in attached file thoroughly.

This will be the final file & specifications (GSM, size, board, special effects) used for all further processes. If any error, kindly point out before approval. Else it will be printed as per this file.
also please check order & artwork both & confirm  

Regards,
Creative Packaging - Artwork Dept`;

async function detectDateLocations(doc: PDFDocument): Promise<{ pageIdx: number; x: number; y: number }[]> {
    const locations: { pageIdx: number; x: number; y: number }[] = [];
    const pages = doc.getPages();

    pages.forEach((page, pageIdx) => {
        const contents = page.node.Contents();
        if (!contents) return;
        const arr = (contents as any).asArray ? (contents as any).asArray() : [contents];

        arr.forEach((ref: any) => {
            const streamObj = doc.context.lookup(ref) as any;
            if (!streamObj || !streamObj.contents) return;
            let str: string;
            try {
                str = zlib.inflateSync(Buffer.from(streamObj.contents)).toString('latin1');
            } catch {
                str = Buffer.from(streamObj.contents).toString('latin1');
            }

            // Target immediate Td before Date: marker (hex encoded or plain text)
            const regex = /([0-9.]+)\s+([0-9.]+)\s+Td\s*\r?\n\s*(?:<0027004400570048001D0003>|\(Date[:]?\))/gi;
            let match;
            while ((match = regex.exec(str)) !== null) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                locations.push({ pageIdx, x, y });
            }
        });
    });

    return locations;
}

async function stampTodayDateOnAllPages(inputBuffer: any, todayStr: string): Promise<any> {
    const pdfDoc = await PDFDocument.load(inputBuffer);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const locations = await detectDateLocations(pdfDoc);

    if (locations.length > 0) {
        for (const loc of locations) {
            const page = pages[loc.pageIdx];
            if (!page) continue;

            // 1. White rectangle over old date text
            page.drawRectangle({
                x: loc.x + 30,
                y: loc.y - 7,
                width: 86,
                height: 18,
                color: rgb(1, 1, 1),
            });

            // 2. Stamped today's date
            page.drawText(todayStr, {
                x: loc.x + 34,
                y: loc.y - 2,
                size: 8.5,
                font: font,
                color: rgb(0, 0, 0),
            });
        }
    } else {
        // Fallback for known multi-page table layouts
        pages.forEach((page, idx) => {
            let x = 672;
            let y = 142;
            if (idx === 1) y = 120;
            if (idx === 2) { x = 914; y = 228; }

            page.drawRectangle({
                x,
                y,
                width: 86,
                height: 18,
                color: rgb(1, 1, 1),
            });

            page.drawText(todayStr, {
                x: x + 4,
                y: y + 6,
                size: 8.5,
                font: font,
                color: rgb(0, 0, 0),
            });
        });
    }

    const modifiedBytes = await pdfDoc.save();
    return Buffer.from(modifiedBytes);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            productId,
            recipients,
            subject,
            message,
            pdfUrl,
            productName,
            artworkCode
        } = body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: 'At least one recipient email is required.' }, { status: 400 });
        }

        if (!pdfUrl) {
            return NextResponse.json({ error: 'Artwork PDF file URL is required.' }, { status: 400 });
        }

        const gmailUser = (process.env.GMAIL_USER || 'creativepackaging2@gmail.com').trim();
        const rawPass = (process.env.GMAIL_APP_PASSWORD || 'gtyhprebnhdbjghm').trim();
        const gmailPass = rawPass.replace(/\s+/g, '');

        if (!gmailUser || !gmailPass) {
            return NextResponse.json(
                { error: 'Gmail credentials not configured on the server. Please check GMAIL_USER and GMAIL_APP_PASSWORD.' },
                { status: 500 }
            );
        }

        // 1. Download PDF file into server memory buffer
        const pdfRes = await fetch(pdfUrl);
        if (!pdfRes.ok) {
            return NextResponse.json(
                { error: `Failed to download PDF artwork from storage (${pdfRes.status} ${pdfRes.statusText})` },
                { status: 502 }
            );
        }

        const arrayBuffer = await pdfRes.arrayBuffer();
        let pdfBuffer: any = Buffer.from(arrayBuffer);

        // 2. Automatically stamp today's date on ALL pages in the Date field
        const todayStr = getIndianFormattedDate();
        try {
            pdfBuffer = await stampTodayDateOnAllPages(pdfBuffer, todayStr);
        } catch (stampErr) {
            console.error('Error stamping date on PDF:', stampErr);
        }

        const cleanName = (productName || 'Artwork').replace(/[/\\?%*:|"<>]/g, '').trim();
        const attachmentFilename = `${cleanName}.pdf`;

        // 3. Keep Supabase storage and product record in sync with the dated PDF (optional background sync)
        if (productId) {
            try {
                // Extract filename from URL (e.g. "Gudcef AV Cartons.pdf")
                const parsedUrl = new URL(pdfUrl);
                const pathParts = parsedUrl.pathname.split('/');
                const storageFileName = decodeURIComponent(pathParts[pathParts.length - 1]);

                if (storageFileName && storageFileName.endsWith('.pdf')) {
                    const { error: uploadErr } = await supabase.storage
                        .from('product-files')
                        .upload(storageFileName, pdfBuffer as any, {
                            contentType: 'application/pdf',
                            upsert: true
                        });

                    if (!uploadErr) {
                        const updatedUrl = `https://enpcdhhfsnmlhlplnycu.supabase.co/storage/v1/object/public/product-files/${encodeURIComponent(storageFileName)}?v=${Date.now()}`;
                        await supabase
                            .from('products')
                            .update({ artwork_pdf: updatedUrl })
                            .eq('id', productId);
                    }
                }
            } catch (syncErr) {
                console.error('Non-critical: Failed to update Supabase storage with dated PDF:', syncErr);
            }
        }

        // 4. Configure Nodemailer with Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        // 5. Format professional HTML email
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 28px 24px; }
    .meta-box { background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 16px 0 24px; border: 1px solid #e2e8f0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #64748b; font-weight: 600; }
    .meta-val { color: #0f172a; font-weight: 700; }
    .message-box { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; white-space: pre-wrap; }
    .attach-badge { display: inline-flex; align-items: center; background: #eff6ff; color: #1d4ed8; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 13px; border: 1px solid #bfdbfe; }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Artwork for Approval</h1>
      <p>Creative Packaging</p>
    </div>
    <div class="content">
      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Product:</span>
          <span class="meta-val">${getCleanBrandName(productName)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date:</span>
          <span class="meta-val">${todayStr}</span>
        </div>
      </div>

      <div class="message-box">${message || DEFAULT_APPROVAL_MESSAGE}</div>

      <div>
        <span class="attach-badge">📎 Attached: ${attachmentFilename}</span>
      </div>
    </div>
    <div class="footer">
      Sent via Creative Packaging Manufacturing Portal • from ${gmailUser}
    </div>
  </div>
</body>
</html>
`;

        const cleanBrand = getCleanBrandName(productName);
        const finalSubject = subject || `Artwork for Approval - ${cleanBrand}`;
        const finalBody = message || DEFAULT_APPROVAL_MESSAGE;

        // 6. Send Email with dated PDF attachment
        const info = await transporter.sendMail({
            from: `"Creative Packaging" <${gmailUser}>`,
            to: recipients,
            subject: finalSubject,
            text: `${finalBody}\n\nAttached: ${attachmentFilename} (Dated: ${todayStr})`,
            html: htmlContent,
            attachments: [
                {
                    filename: attachmentFilename,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        });

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            recipients,
            attachment: attachmentFilename,
            stampedDate: todayStr,
        });

    } catch (err: any) {
        console.error('Send Artwork Email Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to send artwork approval email.' }, { status: 500 });
    }
}
