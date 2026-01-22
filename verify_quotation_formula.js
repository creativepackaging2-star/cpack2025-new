
import { supabase } from './src/utils/supabase/client.js';

async function verifyFormula() {
    console.log('Verifying formula logic...');

    // Sample data from Access Row 1199
    const qty = 19000;
    const size_h = 15;
    const size_w = 20;
    const gsm = 60;
    const rate_kg = 66;
    const ups_sheet = 4;
    const buffer_qty = 250; // Inferred from 4750 + 250 = 5000 paper order
    const printing_ups = 2;
    const printing_rate = 250;
    const colour = 1;
    const plate_rate = 300;
    const extra_cost = 5200;
    const interest_pc = 2;
    const punch_cost = 1500;
    const foil_pc = 0.07 / 19000 * 19000; // foil was 700 total, so 700/19000 = 0.0368 per pc
    const profit_pc = 11; // subtotal 14341, profit 1609.16 -> ~11.2%

    // 1. Amount per sheet
    const amountPerSheet = (size_h * size_w * gsm * rate_kg) / 1550000;
    console.log('Amount Per Sheet:', amountPerSheet, '(Expected: ~0.7664)');

    // 2. Paper Cost
    const paperQty = qty / ups_sheet;
    const paperOrder = paperQty + buffer_qty;
    const paperCost = amountPerSheet * paperOrder;
    console.log('Paper Cost:', paperCost, '(Expected: ~3832.25)');

    // 3. Printing
    const printingQty = paperOrder * printing_ups;
    const printingAmt = (printingQty / 1000) * printing_rate;
    console.log('Printing Amt:', printingAmt, '(Expected: 2500)');

    // 4. Subtotal
    const subtotal = paperCost + printingAmt + punch_cost + (colour * plate_rate) + (qty * 0.036842) + extra_cost;
    console.log('Subtotal:', subtotal, '(Expected: ~14341)');

    // 5. Total
    const interestAmt = subtotal * (interest_pc / 100);
    const totalAmt = (subtotal + interestAmt) * (1 + profit_pc / 100);
    console.log('Total Amt:', totalAmt, '(Expected: ~16237)');
}

verifyFormula();
