import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

async function generateDeliveryLabelPdfBuffer(orderData: {
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
    const width = 5.6 * 72; // 403.2 points
    const height = 4 * 72;  // 288 points
    const page = pdfDoc.addPage([width, height]);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Padding & dimensions
    const pad = 12;
    const footerH = 34;
    const bodyW = width - pad * 2;
    const bodyH = height - pad * 2 - footerH;
    const bodyY = pad + footerH;

    // Left box (flex ~ 1.5) and Right box (flex ~ 1)
    const leftW = Math.round(bodyW * 0.6);
    const rightW = bodyW - leftW;

    // 1. Left Box: Delivery Address
    page.drawRectangle({
        x: pad,
        y: bodyY,
        width: leftW,
        height: bodyH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    page.drawText('DELIVERY ADDRESS:', {
        x: pad + 8,
        y: bodyY + bodyH - 18,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
    });

    const rawAddr = deliveryAddress || '<<[Delivery Address]>>';
    const words = rawAddr.split(/\s+/);
    const lines: string[] = [];
    let curLine = '';
    for (const w of words) {
        const test = curLine ? `${curLine} ${w}` : w;
        if (fontRegular.widthOfTextAtSize(test, 9.5) > leftW - 16) {
            if (curLine) lines.push(curLine);
            curLine = w;
        } else {
            curLine = test;
        }
    }
    if (curLine) lines.push(curLine);

    let addrY = bodyY + bodyH - 34;
    for (const line of lines) {
        if (addrY < bodyY + 8) break;
        page.drawText(line, {
            x: pad + 8,
            y: addrY,
            size: 9.5,
            font: fontRegular,
            color: rgb(0, 0, 0),
        });
        addrY -= 14;
    }

    // 2. Right Box: 6 rows (Product / Qty / Invoice No)
    page.drawRectangle({
        x: pad + leftW,
        y: bodyY,
        width: rightW,
        height: bodyH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    const rowH = bodyH / 6;
    for (let i = 1; i < 6; i++) {
        page.drawLine({
            start: { x: pad + leftW, y: bodyY + bodyH - i * rowH },
            end: { x: pad + bodyW, y: bodyY + bodyH - i * rowH },
            thickness: 1,
            color: rgb(0, 0, 0),
        });
    }

    const drawCenteredText = (text: string, rowIndex: number, font: any, size: number, color: any) => {
        const yCenter = bodyY + bodyH - (rowIndex + 0.5) * rowH;
        const textW = font.widthOfTextAtSize(text, size);
        const x = pad + leftW + (rightW - textW) / 2;
        page.drawText(text, {
            x: Math.max(pad + leftW + 4, x),
            y: yCenter - size / 3,
            size,
            font,
            color,
        });
    };

    // Row 0: Header
    drawCenteredText('PRODUCT', 0, fontRegular, 8.5, rgb(0.35, 0.35, 0.35));

    // Row 1: Product Name
    const pName = (productName || '<<[Product Name]>>').toUpperCase();
    drawCenteredText(pName.length > 22 ? pName.slice(0, 22) + '...' : pName, 1, fontBold, 9.5, rgb(0, 0, 0));

    // Row 2: Header
    drawCenteredText('QTY', 2, fontRegular, 8.5, rgb(0.35, 0.35, 0.35));

    // Row 3: Empty

    // Row 4: Header
    drawCenteredText('INVOICE NO', 4, fontRegular, 8.5, rgb(0.35, 0.35, 0.35));

    // Row 5: Invoice No value
    const invText = invoiceNo || '<<[Inv No]>>';
    drawCenteredText(invText, 5, fontRegular, 9, rgb(0, 0, 0));

    // 3. Footer Branding
    page.drawLine({
        start: { x: pad, y: pad + footerH },
        end: { x: width - pad, y: pad + footerH },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    const fNameW = fontBold.widthOfTextAtSize(branding.name, 9);
    page.drawText(branding.name, {
        x: (width - fNameW) / 2,
        y: pad + 22,
        size: 9,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    const fAddrW = fontRegular.widthOfTextAtSize(branding.address, 7);
    page.drawText(branding.address, {
        x: (width - fAddrW) / 2,
        y: pad + 12,
        size: 7,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
    });

    const contactStr = `M: ${branding.mobile} | ${branding.email}`;
    const fContactW = fontRegular.widthOfTextAtSize(contactStr, 7);
    page.drawText(contactStr, {
        x: (width - fContactW) / 2,
        y: pad + 3,
        size: 7,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
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
            pdfBase64,
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

        // 2. Generate PDF in-memory (100% serverless safe, no disk writes)
        let pdfBuffer: Buffer;
        if (pdfBase64 && typeof pdfBase64 === 'string' && pdfBase64.startsWith('data:application/pdf;base64,')) {
            const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
            pdfBuffer = Buffer.from(cleanBase64, 'base64');
        } else {
            pdfBuffer = await generateDeliveryLabelPdfBuffer({
                productName,
                deliveryAddress,
                invoiceNo,
                company,
            });
        }

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

        // 4. Default message body
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
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin: 18px 0; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #64748b; font-weight: 600; }
    .meta-val { color: #0f172a; font-weight: 700; }
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

      <div class="meta-card">
        <div class="meta-row"><span class="meta-label">Product:</span><span class="meta-val">${productName || '-'}</span></div>
        ${invoiceNo && invoiceNo !== '<<[Inv No]>>' ? `<div class="meta-row"><span class="meta-label">Invoice No:</span><span class="meta-val">${invoiceNo}</span></div>` : ''}
        ${deliveryAddress ? `<div class="meta-row"><span class="meta-label">Delivery Address:</span><span class="meta-val">${deliveryAddress}</span></div>` : ''}
      </div>

      <div style="margin-top: 16px;">
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
