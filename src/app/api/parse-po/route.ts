import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import zlib from 'zlib';
import { supabase } from '@/utils/supabase/client';

export interface ParsedPoItem {
    itemNo?: string;
    materialCode?: string;
    exactPoName: string;
    hsn?: string;
    quantity?: number;
    uom?: string;
    rate?: number;
    deliveryDate?: string;
    matchedOrderId?: number | string | null;
    matchedOrderName?: string | null;
}

export interface ParsedPoData {
    poNumber: string;
    poDate?: string;
    billFromCompany: 'Creative Packaging' | 'Creative Printers' | 'Creative Enterprise' | 'Unknown';
    billTo: {
        raw: string;
        unit: 'Padra' | 'Halol' | 'Unknown';
    };
    shipTo: {
        raw: string;
        unit: 'Padra' | 'Halol' | 'Same as Bill To' | 'Unknown';
    };
    items: ParsedPoItem[];
    rawTextPreview?: string;
}

function extractPdfText(doc: PDFDocument): string {
    let fullText = '';
    doc.getPages().forEach(page => {
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
            const matches = str.match(/\((?:[^()\\]|\\.)*\)|<[0-9a-fA-F]+>/g) || [];
            const extracted = matches.map(m => {
                if (m.startsWith('(')) {
                    return m.slice(1, -1)
                        .replace(/\\([()\\])/g, '$1')
                        .replace(/\\222/g, "'")
                        .replace(/\\/g, '');
                }
                return '';
            }).join(' ');
            fullText += extracted + '\n';
        });
    });
    return fullText;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Extract text cleanly using pdf-lib + zlib
        const doc = await PDFDocument.load(buffer);
        const fullText = extractPdfText(doc);

        if (!fullText.trim()) {
            return NextResponse.json({ error: 'Could not extract text from this PDF file.' }, { status: 422 });
        }

        // 2. Extract PO Number
        let poNumber = '';
        const poMatch = fullText.match(/PO\s*Number\s*:\s*(\d+)/i) || fullText.match(/(?:PO\s*(?:No\.?|Number)|Purchase\s*Order\s*(?:No\.?|Number)?)[^\d\n\r]*([0-9]{7,12})/i);
        if (poMatch) {
            poNumber = poMatch[1];
        } else {
            const fnMatch = file.name.match(/\b(41\d{7,8}|\d{8,12})\b/);
            if (fnMatch) poNumber = fnMatch[1];
        }

        // 3. Extract PO Date
        let poDate = '';
        const dateMatch = fullText.match(/PO\s*Date\s*:\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i) || fullText.match(/(?:PO\s*Date|Order\s*Date)[^\d\n\r]*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i);
        if (dateMatch) {
            poDate = dateMatch[1];
        }

        // 4. Detect Bill From Company (Creative Printers, Creative Packaging, Creative Enterprise)
        let billFromCompany: 'Creative Packaging' | 'Creative Printers' | 'Creative Enterprise' | 'Unknown' = 'Creative Packaging';
        const lowerText = fullText.toLowerCase();

        if (lowerText.includes('creative packaging')) {
            billFromCompany = 'Creative Packaging';
        } else if (lowerText.includes('creative printers') || lowerText.includes('creative printer')) {
            billFromCompany = 'Creative Printers';
        } else if (lowerText.includes('creative enterprise') || lowerText.includes('creative enterprises')) {
            billFromCompany = 'Creative Enterprise';
        }

        // 5. Detect Bill To & Ship To (Padra vs Halol)
        let billToUnit: 'Padra' | 'Halol' | 'Unknown' = 'Unknown';
        let shipToUnit: 'Padra' | 'Halol' | 'Same as Bill To' | 'Unknown' = 'Unknown';

        const isPadra = lowerText.includes('padra');
        const isHalol = lowerText.includes('halol');

        if (isPadra) billToUnit = 'Padra';
        else if (isHalol) billToUnit = 'Halol';

        shipToUnit = billToUnit === 'Unknown' ? 'Unknown' : 'Same as Bill To';

        // 6. Extract Line Items
        const items: ParsedPoItem[] = [];

        // Exact pattern for pharmaceutical PO items
        const itemRegex = /Material\s*Code\s*:\s*(\d+)[\s\r\n]+([\s\S]*?)(?:HSN\s*No\.?\s*:\s*(\d+))([\s\S]*?)(?=Material\s*Code|Total\s*Value|$)/gi;
        let match;

        while ((match = itemRegex.exec(fullText)) !== null) {
            const materialCode = match[1].trim();
            let exactPoName = match[2].replace(/\s+/g, ' ').trim();
            const hsn = match[3]?.trim() || '';
            const rest = match[4] || '';

            // Clean description
            exactPoName = exactPoName.replace(/^[:\s-]+/, '').trim();

            // Quantity
            const qtyMatch = rest.match(/([\d,]+)\s*NOS/i) || rest.match(/([\d,]+)\s*(?:PCS|EA|PACK)/i);
            const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(/,/g, '')) : undefined;

            // Rate (Base Price)
            const rateMatch = rest.match(/Base\s*Price\s*([\d,]+(?:\.\d+)?)/i) || rest.match(/Rate[^\d\r\n]*([0-9,]+(?:\.[0-9]+)?)/i);
            const rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, '')) : undefined;

            // Delivery Date
            const delDateMatch = rest.match(/([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/);
            const deliveryDate = delDateMatch ? delDateMatch[1] : undefined;

            if (exactPoName || materialCode) {
                items.push({
                    materialCode,
                    exactPoName,
                    hsn,
                    quantity,
                    uom: 'NOS',
                    rate,
                    deliveryDate,
                });
            }
        }

        // 7. Auto-match items against existing Orders in Supabase
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('id, order_id, product_name, artwork_code, quantity, rate, customer_name, from_our_company, packing_detail, delivery_address')
            .order('id', { ascending: false })
            .limit(150);

        if (recentOrders && recentOrders.length > 0) {
            for (const item of items) {
                const searchTokens = item.exactPoName
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, ' ')
                    .split(/\s+/)
                    .filter(t => t.length > 2 && !['mono', 'carton', 'insert', 'label', 'leaflet', 'export', 'for', 'tab', 'tablet'].includes(t));

                let bestMatch: any = null;
                let highestScore = 0;

                for (const order of recentOrders) {
                    const oName = (order.product_name || '').toLowerCase();
                    const oCode = (order.artwork_code || '').toLowerCase();
                    let score = 0;

                    for (const token of searchTokens) {
                        if (oName.includes(token)) score += 2;
                        if (oCode.includes(token)) score += 3;
                    }

                    if (item.materialCode && (oCode.includes(item.materialCode) || oName.includes(item.materialCode))) {
                        score += 5;
                    }

                    if (score > highestScore && score >= 2) {
                        highestScore = score;
                        bestMatch = order;
                    }
                }

                if (bestMatch) {
                    item.matchedOrderId = bestMatch.id;
                    item.matchedOrderName = `${bestMatch.order_id || bestMatch.id} - ${bestMatch.product_name}`;
                }
            }
        }

        const parsedData: ParsedPoData = {
            poNumber: poNumber || 'PO-' + Date.now().toString().slice(-6),
            poDate: poDate || '',
            billFromCompany,
            billTo: {
                raw: 'BDR Pharmaceuticals International Private Limited, Luna, Padra',
                unit: billToUnit,
            },
            shipTo: {
                raw: 'BDR Pharmaceuticals International Private Limited, Luna, Padra',
                unit: shipToUnit,
            },
            items,
            rawTextPreview: fullText.slice(0, 1000),
        };

        return NextResponse.json({
            success: true,
            data: parsedData,
            availableOrders: recentOrders || [],
        });

    } catch (err: any) {
        console.error('PO Parsing Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to parse Purchase Order PDF.' }, { status: 500 });
    }
}
