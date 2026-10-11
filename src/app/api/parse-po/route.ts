import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
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

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Extract full text from PDF
        const parser = new PDFParse({ data: buffer });
        const parseResult = await parser.getText();
        const fullText = parseResult.text || '';

        if (!fullText.trim()) {
            return NextResponse.json({ error: 'Could not extract text from this PDF file.' }, { status: 422 });
        }

        // 2. Extract PO Number
        let poNumber = '';
        // Look in filename first (e.g. 4110029219_...)
        const fnMatch = file.name.match(/\b(41\d{7,8}|\d{8,12})\b/);
        if (fnMatch) {
            poNumber = fnMatch[1];
        } else {
            const poMatch = fullText.match(/(?:PO\s*(?:No\.?|Number)|Purchase\s*Order\s*(?:No\.?|Number)?)[^\d\n\r]*([0-9]{7,12})/i);
            if (poMatch) poNumber = poMatch[1];
        }

        // 3. Extract PO Date
        let poDate = '';
        const dateMatch = fullText.match(/(?:PO\s*Date|Order\s*Date|Date)[^\d\n\r]*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i);
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

        // Check Bill To keywords
        const billToSection = fullText.match(/Bill\s*To[\s\S]*?(?:Ship\s*To|Delivery\s*Address|Item|Remarks|$)/i)?.[0] || '';
        const shipToSection = fullText.match(/(?:Ship\s*To|Delivery\s*Address)[\s\S]*?(?:Item|Details|Remarks|$)/i)?.[0] || '';

        if (billToSection.toLowerCase().includes('padra') || (!billToSection && lowerText.includes('padra'))) {
            billToUnit = 'Padra';
        } else if (billToSection.toLowerCase().includes('halol') || (!billToSection && lowerText.includes('halol'))) {
            billToUnit = 'Halol';
        }

        if (shipToSection) {
            if (shipToSection.toLowerCase().includes('padra')) {
                shipToUnit = 'Padra';
            } else if (shipToSection.toLowerCase().includes('halol')) {
                shipToUnit = 'Halol';
            } else {
                shipToUnit = billToUnit === 'Unknown' ? 'Unknown' : 'Same as Bill To';
            }
        } else {
            shipToUnit = billToUnit === 'Unknown' ? 'Unknown' : 'Same as Bill To';
        }

        // 6. Extract Line Items
        const items: ParsedPoItem[] = [];

        // Pattern: Matches item blocks in pharmaceutical POs (Item 10, Material Code, Description, HSN, Qty, Rate)
        // Look for "Material Code" pattern
        const itemRegex = /(?:Item\s*:?\s*(\d+))?[\s\S]*?Material\s*Code\s*:?\s*(\d+)[\s\r\n]+([\s\S]*?)(?:HSN\s*(?:No\.?)?\s*:?\s*(\d+))/gi;
        let match;

        while ((match = itemRegex.exec(fullText)) !== null) {
            const itemNo = match[1] || '';
            const materialCode = match[2]?.trim() || '';
            let rawDesc = match[3]?.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim() || '';
            const hsn = match[4]?.trim() || '';

            // Clean description
            rawDesc = rawDesc.replace(/^[:\s-]+/, '').trim();

            // Find quantity, rate, delivery date in text immediately following this HSN
            const subsequentText = fullText.slice(match.index, match.index + 500);

            // Qty
            const qtyMatch = subsequentText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:NOS|PCS|EA|PACK)/i);
            const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(/,/g, '')) : undefined;
            const uom = qtyMatch ? 'NOS' : 'NOS';

            // Rate (Base Price / Rate)
            const rateMatch = subsequentText.match(/(?:Base\s*Price|Rate)[^\d\r\n]*([0-9,]+(?:\.[0-9]+)?)/i);
            const rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, '')) : undefined;

            // Delivery Date
            const delDateMatch = subsequentText.match(/Delivery\s*Date[^\d\r\n]*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i);
            const deliveryDate = delDateMatch ? delDateMatch[1] : undefined;

            if (rawDesc || materialCode) {
                items.push({
                    itemNo,
                    materialCode,
                    exactPoName: rawDesc,
                    hsn,
                    quantity,
                    uom,
                    rate,
                    deliveryDate,
                });
            }
        }

        // Fallback: If no "Material Code" keyword found, scan for line rows
        if (items.length === 0) {
            const fallbackRegex = /(\d{10})[\s\r\n]+([A-Z0-9\s()'.\/-]{5,80})/g;
            let fbMatch;
            while ((fbMatch = fallbackRegex.exec(fullText)) !== null) {
                const matCode = fbMatch[1];
                const desc = fbMatch[2].replace(/\s+/g, ' ').trim();
                if (desc.length > 5 && !desc.includes('Page') && !desc.includes('Creative')) {
                    items.push({
                        materialCode: matCode,
                        exactPoName: desc,
                        uom: 'NOS',
                    });
                }
            }
        }

        // 7. Auto-match items against existing Orders in Supabase
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('id, order_id, product_name, artwork_code, quantity, rate, customer_name, from_our_company, packing_detail, delivery_address')
            .order('id', { ascending: false })
            .limit(100);

        if (recentOrders && recentOrders.length > 0) {
            for (const item of items) {
                const searchTokens = item.exactPoName
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, ' ')
                    .split(/\s+/)
                    .filter(t => t.length > 2 && !['mono', 'carton', 'insert', 'label', 'leaflet', 'export', 'for'].includes(t));

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
            poDate,
            billFromCompany,
            billTo: {
                raw: billToSection.slice(0, 300) || 'BDR Pharmaceuticals',
                unit: billToUnit,
            },
            shipTo: {
                raw: shipToSection.slice(0, 300) || '',
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
