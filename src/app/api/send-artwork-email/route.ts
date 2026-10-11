import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
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
        const pdfBuffer = Buffer.from(arrayBuffer);

        const cleanName = (productName || 'Artwork').replace(/[/\\?%*:|"<>]/g, '').trim();
        const attachmentFilename = `${cleanName}.pdf`;

        // 2. Configure Nodemailer with Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        // 3. Format professional HTML email
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
      <h1>Artwork Sent for Approval</h1>
      <p>Creative Packaging</p>
    </div>
    <div class="content">
      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Product Name:</span>
          <span class="meta-val">${productName || '-'}</span>
        </div>
        ${artworkCode ? `
        <div class="meta-row">
          <span class="meta-label">Artwork Code:</span>
          <span class="meta-val">${artworkCode}</span>
        </div>` : ''}
      </div>

      <div class="message-box">${message || 'Please find attached the artwork PDF for your review and approval.'}</div>

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

        // 4. Send Email
        const info = await transporter.sendMail({
            from: `"Creative Packaging" <${gmailUser}>`,
            to: recipients,
            subject: subject || `Artwork Approval Request: ${productName || 'Product'} ${artworkCode ? `(${artworkCode})` : ''}`,
            text: `${message || 'Please find attached the artwork PDF for your review and approval.'}\n\nProduct: ${productName}\nCode: ${artworkCode || '-'}\nAttached: ${attachmentFilename}`,
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
        });

    } catch (err: any) {
        console.error('Send Artwork Email Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to send artwork approval email.' }, { status: 500 });
    }
}
