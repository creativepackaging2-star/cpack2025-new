import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export const dynamic = 'force-dynamic';

function getEdgeOrChromePath(): string {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const edgePath64 = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    if (fs.existsSync(edgePath)) return edgePath;
    if (fs.existsSync(edgePath64)) return edgePath64;
    if (fs.existsSync(chromePath)) return chromePath;
    throw new Error('No compatible headless browser (Edge/Chrome) found on system.');
}

function convertHtmlToPdf(htmlContent: string, outputPath: string) {
    const browserPath = getEdgeOrChromePath();
    const tempHtml = outputPath.replace(/\.pdf$/i, '.html');
    fs.writeFileSync(tempHtml, htmlContent, 'utf-8');

    try {
        execFileSync(browserPath, [
            '--headless',
            '--disable-gpu',
            '--no-pdf-header-footer',
            `--print-to-pdf=${outputPath}`,
            `file:///${tempHtml.replace(/\\/g, '/')}`
        ], { stdio: 'pipe' });
    } finally {
        if (fs.existsSync(tempHtml)) {
            try { fs.unlinkSync(tempHtml); } catch {}
        }
    }
}

export async function POST(req: NextRequest) {
    let tempPdfPath = '';
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

        // 2. Prepare PDF Buffer
        let pdfBuffer: Buffer | null = null;
        const safeName = (productName || 'Product').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
        const attachmentFilename = `${safeName}_DeliveryLabel.pdf`;

        if (pdfBase64 && typeof pdfBase64 === 'string') {
            const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
            pdfBuffer = Buffer.from(cleanBase64, 'base64');
        } else {
            // Server-side HTML render & PDF generation fallback
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
            const branding = brandConfig[company] || brandConfig['Packaging'];

            const labelHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
    @page {
      size: 5.6in 4in;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      font-family: 'Montserrat', sans-serif;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      width: 5.6in;
      height: 4in;
    }
    .label-container {
      width: 5.6in;
      height: 4in;
      padding: 16px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      background: #ffffff;
    }
    .main-content {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      flex: 1;
    }
    .left-section {
      border: 1px solid #000000;
      padding: 12px;
      flex: 1.5;
      display: flex;
      flex-direction: column;
    }
    .right-section {
      border: 1px solid #000000;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .section-title {
      font-size: 10px;
      font-weight: 500;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: -0.025em;
      margin-bottom: 8px;
    }
    .address-text {
      font-size: 13px;
      font-weight: 500;
      line-height: 1.5;
      white-space: pre-wrap;
      color: #000000;
    }
    .right-row {
      border-bottom: 1px solid #000000;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      text-align: center;
    }
    .right-row:last-child {
      border-bottom: none;
    }
    .product-name {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      line-height: 1.25;
      color: #000000;
    }
    .invoice-text {
      font-size: 12px;
      font-weight: 500;
      color: #000000;
    }
    .footer {
      border-top: 1px solid #000000;
      padding-top: 8px;
      text-align: center;
    }
    .company-name {
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 2px;
      color: #000000;
    }
    .company-addr {
      font-size: 9px;
      font-weight: 300;
      margin-bottom: 2px;
      color: #000000;
    }
    .company-contact {
      font-size: 9px;
      font-weight: 500;
      color: #000000;
    }
  </style>
</head>
<body>
  <div class="label-container">
    <div class="main-content">
      <div class="left-section">
        <div class="section-title">DELIVERY ADDRESS:</div>
        <div class="address-text">${deliveryAddress || '<<[Delivery Address]>>'}</div>
      </div>
      <div class="right-section">
        <div class="right-row"><div class="section-title">PRODUCT</div></div>
        <div class="right-row"><div class="product-name">${productName || '<<[Product Name]>>'}</div></div>
        <div class="right-row"><div class="section-title">QTY</div></div>
        <div class="right-row"><div class="product-name"></div></div>
        <div class="right-row"><div class="section-title">INVOICE NO</div></div>
        <div class="right-row"><div class="invoice-text">${invoiceNo || '<<[Inv No]>>'}</div></div>
      </div>
    </div>
    <div class="footer">
      <div class="company-name">${branding.name}</div>
      <div class="company-addr">${branding.address}</div>
      <div class="company-contact">M: ${branding.mobile} | ${branding.email}</div>
    </div>
  </div>
</body>
</html>`;

            const tempDir = path.resolve(process.cwd(), 'temp_build');
            fs.mkdirSync(tempDir, { recursive: true });
            tempPdfPath = path.join(tempDir, `label_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
            
            try {
                convertHtmlToPdf(labelHtml, tempPdfPath);
                if (fs.existsSync(tempPdfPath)) {
                    pdfBuffer = fs.readFileSync(tempPdfPath);
                }
            } catch (edgeErr) {
                console.warn('Headless browser PDF generation failed, falling back to pdf-lib:', edgeErr);
            }

            if (!pdfBuffer || pdfBuffer.length === 0) {
                // Guaranteed fallback: Generate clean vector PDF via pdf-lib
                const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
                const pdfDoc = await PDFDocument.create();
                const width = 5.6 * 72; // 403.2
                const height = 4 * 72;  // 288
                const page = pdfDoc.addPage([width, height]);
                const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

                page.drawRectangle({
                    x: 14,
                    y: 14,
                    width: width - 28,
                    height: height - 28,
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 1,
                });

                const contentY = 46;
                const contentH = height - 28 - contentY;
                const leftW = (width - 28) * 0.58;
                const rightW = (width - 28) - leftW;

                page.drawRectangle({
                    x: 14,
                    y: contentY,
                    width: leftW,
                    height: contentH,
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 1,
                });

                page.drawRectangle({
                    x: 14 + leftW,
                    y: contentY,
                    width: rightW,
                    height: contentH,
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 1,
                });

                page.drawText('DELIVERY ADDRESS:', {
                    x: 20,
                    y: height - 32,
                    size: 8,
                    font: fontBold,
                    color: rgb(0.3, 0.3, 0.3),
                });

                const addrLines = (deliveryAddress || '<<[Delivery Address]>>').split('\n');
                let curY = height - 48;
                for (const line of addrLines) {
                    if (curY < contentY + 10) break;
                    page.drawText(line.slice(0, 45), {
                        x: 20,
                        y: curY,
                        size: 9,
                        font: fontRegular,
                        color: rgb(0, 0, 0),
                    });
                    curY -= 13;
                }

                const rowH = contentH / 6;
                for (let r = 0; r < 6; r++) {
                    const rowY = contentY + contentH - (r + 1) * rowH;
                    if (r < 5) {
                        page.drawLine({
                            start: { x: 14 + leftW, y: rowY },
                            end: { x: width - 14, y: rowY },
                            thickness: 1,
                            color: rgb(0, 0, 0),
                        });
                    }
                    if (r === 0) {
                        page.drawText('PRODUCT', { x: 14 + leftW + 15, y: rowY + rowH / 2 - 3, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                    } else if (r === 1) {
                        page.drawText((productName || '').slice(0, 24), { x: 14 + leftW + 8, y: rowY + rowH / 2 - 4, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
                    } else if (r === 2) {
                        page.drawText('QTY', { x: 14 + leftW + 15, y: rowY + rowH / 2 - 3, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                    } else if (r === 4) {
                        page.drawText('INVOICE NO', { x: 14 + leftW + 15, y: rowY + rowH / 2 - 3, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
                    } else if (r === 5) {
                        page.drawText((invoiceNo || '<<[Inv No]>>').slice(0, 20), { x: 14 + leftW + 8, y: rowY + rowH / 2 - 4, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
                    }
                }

                page.drawText(branding.name, {
                    x: width / 2 - (branding.name.length * 2.8),
                    y: 34,
                    size: 9,
                    font: fontBold,
                    color: rgb(0, 0, 0),
                });
                page.drawText(branding.address, {
                    x: 20,
                    y: 24,
                    size: 7,
                    font: fontRegular,
                    color: rgb(0.2, 0.2, 0.2),
                });
                page.drawText(`M: ${branding.mobile} | ${branding.email}`, {
                    x: width / 2 - 70,
                    y: 16,
                    size: 7,
                    font: fontRegular,
                    color: rgb(0.2, 0.2, 0.2),
                });

                pdfBuffer = Buffer.from(await pdfDoc.save());
            }
        }

        if (!pdfBuffer || pdfBuffer.length === 0) {
            return NextResponse.json(
                { error: 'Failed to generate delivery label PDF attachment.' },
                { status: 500 }
            );
        }

        // 3. Nodemailer Configuration
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
    } finally {
        if (tempPdfPath && fs.existsSync(tempPdfPath)) {
            try { fs.unlinkSync(tempPdfPath); } catch {}
        }
    }
}
