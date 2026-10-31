export type CompanyName = 'Creative Packaging' | 'Creative Printers' | 'Creative Enterprise';

export function normalizeCompany(companyStr: string | null | undefined): CompanyName {
    const s = (companyStr || '').toLowerCase();
    if (s.includes('print')) return 'Creative Printers';
    if (s.includes('enter')) return 'Creative Enterprise';
    return 'Creative Packaging';
}

export function parseOrderPoInfo(remarks: string | null | undefined, fallbackRate = 0) {
    if (remarks && remarks.includes('[PO:')) {
        const m = remarks.match(/\[PO:([^|]+)\|Item:([^|]+)\|Rate:([^|]+)(?:\|Code:([^|\]]+))?(?:\|Date:([^\]]+))?/);
        if (m) {
            return {
                isTagged: true,
                poNumber: m[1].trim(),
                poItemName: m[2].trim(),
                rate: parseFloat(m[3]) || fallbackRate,
                materialCode: m[4]?.trim() || '',
                poDate: m[5]?.trim() || '',
            };
        }
    }
    return {
        isTagged: false,
        poNumber: '',
        poItemName: '',
        rate: fallbackRate,
        materialCode: '',
        poDate: '',
    };
}

export function parseBoxesFromPacking(packingStr: string | null | undefined): number {
    if (!packingStr) return 0;
    const str = packingStr.trim();
    const boxMatches = str.match(/(\d+)\s*box(?:es)?/gi);
    if (boxMatches && boxMatches.length > 0) {
        let total = 0;
        for (const m of boxMatches) {
            const num = parseInt(m.match(/\d+/)?.[0] || '0', 10);
            total += num;
        }
        return total;
    }
    const justNum = parseInt(str, 10);
    if (!isNaN(justNum) && justNum > 0 && justNum < 500) {
        return justNum;
    }
    return 0;
}
