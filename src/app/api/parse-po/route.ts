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
        cleanAddress: string;
        unit: string;
        gstin?: string;
        pan?: string;
    };
    shipTo: {
        raw: string;
        cleanAddress: string;
        unit: string;
        matchedDeliveryAddress?: string;
        gstin?: string;
        pan?: string;
    };
    items: ParsedPoItem[];
    deliveryAddresses?: { id: number; name: string }[];
    rawTextPreview?: string;
}

function cleanAddressOnly(raw: string): string {
    if (!raw) return '';
    const beforeStatutory = raw.split(/(?:PAN|GSTIN|GST|CIN|DL\d?|MFG\s*License)\s*[:]/i)[0];
    return beforeStatutory
        .replace(/\s+/g, ' ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/g, '')
        .trim();
}

function extractStatutory(text: string): { gstin?: string; pan?: string } {
    if (!text) return {};
    const gstin = text.match(/GSTIN\s*[:\s]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i)?.[1];
    const pan = text.match(/PAN\s*[:\s]*([A-Z]{5}[0-9]{4}[A-Z]{1})/i)?.[1];
    return { gstin, pan };
}

export function detectUnitName(text: string): string {
    if (!text) return 'Unknown';
    const lower = text.toLowerCase();
    if (lower.includes('padra') || lower.includes('luna')) return 'Padra';
    if (lower.includes('halol') || lower.includes('tajpura') || lower.includes('vanseti')) return 'Halol';
    if (lower.includes('bhiwandi') || lower.includes('pimplas') || lower.includes('bhoomi world')) return 'Bhiwandi';
    if (lower.includes('samrudh') || lower.includes('boisar') || lower.includes('tarapur')) return 'Samrudh Boisar';
    if (lower.includes('inject care') || lower.includes('vapi')) return 'Inject Care Vapi';
    if (lower.includes('indasi') || lower.includes('daman') || lower.includes('kadaiya') || lower.includes('bhimpore')) return 'Indasi Daman';
    if (lower.includes('bajaj') || lower.includes('manjusar') || lower.includes('savli')) return 'Bajaj Manjusar';
    if (lower.includes('lyka') || lower.includes('ankleshwar')) return 'Lyka Ankleshwar';
    if (lower.includes('j.duncan') || lower.includes('atgaon')) return 'J.Duncan Atgaon';
    if (lower.includes('khandelwal') || lower.includes('wagle')) return 'Khandelwal Thane';
    if (lower.includes('kamla') && lower.includes('tarapur')) return 'Kamla Tarapur';
    if (lower.includes('mepromax') || lower.includes('selaqui') || lower.includes('dehradun')) return 'Mepromax Dehradun';
    if (lower.includes('revacure') || lower.includes('jabalpur')) return 'Revacure Jabalpur';
    if (lower.includes('sovereign') && (lower.includes('daman') || lower.includes('bhimpore'))) return 'Sovereign Daman';
    if (lower.includes('vhb') || lower.includes('rudrapur') || lower.includes('pant nagar')) return 'VHB Rudrapur';
    if (lower.includes('sharda chambers') || lower.includes('marine lines')) return 'Mumbai HO';

    const firstLine = text.split(/[\r\n,]/)[0].trim();
    if (firstLine && firstLine.length > 3 && firstLine.length < 35) {
        return firstLine;
    }
    return 'Other';
}

function matchDbAddress(rawText: string, dbAddrs: { id: number; name: string }[]): string | null {
    if (!rawText || !dbAddrs || dbAddrs.length === 0) return null;
    const lower = rawText.toLowerCase();
    let bestMatch: string | null = null;
    let maxScore = 0;

    const keywords = [
        'padra', 'luna', 'halol', 'vanseti', 'tajpura', 'samrudh', 'tarapur', 'boisar',
        'bhiwandi', 'vapi', 'daman', 'manjusar', 'savli', 'ankleshwar', 'thane', 'atgaon',
        'selaqui', 'dehradun', 'jabalpur', 'rudrapur', 'kamla', 'sovereign', 'inject care',
        'indasi', 'bajaj', 'lyka'
    ];

    for (const da of dbAddrs) {
        const daLow = (da.name || '').toLowerCase();
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw) && daLow.includes(kw)) {
                score += 10;
            }
        }
        if (score > maxScore) {
            maxScore = score;
            bestMatch = da.name;
        }
    }

    return maxScore >= 10 ? bestMatch : null;
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

        // 5. Extract and Detect Bill To & Ship To dynamically from PO
        let billToRaw = '';
        const billToMatch = fullText.match(/Bill\s*To\s*[:\s]*([\s\S]*?)(?=Ship\s*To|Payment\s*Terms|Inco\s*Terms|Item\s*Details|Material\s*Code)/i);
        if (billToMatch) {
            billToRaw = billToMatch[1].trim();
        }

        let shipToRaw = '';
        const shipToMatch = fullText.match(/Ship\s*To\s*[:\s]*([\s\S]*?)(?=Payment\s*Terms|Inco\s*Terms|Mode\s*Of\s*Dispatch|Currency|Port\s*Of\s*Discharge|Freight\s*Terms|Indenter|Remarks|Item\s*Details|Material\s*Code)/i);
        if (shipToMatch) {
            shipToRaw = shipToMatch[1].trim();
        }

        // If no explicit Ship To block found, fallback to Bill To
        if (!shipToRaw && billToRaw) {
            shipToRaw = billToRaw;
        }

        const billToClean = cleanAddressOnly(billToRaw);
        const shipToClean = cleanAddressOnly(shipToRaw);

        const billToStatutory = extractStatutory(billToRaw);
        const shipToStatutory = extractStatutory(shipToRaw);

        const billToUnit = detectUnitName(billToRaw);
        let shipToUnit = detectUnitName(shipToRaw);

        if (shipToClean && billToClean && shipToClean.toLowerCase() === billToClean.toLowerCase()) {
            shipToUnit = 'Same as Bill To';
        }

        // Fetch registered delivery addresses from Supabase for exact matching
        const { data: dbAddrs } = await supabase.from('delivery_addresses').select('id, name').order('name');
        const matchedShipToAddress = matchDbAddress(shipToRaw || shipToClean, dbAddrs || []);

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

        // 7. Auto-match items against existing OPEN Orders in Supabase
        const { data: allOrders } = await supabase
            .from('orders')
            .select('id, order_id, product_name, artwork_code, quantity, rate, customer_name, from_our_company, packing_detail, delivery_address, status')
            .neq('status', 'Complete')
            .neq('status', 'Delivered')
            .order('id', { ascending: false })
            .limit(200);

        const recentOrders = (allOrders || []).filter(o => {
            const s = (o.status || '').toLowerCase().trim();
            return !s.includes('complete') && s !== 'delivered';
        });

        // Packaging type detector (Leaflet and Insert are one and same)
        const detectPackagingType = (text: string, artworkCode: string = '') => {
            const t = (text || '').toLowerCase();
            const ac = (artworkCode || '').toUpperCase();

            // Check artwork code suffix (/I = Insert/Leaflet, /L = Label, /C = Carton)
            if (ac.includes('/I') || ac.endsWith('I') || ac.endsWith('I2') || ac.endsWith('I3')) return 'insert';
            if (ac.includes('/L') || ac.endsWith('L') || ac.endsWith('L2') || ac.endsWith('L3')) return 'label';
            if (ac.includes('/C') || ac.endsWith('C') || ac.endsWith('C2') || ac.endsWith('C3')) return 'carton';

            // Leaflet and Insert are identical in pharma packaging
            if (t.includes('leaflet') || t.includes('insert') || t.includes('outsert') || t.includes('pil') || t.includes('literature')) return 'insert';
            if (t.includes('label') || t.includes('sticker')) return 'label';
            if (t.includes('carton') || t.includes('mono') || t.includes('box') || t.includes('outer')) return 'carton';
            return 'unknown';
        };

        if (recentOrders && recentOrders.length > 0) {
            const assignedOrderIds = new Set<string | number>();

            for (const item of items) {
                const itemType = detectPackagingType(item.exactPoName);
                const searchTokens = item.exactPoName
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, ' ')
                    .split(/\s+/)
                    .filter(t => t.length > 2 && !['for', 'tab', 'tablet', 'ip', 'bp', 'usp', 'mg', 'ml'].includes(t));

                let bestMatch: any = null;
                let highestScore = -999;

                for (const order of recentOrders) {
                    const oName = (order.product_name || '').toLowerCase();
                    const oCode = (order.artwork_code || '').toLowerCase();
                    const orderType = detectPackagingType(oName, order.artwork_code);
                    let score = 0;

                    // 1. Brand name tokens match
                    for (const token of searchTokens) {
                        if (oName.includes(token)) score += 5;
                        if (oCode.includes(token)) score += 5;
                    }

                    // 2. Material code match
                    if (item.materialCode && (oCode.includes(item.materialCode) || oName.includes(item.materialCode))) {
                        score += 15;
                    }

                    // 3. Packaging type match (Leaflet <=> Insert are one and same)
                    if (itemType !== 'unknown' && orderType !== 'unknown') {
                        if (itemType === orderType) {
                            score += 30; // Strong type match
                        } else {
                            score -= 60; // Fatal penalty for cross-type match (e.g. Leaflet matched to Label)
                        }
                    }

                    // 4. Exact quantity match bonus
                    if (item.quantity && order.quantity && Number(item.quantity) === Number(order.quantity)) {
                        score += 15;
                    }

                    // 5. Avoid double-assigning the same order to multiple PO items
                    if (assignedOrderIds.has(order.id)) {
                        score -= 40;
                    }

                    if (score > highestScore && score >= 10) {
                        highestScore = score;
                        bestMatch = order;
                    }
                }

                if (bestMatch) {
                    assignedOrderIds.add(bestMatch.id);
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
                raw: billToRaw,
                cleanAddress: billToClean || billToRaw,
                unit: billToUnit,
                gstin: billToStatutory.gstin,
                pan: billToStatutory.pan,
            },
            shipTo: {
                raw: shipToRaw,
                cleanAddress: shipToClean || shipToRaw,
                unit: shipToUnit,
                matchedDeliveryAddress: matchedShipToAddress || undefined,
                gstin: shipToStatutory.gstin,
                pan: shipToStatutory.pan,
            },
            items,
            deliveryAddresses: dbAddrs || [],
            rawTextPreview: fullText.slice(0, 1000),
        };

        return NextResponse.json({
            success: true,
            data: parsedData,
            availableOrders: recentOrders || [],
            deliveryAddresses: dbAddrs || [],
        });

    } catch (err: any) {
        console.error('PO Parsing Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to parse Purchase Order PDF.' }, { status: 500 });
    }
}
