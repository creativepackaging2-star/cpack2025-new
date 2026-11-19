import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export interface CoaOrderData {
    id?: number;
    order_id?: string;
    product_name?: string;
    customer_name?: string;
    delivery_address?: string;
    delivery_date?: string;
    order_date?: string;
    quantity?: number;
    qty_delivered?: number;
    batch_no?: string;
    invoice_no?: string;
    artwork_code?: string;
    specification?: string;
    specs?: string;
    gsm_value?: string;
    construction?: string;
    construction_type?: string;
    dimension?: string;
    category_name?: string;
    folding_dim?: string;
    folding_dimension?: string;
    from_our_company?: string;
}

export interface CoaCompanyConfig {
    name: string;
    address: string;
    email: string;
    mobile: string;
    gstn: string;
    logo_file: string;
    sign_file: string;
    proprietor_label: string;
    logo_width: string;
}

export function getCompanyBranding(companyOrInvoice?: string): CoaCompanyConfig {
    const s = (companyOrInvoice || '').toLowerCase();
    if (s.includes('printer') || s.startsWith('s-')) {
        return {
            name: 'CREATIVE PRINTERS',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '8097032001',
            gstn: '27CGTPS8217E1ZT',
            logo_file: 'public/logo_printers.png',
            sign_file: 'public/sign_printers.png',
            proprietor_label: 'Proprietor',
            logo_width: '200px',
        };
    }
    if (s.includes('enter') || s.startsWith('p-')) {
        return {
            name: 'CREATIVE ENTERPRISE',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '9146178720',
            gstn: '27AARHP2206E1Z8',
            logo_file: 'public/creative_logo.png',
            sign_file: 'public/pr_shah_sign_new.png',
            proprietor_label: 'Proprietor',
            logo_width: '240px',
        };
    }
    // Default to Packaging (U- invoices)
    return {
        name: 'CREATIVE PACKAGING',
        address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
        email: 'creativepackaging@outlook.com',
        mobile: '8097032001',
        gstn: '27AAIPS3624G1ZL',
        logo_file: 'public/logo_packaging.png',
        sign_file: 'public/sign_packaging.png',
        proprietor_label: 'Authorised Signatory',
        logo_width: '160px',
    };
}

function getBase64DataUri(relativeFilePath: string): string {
    try {
        const absPath = path.resolve(process.cwd(), relativeFilePath);
        if (fs.existsSync(absPath)) {
            const ext = path.extname(absPath).slice(1) || 'png';
            const base64 = fs.readFileSync(absPath).toString('base64');
            return `data:image/${ext};base64,${base64}`;
        }
    } catch {}
    return '';
}

export function generateBatchNoFromDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
}

export function calculateBatchNo(pName: string, cName: string, dDate: string): string {
    const datePart = generateBatchNoFromDate(dDate);
    if (!datePart) return '';
    const namePart = (pName || '').replace(/\s+/g, '').substring(0, 6).toUpperCase();
    const catPart = (cName || 'X').substring(0, 1).toUpperCase();
    return `${namePart}${datePart}${catPart}`;
}

/**
 * Generates the EXACT HTML matching COATemplate.tsx developed for the system
 */
export function generateCoaHtml(ord: CoaOrderData, companyOrConfig?: string | CoaCompanyConfig): string {
    const brand = typeof companyOrConfig === 'object' && companyOrConfig !== null
        ? companyOrConfig
        : getCompanyBranding(companyOrConfig || ord.from_our_company || ord.invoice_no);

    const logoUri = getBase64DataUri(brand.logo_file);
    const signUri = getBase64DataUri(brand.sign_file);

    const todayDate = new Date().toLocaleDateString('en-GB');
    const deliveryDateStr = ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString('en-GB') : todayDate;
    const mfgDateStr = ord.delivery_date
        ? new Date(ord.delivery_date).toLocaleDateString('en-GB')
        : (ord.order_date ? new Date(ord.order_date).toLocaleDateString('en-GB') : todayDate);

    let batchNo = ord.batch_no || '';
    if (!batchNo && ord.product_name) {
        batchNo = calculateBatchNo(ord.product_name, ord.category_name || '', ord.delivery_date || new Date().toISOString());
    }

    const qty = (ord.qty_delivered || ord.quantity || 0).toLocaleString();
    const isSplit = Boolean(ord.order_id?.includes('-P') || ord.order_id?.includes('SPLIT-'));
    const isInsert = (ord.category_name || '').toLowerCase().includes('insert') || (ord.product_name || '').toLowerCase().includes('leaflet');
    const folding = ord.folding_dim || ord.folding_dimension || '';

    const specValue = ord.specification || ord.specs || '<<[Specification]>>';
    const constValue = ord.construction || ord.construction_type || 'As per approved specimen';
    const dimValue = ord.dimension || '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${(ord.product_name || 'Order').replace(/[^a-zA-Z0-9]/g, '_')}_COA</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Herr+Von+Muellerhoff&display=swap');

@page {
    size: A4 portrait;
    margin: 0;
}
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
.coa-container {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 15mm;
    background: white;
    display: flex;
    flex-direction: column;
}
.font-signature-alt {
    font-family: 'Herr Von Muellerhoff', cursive;
}
</style>
</head>
<body>
<div class="coa-container">
    <!-- Header -->
    <div style="margin-bottom: 2rem; border-bottom: 2px solid #1e293b; padding-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <div style="width: ${brand.logo_width};">
                ${logoUri ? `<img src="${logoUri}" alt="${brand.name}" style="max-width: 100%; height: auto; object-fit: contain;" />` : `<h2 style="font-weight: bold; color: #1e293b;">${brand.name}</h2>`}
            </div>
        </div>
        <div style="font-size: 11px; font-weight: 500; color: #475569; margin-top: 0.5rem; line-height: 1.4;">
            <p>${brand.address}</p>
            <p style="margin-top: 0.25rem;">Email: ${brand.email} | M: ${brand.mobile} | GSTN: ${brand.gstn}</p>
        </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin-bottom: 2rem;">
        <h1 style="font-size: 1.5rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid black; display: inline-block; padding-bottom: 0.25rem;">Certificate of Analysis</h1>
    </div>

    <!-- Customer Section -->
    <div style="margin-bottom: 1.5rem; font-size: 13px; display: flex; flex-direction: column; gap: 0.25rem;">
        <div style="display: flex;">
            <span style="width: 9rem; font-weight: bold; color: #1e293b; flex-shrink: 0;">Customer Name:</span>
            <span style="font-weight: 600;">${ord.customer_name || 'BDR Pharmaceuticals International Pvt. Ltd.'}</span>
        </div>
        <div style="display: flex; align-items: flex-start;">
            <span style="width: 9rem; font-weight: bold; color: #1e293b; flex-shrink: 0;">Address:</span>
            <span style="flex: 1; white-space: pre-wrap;">${ord.delivery_address || '<<[Delivery Address]>>'}</span>
        </div>
    </div>

    <!-- Order Details List -->
    <div style="border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem; font-size: 13px; background-color: rgba(248, 250, 252, 0.5);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 2rem; row-gap: 0.5rem;">
            <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                <span style="width: 8rem; font-weight: bold; color: #334155; flex-shrink: 0;">Date :</span>
                <span>${deliveryDateStr}</span>
            </div>
            <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                <span style="width: 8rem; font-weight: bold; color: #334155; flex-shrink: 0;">Date of Mfg.:</span>
                <span>${mfgDateStr}</span>
            </div>

            <div style="grid-column: span 2 / span 2; display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                <span style="width: 8rem; font-weight: bold; color: #334155; flex-shrink: 0;">Product Name :</span>
                <span style="font-weight: bold;">${ord.product_name || '<<[Product Name]>>'}</span>
            </div>

            <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                <span style="width: 8rem; font-weight: bold; color: #334155; flex-shrink: 0;">Quantity:</span>
                <span style="display: flex; align-items: center; gap: 0.5rem;">
                    ${qty}
                    ${isSplit ? `<span style="font-size: 9px; font-weight: 900; color: #b45309; background-color: #fffbeb; padding: 0.125rem 0.375rem; border-radius: 0.25rem; border: 1px solid #fef3c7; text-transform: uppercase;">Split Lot</span>` : ''}
                </span>
            </div>
            <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                <span style="width: 8rem; font-weight: bold; color: #334155; flex-shrink: 0;">Batch No:</span>
                <span>${batchNo || '<<[Batch No]>>'}</span>
            </div>

            <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                <span style="width: 8rem; font-weight: bold; color: #334155; flex-shrink: 0;">Invoice No:</span>
                <span>${ord.invoice_no || '<<[Inv no]>>'}</span>
            </div>
            <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem;">
                <span style="width: 8rem; font-weight: bold; color: #334155; flex-shrink: 0;">Artwork Code:</span>
                <span>${ord.artwork_code || '<<[artwork code]>>'}</span>
            </div>
        </div>
    </div>

    <!-- Analysis Table -->
    <div style="margin-bottom: 2rem;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #1e293b; font-size: 13px;">
            <thead>
                <tr style="background-color: #f1f5f9;">
                    <th style="border: 1px solid #1e293b; padding: 0.5rem; width: 3.5rem; text-align: center; font-weight: bold;">Sr No</th>
                    <th style="border: 1px solid #1e293b; padding: 0.5rem; width: 8rem; text-align: left; font-weight: bold;">Test</th>
                    <th style="border: 1px solid #1e293b; padding: 0.5rem; text-align: left; font-weight: bold;">Specification</th>
                    <th style="border: 1px solid #1e293b; padding: 0.5rem; width: 8rem; text-align: center; font-weight: bold;">Observation</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center;">1</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; font-weight: 500;">Description</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem;">${specValue}</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center; font-weight: bold; color: #047857;">OK</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center;">2</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; font-weight: 500;">GSM</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem;">${ord.gsm_value ? `${ord.gsm_value} +/- 5%` : '<<[gsm]>> +/- 5%'}</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center;">
                        <span style="font-weight: bold; color: #047857;">OK</span>
                        ${ord.gsm_value ? `<div style="font-size: 10px; color: #64748b;">${ord.gsm_value}</div>` : ''}
                    </td>
                </tr>
                <tr>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center;">3</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; font-weight: 500;">Construction</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem;">
                        ${constValue}
                        ${isInsert && folding ? `<span> (${folding})</span>` : ''}
                    </td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center;">
                        <span style="font-weight: bold; color: #047857;">OK</span>
                        ${isInsert && folding ? `<div style="font-size: 10px; color: #64748b;">(${folding})</div>` : ''}
                    </td>
                </tr>
                <tr>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center;">4</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; font-weight: 500;">Dimensions</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem;">${dimValue ? `${dimValue} mm +/-2mm` : '<<[Dimension]>>mm +/-2mm'}</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center;">
                        <span style="font-weight: bold; color: #047857;">OK</span>
                        ${dimValue ? `<div style="font-size: 10px; color: #64748b;">${dimValue}</div>` : ''}
                    </td>
                </tr>
                <tr>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center;">5</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; font-weight: 500;">Shade</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem;">Will comply with shade</td>
                    <td style="border: 1px solid #1e293b; padding: 0.5rem; text-align: center; font-weight: bold; color: #047857;">OK</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Signature Section -->
    <div style="margin-top: 2rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
            <div style="font-size: 13px;">
                <p style="font-weight: bold; color: #334155;">Checked By : Laxman</p>
                <div class="font-signature-alt" style="margin-top: 0.25rem; font-size: 2.25rem; color: #1e3a8a; transform: rotate(-3deg); margin-left: 0.5rem; line-height: 1;">LS</div>
            </div>
            <div style="text-align: right; font-size: 13px;">
                <p style="font-weight: bold; color: #334155;">Approved By : Saahil</p>
                <div class="font-signature-alt" style="margin-top: 0.25rem; font-size: 2.25rem; color: #1e3a8a; transform: rotate(-2deg); margin-left: auto; margin-right: 1rem; line-height: 1;">Sps</div>
            </div>
        </div>

        <div style="text-align: right; font-size: 13px;">
            <p style="color: #1e40af; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.875rem;">For ${brand.name}</p>
            <div style="margin-top: 0.5rem; display: flex; justify-content: flex-end;">
                <div style="text-align: center; position: relative;">
                    <div style="height: 1.75rem; display: flex; align-items: center; justify-content: center; margin-bottom: 0.25rem;">
                        ${signUri ? `<img src="${signUri}" alt="${brand.proprietor_label}" style="height: 100%; width: auto; object-fit: contain;" />` : ''}
                    </div>
                    <p style="color: #1e40af; font-weight: bold; font-size: 11px; text-transform: uppercase; border-top: 1px solid #cbd5e1; padding-top: 0.25rem; display: inline-block; padding-left: 1rem; padding-right: 1rem;">${brand.proprietor_label}</p>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`;
}

/**
 * Compiles exact COATemplate HTML into a Skia/PDF 1-page document via headless Chrome
 */
export async function renderCoaHtmlToPdf(html: string): Promise<Buffer> {
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.CHROME_PATH,
    ].filter(Boolean) as string[];

    let chromePath = '';
    for (const cp of chromePaths) {
        if (fs.existsSync(cp)) {
            chromePath = cp;
            break;
        }
    }

    if (!chromePath) {
        throw new Error('Chrome executable not found on host for Skia/PDF rendering');
    }

    const tmpDir = os.tmpdir();
    const id = `coa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const htmlPath = path.join(tmpDir, `${id}.html`);
    const pdfPath = path.join(tmpDir, `${id}.pdf`);

    try {
        fs.writeFileSync(htmlPath, html, 'utf-8');
        const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
        const cmd = `"${chromePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${fileUrl}"`;
        execSync(cmd, { stdio: 'pipe', timeout: 20000 });

        if (!fs.existsSync(pdfPath)) {
            throw new Error('Chrome headless failed to output PDF file');
        }

        return fs.readFileSync(pdfPath);
    } finally {
        try { if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath); } catch {}
        try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch {}
    }
}

/**
 * Appends an official COA page matching COATemplate.tsx onto a merged PDFDocument
 */
export async function appendCoaPageToMergedDoc(
    mergedDoc: PDFDocument,
    ord: CoaOrderData,
    companyOrConfig?: string | CoaCompanyConfig
) {
    const brand = typeof companyOrConfig === 'object' && companyOrConfig !== null
        ? companyOrConfig
        : getCompanyBranding(companyOrConfig || ord.from_our_company || ord.invoice_no);

    const html = generateCoaHtml(ord, brand);

    try {
        // High fidelity Skia/PDF render matching user's internal browser print
        const pdfBuffer = await renderCoaHtmlToPdf(html);
        const coaDoc = await PDFDocument.load(pdfBuffer);
        const [copiedPage] = await mergedDoc.copyPages(coaDoc, [0]);
        mergedDoc.addPage(copiedPage);
    } catch (chromeErr) {
        console.warn('Chrome headless render failed, falling back to direct drawing:', chromeErr);
        // Fallback drawing if Chrome is unavailable
        await fallbackDrawCoa(mergedDoc, ord, brand);
    }
}

/**
 * Safe fallback drawer in case Chrome headless is unavailable
 */
async function fallbackDrawCoa(mergedDoc: PDFDocument, ord: CoaOrderData, brand: CoaCompanyConfig) {
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const page = mergedDoc.addPage([A4_WIDTH, A4_HEIGHT]);

    const fontRegular = await mergedDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalicBold = await mergedDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    const pad = 40;
    const width = A4_WIDTH - pad * 2;
    let y = A4_HEIGHT - pad;

    // Header Logo
    try {
        const logoPath = path.resolve(process.cwd(), brand.logo_file);
        if (fs.existsSync(logoPath)) {
            const logoBytes = fs.readFileSync(logoPath);
            const logoImg = await mergedDoc.embedPng(logoBytes);
            const scaleFactor = brand.name.includes('PACKAGING') ? 0.32 : (brand.name.includes('PRINTERS') ? 0.38 : 0.45);
            const logoDims = logoImg.scale(scaleFactor);
            page.drawImage(logoImg, {
                x: pad,
                y: y - logoDims.height,
                width: logoDims.width,
                height: logoDims.height
            });
            y -= (logoDims.height + 6);
        }
    } catch {
        page.drawText(brand.name, { x: pad, y: y - 16, size: 16, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
        y -= 26;
    }

    // Company Address & GSTN
    page.drawText(brand.address, { x: pad, y, size: 8.5, font: fontRegular, color: rgb(0.35, 0.38, 0.45) });
    y -= 12;
    page.drawText(`Email: ${brand.email} | M: ${brand.mobile} | GSTN: ${brand.gstn}`, { x: pad, y, size: 8.5, font: fontRegular, color: rgb(0.35, 0.38, 0.45) });
    y -= 10;
    page.drawLine({ start: { x: pad, y }, end: { x: pad + width, y }, thickness: 2, color: rgb(0.12, 0.16, 0.23) });
    y -= 26;

    // Title
    const title = 'Certificate of Analysis';
    const titleSize = 16;
    const titleW = fontBold.widthOfTextAtSize(title, titleSize);
    const titleX = pad + (width - titleW) / 2;
    page.drawText(title, { x: titleX, y, size: titleSize, font: fontBold, color: rgb(0, 0, 0) });
    y -= 3;
    page.drawLine({ start: { x: titleX, y }, end: { x: titleX + titleW, y }, thickness: 1, color: rgb(0, 0, 0) });
    y -= 22;

    // Customer info
    page.drawText('Customer Name:', { x: pad, y, size: 9.5, font: fontBold, color: rgb(0.12, 0.16, 0.23) });
    page.drawText(ord.customer_name || 'BDR Pharmaceuticals International Pvt. Ltd.', { x: pad + 105, y, size: 9.5, font: fontBold, color: rgb(0, 0, 0) });
    y -= 15;
    page.drawText('Address:', { x: pad, y, size: 9.5, font: fontBold, color: rgb(0.12, 0.16, 0.23) });
    page.drawText((ord.delivery_address || '').slice(0, 85), { x: pad + 105, y, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    y -= 22;

    // Details box
    const boxH = 92;
    page.drawRectangle({ x: pad, y: y - boxH, width, height: boxH, color: rgb(0.97, 0.98, 0.99), borderColor: rgb(0.8, 0.83, 0.88), borderWidth: 1 });
    const colW = width / 2;
    const today = new Date().toLocaleDateString('en-GB');
    let rowY = y - 18;

    page.drawText('Date :', { x: pad + 12, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString('en-GB') : today, { x: pad + 85, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawText('Date of Mfg.:', { x: pad + colW + 10, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString('en-GB') : today, { x: pad + colW + 90, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    rowY -= 20;

    page.drawText('Product Name :', { x: pad + 12, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText((ord.product_name || '<<[Product Name]>>').slice(0, 60), { x: pad + 95, y: rowY, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
    rowY -= 20;

    page.drawText('Quantity:', { x: pad + 12, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText((ord.qty_delivered || ord.quantity || 0).toLocaleString(), { x: pad + 85, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawText('Batch No:', { x: pad + colW + 10, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(ord.batch_no || '-', { x: pad + colW + 90, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    rowY -= 20;

    page.drawText('Invoice No:', { x: pad + 12, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(ord.invoice_no || '-', { x: pad + 85, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawText('Artwork Code:', { x: pad + colW + 10, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(ord.artwork_code || '-', { x: pad + colW + 90, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });

    y -= (boxH + 24);

    // Analysis table
    const colSrW = 44, colTestW = 120, colObsW = 100;
    const colSpecW = width - colSrW - colTestW - colObsW;

    page.drawRectangle({ x: pad, y: y - 22, width, height: 22, color: rgb(0.94, 0.96, 0.98), borderColor: rgb(0.15, 0.2, 0.3), borderWidth: 1 });
    page.drawText('Sr No', { x: pad + 10, y: y - 15, size: 9, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText('Test', { x: pad + colSrW + 10, y: y - 15, size: 9, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText('Specification', { x: pad + colSrW + colTestW + 10, y: y - 15, size: 9, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText('Observation', { x: pad + colSrW + colTestW + colSpecW + 20, y: y - 15, size: 9, font: fontBold, color: rgb(0, 0, 0) });
    y -= 22;

    const testRows = [
        { sr: '1', name: 'Description', spec: (ord.specification || ord.specs || '<<[Specification]>>').slice(0, 50) },
        { sr: '2', name: 'GSM', spec: ord.gsm_value ? `${ord.gsm_value} +/- 5%` : '<<[gsm]>> +/- 5%' },
        { sr: '3', name: 'Construction', spec: (ord.construction || ord.construction_type || 'As per approved specimen').slice(0, 50) },
        { sr: '4', name: 'Dimensions', spec: ord.dimension ? `${ord.dimension} mm +/-2mm` : '<<[Dimension]>>mm +/-2mm' },
        { sr: '5', name: 'Shade', spec: 'Will comply with shade' },
    ];

    for (const r of testRows) {
        page.drawRectangle({ x: pad, y: y - 26, width, height: 26, borderColor: rgb(0.15, 0.2, 0.3), borderWidth: 0.75 });
        page.drawText(r.sr, { x: pad + 18, y: y - 17, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
        page.drawText(r.name, { x: pad + colSrW + 10, y: y - 17, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
        page.drawText(r.spec, { x: pad + colSrW + colTestW + 10, y: y - 17, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
        page.drawText('OK', { x: pad + colSrW + colTestW + colSpecW + 40, y: y - 17, size: 9.5, font: fontBold, color: rgb(0.02, 0.48, 0.25) });
        y -= 26;
    }

    y -= 32;

    // Signatures
    page.drawText('Checked By : Laxman', { x: pad + 5, y, size: 9.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText('Approved By : Saahil', { x: pad + width - 145, y, size: 9.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    y -= 18;
    page.drawText('LS', { x: pad + 18, y, size: 18, font: fontItalicBold, color: rgb(0.08, 0.18, 0.48) });
    page.drawText('Sps', { x: pad + width - 110, y, size: 18, font: fontItalicBold, color: rgb(0.08, 0.18, 0.48) });
    y -= 28;

    const forCompany = `For ${brand.name}`;
    const forCompanyW = fontBold.widthOfTextAtSize(forCompany, 10.5);
    page.drawText(forCompany, { x: pad + width - forCompanyW - 5, y, size: 10.5, font: fontBold, color: rgb(0.08, 0.2, 0.55) });
    y -= 4;

    try {
        const signPath = path.resolve(process.cwd(), brand.sign_file);
        if (fs.existsSync(signPath)) {
            const signBytes = fs.readFileSync(signPath);
            const signImg = await mergedDoc.embedPng(signBytes);
            const signDims = signImg.scale(0.35);
            page.drawImage(signImg, { x: pad + width - 130, y: y - signDims.height, width: signDims.width, height: signDims.height });
            y -= (signDims.height + 2);
        } else { y -= 24; }
    } catch { y -= 24; }

    const propLabel = brand.proprietor_label.toUpperCase();
    const propLabelW = fontBold.widthOfTextAtSize(propLabel, 8.5);
    page.drawLine({ start: { x: pad + width - 130, y }, end: { x: pad + width - 10, y }, thickness: 0.75, color: rgb(0.7, 0.75, 0.8) });
    y -= 10;
    page.drawText(propLabel, { x: pad + width - 120 + (100 - propLabelW) / 2, y, size: 8.5, font: fontBold, color: rgb(0.08, 0.2, 0.55) });
}
