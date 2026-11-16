import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

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
    };
}

/**
 * Appends an official COA page matching COATemplate.tsx exactly onto a pdf-lib PDFDocument
 */
export async function appendCoaPageToMergedDoc(
    mergedDoc: PDFDocument,
    ord: CoaOrderData,
    companyOrConfig?: string | CoaCompanyConfig
) {
    const brand = typeof companyOrConfig === 'object' && companyOrConfig !== null
        ? companyOrConfig
        : getCompanyBranding(companyOrConfig || ord.from_our_company || ord.invoice_no);

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const page = mergedDoc.addPage([A4_WIDTH, A4_HEIGHT]);

    const fontRegular = await mergedDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await mergedDoc.embedFont(StandardFonts.TimesRomanItalic);
    const fontItalicBold = await mergedDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    const pad = 40;
    const width = A4_WIDTH - pad * 2;
    let y = A4_HEIGHT - pad;

    // 1. Logo
    try {
        const logoPath = path.resolve(process.cwd(), brand.logo_file);
        if (fs.existsSync(logoPath)) {
            const logoBytes = fs.readFileSync(logoPath);
            const logoImg = await mergedDoc.embedPng(logoBytes);
            // Scale appropriately
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
    } catch (e) {
        // Fallback text if logo cannot load
        page.drawText(brand.name, { x: pad, y: y - 16, size: 16, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
        y -= 26;
    }

    // 2. Company Address & GSTN
    page.drawText(brand.address, {
        x: pad,
        y,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.35, 0.38, 0.45)
    });
    y -= 12;
    page.drawText(`Email: ${brand.email} | M: ${brand.mobile} | GSTN: ${brand.gstn}`, {
        x: pad,
        y,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.35, 0.38, 0.45)
    });
    y -= 10;

    // Dark divider line
    page.drawLine({
        start: { x: pad, y },
        end: { x: pad + width, y },
        thickness: 2,
        color: rgb(0.12, 0.16, 0.23)
    });
    y -= 26;

    // 3. Title: Certificate of Analysis (Underlined)
    const title = 'Certificate of Analysis';
    const titleSize = 16;
    const titleW = fontBold.widthOfTextAtSize(title, titleSize);
    const titleX = pad + (width - titleW) / 2;
    page.drawText(title, {
        x: titleX,
        y,
        size: titleSize,
        font: fontBold,
        color: rgb(0, 0, 0)
    });
    y -= 3;
    page.drawLine({
        start: { x: titleX, y },
        end: { x: titleX + titleW, y },
        thickness: 1,
        color: rgb(0, 0, 0)
    });
    y -= 22;

    // 4. Customer Section
    const customerLabelW = 105;
    page.drawText('Customer Name:', {
        x: pad,
        y,
        size: 9.5,
        font: fontBold,
        color: rgb(0.12, 0.16, 0.23)
    });
    page.drawText(ord.customer_name || 'BDR Pharmaceuticals International Pvt. Ltd.', {
        x: pad + customerLabelW,
        y,
        size: 9.5,
        font: fontBold,
        color: rgb(0, 0, 0)
    });
    y -= 15;

    page.drawText('Address:', {
        x: pad,
        y,
        size: 9.5,
        font: fontBold,
        color: rgb(0.12, 0.16, 0.23)
    });
    const addr = (ord.delivery_address || 'Survey No. 51/1, At Vanseti Village, Po: Tajpura, Taluka - Halol, Dist. Panchamahals.').slice(0, 85);
    page.drawText(addr, {
        x: pad + customerLabelW,
        y,
        size: 9,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1)
    });
    y -= 22;

    // 5. Order Details Box (Rounded 2-column card matching COATemplate.tsx)
    const boxH = 92;
    const colW = width / 2;

    // Background box
    page.drawRectangle({
        x: pad,
        y: y - boxH,
        width,
        height: boxH,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: rgb(0.8, 0.83, 0.88),
        borderWidth: 1
    });

    const d = new Date();
    const todayFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const dateStr = ord.delivery_date ? ord.delivery_date.split('-').reverse().join('/') : todayFormatted;
    const mfgDateStr = ord.order_date ? ord.order_date.split('-').reverse().join('/') : dateStr;

    let rowY = y - 18;

    // Row 1: Date & Date of Mfg.
    page.drawText('Date :', { x: pad + 12, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(dateStr, { x: pad + 85, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: pad + 10, y: rowY - 4 }, end: { x: pad + colW - 15, y: rowY - 4 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });

    page.drawText('Date of Mfg.:', { x: pad + colW + 10, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(mfgDateStr, { x: pad + colW + 90, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: pad + colW + 10, y: rowY - 4 }, end: { x: pad + width - 10, y: rowY - 4 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });
    rowY -= 20;

    // Row 2: Product Name (spanning across)
    page.drawText('Product Name :', { x: pad + 12, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText((ord.product_name || '<<[Product Name]>>').slice(0, 60), { x: pad + 95, y: rowY, size: 8.5, font: fontBold, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: pad + 10, y: rowY - 4 }, end: { x: pad + width - 10, y: rowY - 4 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });
    rowY -= 20;

    // Row 3: Quantity & Batch No
    const qtyVal = Number(ord.qty_delivered || ord.quantity || 0).toLocaleString();
    page.drawText('Quantity:', { x: pad + 12, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(qtyVal, { x: pad + 85, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: pad + 10, y: rowY - 4 }, end: { x: pad + colW - 15, y: rowY - 4 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });

    page.drawText('Batch No:', { x: pad + colW + 10, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(ord.batch_no || '-', { x: pad + colW + 90, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: pad + colW + 10, y: rowY - 4 }, end: { x: pad + width - 10, y: rowY - 4 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });
    rowY -= 20;

    // Row 4: Invoice No & Artwork Code
    page.drawText('Invoice No:', { x: pad + 12, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(ord.invoice_no || '-', { x: pad + 85, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: pad + 10, y: rowY - 4 }, end: { x: pad + colW - 15, y: rowY - 4 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });

    page.drawText('Artwork Code:', { x: pad + colW + 10, y: rowY, size: 8.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    page.drawText(ord.artwork_code || '-', { x: pad + colW + 90, y: rowY, size: 8.5, font: fontRegular, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: pad + colW + 10, y: rowY - 4 }, end: { x: pad + width - 10, y: rowY - 4 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.93) });

    y -= (boxH + 24);

    // 6. Analysis Table
    const colSrW = 44;
    const colTestW = 120;
    const colObsW = 100;
    const colSpecW = width - colSrW - colTestW - colObsW;

    // Table Header
    page.drawRectangle({
        x: pad,
        y: y - 22,
        width,
        height: 22,
        color: rgb(0.94, 0.96, 0.98),
        borderColor: rgb(0.15, 0.2, 0.3),
        borderWidth: 1
    });
    page.drawLine({ start: { x: pad + colSrW, y }, end: { x: pad + colSrW, y: y - 22 }, thickness: 1, color: rgb(0.15, 0.2, 0.3) });
    page.drawLine({ start: { x: pad + colSrW + colTestW, y }, end: { x: pad + colSrW + colTestW, y: y - 22 }, thickness: 1, color: rgb(0.15, 0.2, 0.3) });
    page.drawLine({ start: { x: pad + colSrW + colTestW + colSpecW, y }, end: { x: pad + colSrW + colTestW + colSpecW, y: y - 22 }, thickness: 1, color: rgb(0.15, 0.2, 0.3) });

    page.drawText('Sr No', { x: pad + 10, y: y - 15, size: 9, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText('Test', { x: pad + colSrW + 10, y: y - 15, size: 9, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText('Specification', { x: pad + colSrW + colTestW + 10, y: y - 15, size: 9, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText('Observation', { x: pad + colSrW + colTestW + colSpecW + 20, y: y - 15, size: 9, font: fontBold, color: rgb(0, 0, 0) });
    y -= 22;

    // Specifications & values
    const descSpec = (ord.specification || ord.specs || ord.product_name || '<<[Specification]>>').slice(0, 48);
    const gsmVal = ord.gsm_value || '';
    const gsmSpec = gsmVal ? `${gsmVal} +/- 5%` : 'Standard +/- 5%';

    const isInsert = (ord.category_name || '').toLowerCase().includes('insert') || (ord.product_name || '').toLowerCase().includes('leaflet');
    const folding = ord.folding_dim || ord.folding_dimension || '';
    const constVal = ord.construction || ord.construction_type || 'As per approved specimen';
    const constSpec = isInsert && folding ? `${constVal} (${folding})` : constVal;

    const dimVal = ord.dimension || '';
    const dimSpec = dimVal ? `${dimVal} mm +/-2mm` : 'Standard mm +/-2mm';

    const testRows = [
        { sr: '1', name: 'Description', spec: descSpec, subVal: '' },
        { sr: '2', name: 'GSM', spec: gsmSpec, subVal: gsmVal ? `${gsmVal}` : '' },
        { sr: '3', name: 'Construction', spec: constSpec, subVal: isInsert && folding ? `(${folding})` : '' },
        { sr: '4', name: 'Dimensions', spec: dimSpec, subVal: dimVal ? `${dimVal}` : '' },
        { sr: '5', name: 'Shade', spec: 'Will comply with shade', subVal: '' },
    ];

    const rowHeight = 28;
    for (const r of testRows) {
        page.drawRectangle({
            x: pad,
            y: y - rowHeight,
            width,
            height: rowHeight,
            borderColor: rgb(0.15, 0.2, 0.3),
            borderWidth: 0.75
        });

        // Vertical dividers
        page.drawLine({ start: { x: pad + colSrW, y }, end: { x: pad + colSrW, y: y - rowHeight }, thickness: 0.75, color: rgb(0.15, 0.2, 0.3) });
        page.drawLine({ start: { x: pad + colSrW + colTestW, y }, end: { x: pad + colSrW + colTestW, y: y - rowHeight }, thickness: 0.75, color: rgb(0.15, 0.2, 0.3) });
        page.drawLine({ start: { x: pad + colSrW + colTestW + colSpecW, y }, end: { x: pad + colSrW + colTestW + colSpecW, y: y - rowHeight }, thickness: 0.75, color: rgb(0.15, 0.2, 0.3) });

        // Sr No
        page.drawText(r.sr, { x: pad + 18, y: y - 17, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
        // Test Name
        page.drawText(r.name, { x: pad + colSrW + 10, y: y - 17, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
        // Specification
        page.drawText(r.spec, { x: pad + colSrW + colTestW + 10, y: y - 17, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

        // Observation: bold green OK
        const okText = 'OK';
        page.drawText(okText, {
            x: pad + colSrW + colTestW + colSpecW + 40,
            y: r.subVal ? y - 13 : y - 17,
            size: 9.5,
            font: fontBold,
            color: rgb(0.02, 0.48, 0.25) // emerald-700
        });

        if (r.subVal) {
            page.drawText(r.subVal, {
                x: pad + colSrW + colTestW + colSpecW + 30,
                y: y - 23,
                size: 7.5,
                font: fontRegular,
                color: rgb(0.4, 0.45, 0.5)
            });
        }

        y -= rowHeight;
    }

    y -= 32;

    // 7. Signatures Section (Matching COATemplate.tsx exactly)
    // Left: Checked By : Laxman & script LS
    page.drawText('Checked By : Laxman', { x: pad + 5, y, size: 9.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    // Right: Approved By : Saahil & script Sps
    page.drawText('Approved By : Saahil', { x: pad + width - 145, y, size: 9.5, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
    y -= 18;

    // Handwritten scripts in rich blue ink
    page.drawText('LS', { x: pad + 18, y, size: 18, font: fontItalicBold, color: rgb(0.08, 0.18, 0.48) });
    page.drawText('Sps', { x: pad + width - 110, y, size: 18, font: fontItalicBold, color: rgb(0.08, 0.18, 0.48) });
    y -= 28;

    // For CREATIVE PACKAGING (Right aligned uppercase blue)
    const forCompany = `For ${brand.name}`;
    const forCompanyW = fontBold.widthOfTextAtSize(forCompany, 10.5);
    page.drawText(forCompany, {
        x: pad + width - forCompanyW - 5,
        y,
        size: 10.5,
        font: fontBold,
        color: rgb(0.08, 0.2, 0.55)
    });
    y -= 4;

    // Official Signature Image
    try {
        const signPath = path.resolve(process.cwd(), brand.sign_file);
        if (fs.existsSync(signPath)) {
            const signBytes = fs.readFileSync(signPath);
            const signImg = await mergedDoc.embedPng(signBytes);
            const signDims = signImg.scale(0.35);
            page.drawImage(signImg, {
                x: pad + width - 130,
                y: y - signDims.height,
                width: signDims.width,
                height: signDims.height
            });
            y -= (signDims.height + 2);
        } else {
            y -= 24;
        }
    } catch {
        y -= 24;
    }

    // Proprietor / Authorised Signatory Label
    const propLabel = brand.proprietor_label.toUpperCase();
    const propLabelW = fontBold.widthOfTextAtSize(propLabel, 8.5);
    const propLabelX = pad + width - 120 + (100 - propLabelW) / 2;

    page.drawLine({
        start: { x: pad + width - 130, y },
        end: { x: pad + width - 10, y },
        thickness: 0.75,
        color: rgb(0.7, 0.75, 0.8)
    });
    y -= 10;
    page.drawText(propLabel, {
        x: propLabelX,
        y,
        size: 8.5,
        font: fontBold,
        color: rgb(0.08, 0.2, 0.55)
    });
}
