import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

// Generates the delivery label PDF in exact A4 paper format
async function generateDeliveryLabelA4PdfBuffer(orderData: {
    productName?: string;
    deliveryAddress?: string;
    invoiceNo?: string;
    company?: string;
}): Promise<Buffer> {
    const { productName, deliveryAddress, invoiceNo, company } = orderData;

    const brandConfig: Record<string, { name: string; address: string; email: string; mobile: string }> = {
        'Enterprise': {
            name: 'CREATIVE ENTERPRISE',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '9146178720',
        },
        'Printers': {
            name: 'CREATIVE PRINTERS',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '8097032001',
        },
        'Packaging': {
            name: 'CREATIVE PACKAGING',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '8097032001',
        }
    };
    const branding = brandConfig[company || 'Packaging'] || brandConfig['Packaging'];

    const pdfDoc = await PDFDocument.create();
    // Standard A4 dimensions in points: 595.28 x 841.89 pt (8.27 x 11.69 inches)
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Box label dimensions: 5.6in x 4.0in
    const labelW = 5.6 * 72; // 403.2 pt
    const labelH = 4.0 * 72; // 288 pt

    // Position label at top-left of A4 page (matches browser print to A4)
    const startX = 25;
    const startY = A4_HEIGHT - 25 - labelH;

    const pad = 12;
    const footerH = 32;
    const bodyW = labelW - pad * 2;
    const bodyH = labelH - pad * 2 - footerH;
    const bodyY = startY + pad + footerH;

    const leftW = Math.round(bodyW * 0.58);
    const rightW = bodyW - leftW;

    // 1. Left Box: Delivery Address
    page.drawRectangle({
        x: startX + pad,
        y: bodyY,
        width: leftW,
        height: bodyH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    page.drawText('DELIVERY ADDRESS:', {
        x: startX + pad + 8,
        y: bodyY + bodyH - 16,
        size: 8,
        font: fontBold,
        color: rgb(0.35, 0.35, 0.35),
    });

    const rawAddr = deliveryAddress || '<<[Delivery Address]>>';
    const words = rawAddr.split(/\s+/);
    const lines: string[] = [];
    let curLine = '';
    for (const w of words) {
        const test = curLine ? `${curLine} ${w}` : w;
        if (fontRegular.widthOfTextAtSize(test, 9) > leftW - 16) {
            if (curLine) lines.push(curLine);
            curLine = w;
        } else {
            curLine = test;
        }
    }
    if (curLine) lines.push(curLine);

    let addrY = bodyY + bodyH - 32;
    for (const line of lines) {
        if (addrY < bodyY + 6) break;
        page.drawText(line, {
            x: startX + pad + 8,
            y: addrY,
            size: 9,
            font: fontRegular,
            color: rgb(0, 0, 0),
        });
        addrY -= 13;
    }

    // 2. Right Box: 6 rows (Product / Qty / Invoice No)
    page.drawRectangle({
        x: startX + pad + leftW,
        y: bodyY,
        width: rightW,
        height: bodyH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    const rowH = bodyH / 6;
    for (let i = 1; i < 6; i++) {
        page.drawLine({
            start: { x: startX + pad + leftW, y: bodyY + bodyH - i * rowH },
            end: { x: startX + pad + bodyW, y: bodyY + bodyH - i * rowH },
            thickness: 1,
            color: rgb(0, 0, 0),
        });
    }

    const drawCentered = (text: string, rowIdx: number, font: any, size: number, color: any) => {
        const yCenter = bodyY + bodyH - (rowIdx + 0.5) * rowH;
        const textW = font.widthOfTextAtSize(text, size);
        const x = startX + pad + leftW + (rightW - textW) / 2;
        page.drawText(text, {
            x: Math.max(startX + pad + leftW + 4, x),
            y: yCenter - size / 3,
            size,
            font,
            color,
        });
    };

    drawCentered('PRODUCT', 0, fontRegular, 8, rgb(0.35, 0.35, 0.35));

    const pName = (productName || '<<[Product Name]>>').toUpperCase();
    drawCentered(pName.length > 22 ? pName.slice(0, 22) + '...' : pName, 1, fontBold, 9, rgb(0, 0, 0));

    drawCentered('QTY', 2, fontRegular, 8, rgb(0.35, 0.35, 0.35));

    drawCentered('INVOICE NO', 4, fontRegular, 8, rgb(0.35, 0.35, 0.35));

    const invText = invoiceNo || '<<[Inv No]>>';
    drawCentered(invText, 5, fontRegular, 9, rgb(0, 0, 0));

    // 3. Footer Branding
    page.drawLine({
        start: { x: startX + pad, y: startY + pad + footerH },
        end: { x: startX + pad + bodyW, y: startY + pad + footerH },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    const compW = fontBold.widthOfTextAtSize(branding.name, 8.5);
    page.drawText(branding.name, {
        x: startX + (labelW - compW) / 2,
        y: startY + pad + 20,
        size: 8.5,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    const addrW = fontRegular.widthOfTextAtSize(branding.address, 6.5);
    page.drawText(branding.address, {
        x: startX + (labelW - addrW) / 2,
        y: startY + pad + 11,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
    });

    const contactStr = `M: ${branding.mobile} | ${branding.email}`;
    const contactW = fontRegular.widthOfTextAtSize(contactStr, 6.5);
    page.drawText(contactStr, {
        x: startX + (labelW - contactW) / 2,
        y: startY + pad + 3,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
    });

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            recipients,
            subject,
            message,
            productName,
            deliveryAddress,
            invoiceNo,
            company = 'Packaging',
        } = body;

        // 1. Validate recipients
        const validRecipients = (Array.isArray(recipients) ? recipients : [recipients])
            .map((r: string) => (r || '').trim())
            .filter((r: string) => r.length > 0 && r.includes('@'));

        if (validRecipients.length === 0) {
            return NextResponse.json(
                { error: 'At least one valid recipient email address is required.' },
                { status: 400 }
            );
        }

        // 2. Generate A4 PDF in-memory (100% serverless safe, exact A4 sheet format)
        const pdfBuffer = await generateDeliveryLabelA4PdfBuffer({
            productName,
            deliveryAddress,
            invoiceNo,
            company,
        });

        const safeName = (productName || 'Product').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
        const attachmentFilename = `${safeName}_DeliveryLabel.pdf`;

        // 3. Configure Nodemailer with Gmail SMTP
        const gmailUser = (process.env.GMAIL_USER || 'creativepackaging2@gmail.com').trim();
        const rawPass = (process.env.GMAIL_APP_PASSWORD || 'gtyhprebnhdbjghm').trim();
        const gmailPass = rawPass.replace(/\s+/g, '');

        if (!gmailUser || !gmailPass) {
            return NextResponse.json(
                { error: 'Gmail credentials not configured on server (GMAIL_USER / GMAIL_APP_PASSWORD).' },
                { status: 500 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        // 4. Clean message body (NO delivery address in email body as requested)
        const defaultText = `Dear Sir / madam,\n\nPlease find attached dispatch box label for ${productName || 'product'}.\n\nThanks,\nCreative Packaging`;
        const emailText = (message || defaultText).trim();

        const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 20px 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
    .content { padding: 24px; }
    .message-box { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px; white-space: pre-wrap; }
    .badge { display: inline-flex; align-items: center; background: #e0e7ff; color: #3730a3; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; border: 1px solid #c7d2fe; }
    .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Dispatch Box Label</h1>
      <p>Creative Packaging Manufacturing Portal</p>
    </div>
    <div class="content">
      <div class="message-box">${emailText.replace(/\n/g, '<br>')}</div>
      <div style="margin-top: 20px;">
        <span class="badge">📎 Attached: ${attachmentFilename}</span>
      </div>
    </div>
    <div class="footer">
      Sent via Creative Packaging Manufacturing Portal • from ${gmailUser}
    </div>
  </div>
</body>
</html>`;

        // 5. Send Email
        const info = await transporter.sendMail({
            from: `"Creative Packaging" <${gmailUser}>`,
            to: validRecipients.join(', '),
            subject: subject || `Dispatch Box Label - ${productName || 'Product'}`,
            text: emailText,
            html: htmlEmail,
            attachments: [
                {
                    filename: attachmentFilename,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                }
            ]
        });

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            recipients: validRecipients,
            attachmentFilename,
        });
    } catch (err: any) {
        console.error('Error sending delivery label email:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to send delivery label email.' },
            { status: 500 }
        );
    }
}
