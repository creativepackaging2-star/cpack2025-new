
function verifyRefinedFormulas() {
    console.log('--- REFINED FORMULA VERIFICATION ---');

    // Sample 1199
    const qty = 19000;
    const h = 15;
    const w = 20;
    const gsm = 60;
    const rate_kg = 66;
    const ups_sheet = 4;
    const buffer = 250;
    const packing_rate = 5.33333333; // Precise ratio from 1199

    const amountPerSheet = (h * w * gsm * rate_kg) / 1550000;
    const paperOrder = (qty / ups_sheet) + buffer;
    const paperWt = (h * w * gsm * paperOrder) / 1550000;
    const paperCost = paperWt * rate_kg;
    const packingAmt = paperWt * packing_rate;

    console.log('1199 Paper Cost:', paperCost.toFixed(3), '(Expected ~3832.258)');
    console.log('1199 Packing Amt:', packingAmt.toFixed(3), '(Expected ~309.677)');

    // Sample 1197 Pasting
    const paperOrder1197 = 2100;
    const ups1197 = 4;
    const pastingRate1197 = 100;
    const pastingAmt1197 = (paperOrder1197 * ups1197 / 1000) * pastingRate1197;
    console.log('1197 Pasting Amt:', pastingAmt1197, '(Expected 840)');

    // Sample 1197 Aqua
    const pH1197 = 15.75;
    const pW1197 = 20.75;
    const printQty1197 = 2100;
    const aquaRt1197 = 0.002;
    const aquaAmt1197 = pH1197 * pW1197 * printQty1197 * aquaRt1197;
    console.log('1197 Aqua Amt:', aquaAmt1197.toFixed(4), '(Expected 1372.6125)');
}

verifyRefinedFormulas();
