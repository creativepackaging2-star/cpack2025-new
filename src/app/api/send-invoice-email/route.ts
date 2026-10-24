import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            recipients,
            subject,
            message,
            invoiceNo,
            invoiceDate,
            plant,
            poNumber,
            customerName,
            company,
            totalBoxes,
            products = [],
        } = body;

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: 'At least one recipient email address is required.' }, { status: 400 });
        }

        const gmailUser = process.env.GMAIL_USER || 'creativepackaging2@gmail.com';
        const gmailPass = process.env.GMAIL_APP_PASSWORD || 'gtyhprebnhdbjghm';

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        // 1. Locate attachment PDF
        const sanitizedInvNo = (invoiceNo || '').trim();
        let pdfBuffer: Buffer | null = null;
        let attachmentFilename = `Dispatch_Documents_${sanitizedInvNo}.pdf`;

        // Check in public/downloads
        const publicPath = path.join(process.cwd(), 'public', 'downloads', `Dispatch_Documents_${sanitizedInvNo}.pdf`);
        const altPublicPath = path.join(process.cwd(), 'public', 'downloads', `Dispatch_Package_${sanitizedInvNo}.pdf`);
        const windowsUserPath = path.join('C:', 'Users', 'Admin', 'Downloads', `Dispatch_Package_${sanitizedInvNo}.pdf`);

        if (fs.existsSync(publicPath)) {
            pdfBuffer = fs.readFileSync(publicPath);
        } else if (fs.existsSync(altPublicPath)) {
            pdfBuffer = fs.readFileSync(altPublicPath);
        } else if (fs.existsSync(windowsUserPath)) {
            pdfBuffer = fs.readFileSync(windowsUserPath);
        }

        // 2. Build HTML products table
        const productsHtmlRows = products.map((p: any) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 12px; font-weight: 600; color: #0f172a; font-size: 13px;">${p.name || p.product_name}</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #1e293b; font-size: 13px;">${Number(p.quantity || p.qty_delivered || 0).toLocaleString()} pcs</td>
                <td style="padding: 10px 12px; color: #64748b; font-size: 12px;">${p.packing || p.packing_detail || '-'}</td>
            </tr>
        `).join('');

        // 3. Clean HTML Email Body
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 28px 24px; }
    .meta-box { background: #f8fafc; border-radius: 12px; padding: 16px; margin: 16px 0 20px; border: 1px solid #e2e8f0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #64748b; font-weight: 600; }
    .meta-val { color: #0f172a; font-weight: 700; }
    .message-box { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; white-space: pre-wrap; }
    .table-container { margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f1f5f9; padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .attach-badge { display: inline-flex; align-items: center; background: #eff6ff; color: #1d4ed8; padding: 10px 16px; border-radius: 10px; font-weight: 700; font-size: 13px; border: 1px solid #bfdbfe; margin-top: 10px; }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Tax Invoice, Certificates of Analysis & E-way Bill</h1>
      <p>${company || 'Creative Printers'}</p>
    </div>
    <div class="content">
      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Invoice No:</span>
          <span class="meta-val" style="color: #4f46e5; font-size: 14px;">${sanitizedInvNo}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Invoice Date:</span>
          <span class="meta-val">${invoiceDate || new Date().toLocaleDateString('en-IN')}</span>
        </div>
        ${plant ? `
        <div class="meta-row">
          <span class="meta-label">Plant:</span>
          <span class="meta-val" style="color: #0f172a; font-weight: 700;">${plant}</span>
        </div>` : ''}
        ${poNumber ? `
        <div class="meta-row">
          <span class="meta-label">PO Number:</span>
          <span class="meta-val">${poNumber}</span>
        </div>` : ''}
        <div class="meta-row">
          <span class="meta-label">Customer:</span>
          <span class="meta-val">${customerName || 'BDR Pharmaceuticals International Pvt. Ltd.'}</span>
        </div>
        ${totalBoxes ? `
        <div class="meta-row">
          <span class="meta-label">Total No. of Boxes:</span>
          <span class="meta-val" style="color: #059669;">${totalBoxes} Boxes</span>
        </div>` : ''}
      </div>

      <div class="message-box">${message || 'Please find attached the Tax Invoice, Certificates of Analysis & E-way Bill.'}</div>

      ${products.length > 0 ? `
      <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 20px 0 8px 0; text-transform: uppercase;">
        Dispatched Products Summary
      </h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th style="text-align: right;">Quantity</th>
              <th>Packing Detail</th>
            </tr>
          </thead>
          <tbody>
            ${productsHtmlRows}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${pdfBuffer ? `
      <div>
        <span class="attach-badge">📎 Attached: ${attachmentFilename} (Tax Invoices + COAs + E-way Bill)</span>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      Sent via ${company || 'Creative Printers'} • Accounts Department
    </div>
  </div>
</body>
</html>
        `;

        // 4. Construct plain text fallback
        let plainText = `${message || 'Please find attached the Tax Invoice, Certificates of Analysis & E-way Bill.'}\n\n`;
        plainText += `Invoice Details:\n`;
        plainText += `Invoice No: ${sanitizedInvNo}\n`;
        plainText += `Invoice Date: ${invoiceDate}\n`;
        if (plant) plainText += `Plant: ${plant}\n`;
        if (poNumber) plainText += `PO Number: ${poNumber}\n`;
        plainText += `Customer: ${customerName}\n\n`;
        if (products.length > 0) {
            plainText += `Dispatched Products:\n`;
            products.forEach((p: any) => {
                plainText += `- ${p.name || p.product_name}: ${Number(p.quantity || p.qty_delivered || 0).toLocaleString()} pcs (${p.packing || p.packing_detail || '-'})\n`;
            });
            plainText += `\n`;
        }
        if (totalBoxes) plainText += `Total Boxes: ${totalBoxes} Boxes\n\n`;
        plainText += `Kindly acknowledge receipt.\n\nRegards,\nAccounts Department\n${company || 'Creative Printers'}`;

        // 5. Send mail
        const mailOptions: any = {
            from: `"${company || 'Creative Printers'}" <${gmailUser}>`,
            to: recipients,
            subject: subject || `Dispatch Documents & Invoice ${sanitizedInvNo} - ${customerName}`,
            text: plainText,
            html: htmlContent,
            attachments: [],
        };

        if (pdfBuffer) {
            mailOptions.attachments.push({
                filename: attachmentFilename,
                content: pdfBuffer,
                contentType: 'application/pdf',
            });
        }

        const info = await transporter.sendMail(mailOptions);

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            recipients,
            attachment: pdfBuffer ? attachmentFilename : null,
        });

    } catch (err: any) {
        console.error('Send Invoice Email Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to send invoice email.' }, { status: 500 });
    }
}
