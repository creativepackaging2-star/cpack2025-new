export interface ZohoAddressResolution {
    customerId: string;
    shippingAddressId?: string;
    billingAddressId?: string;
    placeOfSupply: string;
    isInterState: boolean;
}

/**
 * Resolves exact Zoho Books Contact ID and Shipping Address ID based on billing company and delivery address.
 * Prevents Zoho Books from defaulting to primary contact address (e.g. Gotri) when Padra, Halol, etc. are selected.
 */
export function resolveZohoAddress(
    isPackaging: boolean,
    customerName: string,
    deliveryAddress: string
): ZohoAddressResolution {
    const addr = (deliveryAddress || '').toLowerCase();

    if (isPackaging) {
        // Creative Packaging (Org 649079892)
        // 1. Padra / Village Luna
        if (addr.includes('padra') || addr.includes('luna')) {
            return {
                customerId: '687997000000079367', // BDR Pharmacueticals Pvt Ltd - PADRA -Baroda
                shippingAddressId: '687997000001536084', // VILLAGE LUNA, PADRA, VADODRA 391440
                billingAddressId: '687997000000079371', // 205-206, LOTUS PLAZA, GOTRI
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // 2. Halol / Tajpura / Vanseti
        if (addr.includes('halol') || addr.includes('tajpura') || addr.includes('vanseti')) {
            return {
                customerId: '687997000000079367', // BDR Pharmacueticals Pvt Ltd - PADRA -Baroda
                shippingAddressId: '687997000002002001', // Survey No. 51/1, Vanseti Village, Tajpura, Halol
                billingAddressId: '687997000000079371',
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // 3. Vapi / Inject Care
        if (addr.includes('vapi') || addr.includes('inject care')) {
            return {
                customerId: '687997000000079367',
                shippingAddressId: '687997000003221001', // Vapi
                billingAddressId: '687997000000079371',
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // 4. Gotri / Lotus Plaza
        if (addr.includes('gotri') || addr.includes('lotus plaza')) {
            return {
                customerId: '687997000000079367',
                shippingAddressId: '687997000000079371', // Lotus Plaza, Gotri
                billingAddressId: '687997000000079371',
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // 5. Boisar / Tarapur / Palghar / Maharashtra default
        if (addr.includes('boisar') || addr.includes('tarapur') || addr.includes('palghar') || addr.includes('maharashtra') || addr.includes('401506')) {
            return {
                customerId: '687997000000062001', // BDR PHARMACEUTICALS INTERNATIONAL PRIVATE LIMITED
                shippingAddressId: '687997000001903037', // Boisar
                billingAddressId: '687997000001903037',
                placeOfSupply: 'MH',
                isInterState: false,
            };
        }
        // General Gujarat / Baroda fallback -> Padra
        if (addr.includes('gujarat') || addr.includes('baroda') || addr.includes('vadodara')) {
            return {
                customerId: '687997000000079367',
                shippingAddressId: '687997000001536084', // Padra
                billingAddressId: '687997000000079371',
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // Default BDR Packaging
        return {
            customerId: '687997000000062001',
            shippingAddressId: '687997000001903037',
            billingAddressId: '687997000001903037',
            placeOfSupply: 'MH',
            isInterState: false,
        };
    } else {
        // Creative Printers (Org 651108650)
        // 1. Halol / Tajpura / Vanseti
        if (addr.includes('halol') || addr.includes('tajpura') || addr.includes('vanseti')) {
            return {
                customerId: '874645000002907003', // BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD-Halol- BARODA
                shippingAddressId: '874645000002907010', // Tajpura, Halol
                billingAddressId: '874645000002907010',
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // 2. Padra / Village Luna
        if (addr.includes('padra') || addr.includes('luna')) {
            return {
                customerId: '874645000000060303', // BDR PHARMACEUTICALS INTERNATIONAL PVT. LTD- BARODA
                shippingAddressId: '874645000000060307', // Village Luna, Padra
                billingAddressId: '874645000000870001', // Gotri
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // 3. Vapi / Inject Care
        if (addr.includes('vapi') || addr.includes('inject care')) {
            return {
                customerId: '874645000000060303',
                shippingAddressId: '874645000002884001', // Vapi
                billingAddressId: '874645000000870001',
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // 4. Gotri / Lotus Plaza
        if (addr.includes('gotri') || addr.includes('lotus plaza')) {
            return {
                customerId: '874645000000060303',
                shippingAddressId: '874645000000870001', // Gotri
                billingAddressId: '874645000000870001',
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // 5. Boisar / Tarapur
        if (addr.includes('boisar') || addr.includes('tarapur') || addr.includes('palghar') || addr.includes('maharashtra') || addr.includes('401506')) {
            return {
                customerId: '874645000000060293', // BDR PHARMACEUTICALS INTERNATIONAL PRIVATE LIMITED
                shippingAddressId: '874645000000814001',
                billingAddressId: '874645000000814001',
                placeOfSupply: 'MH',
                isInterState: false,
            };
        }
        // General Gujarat / Baroda fallback -> Padra
        if (addr.includes('gujarat') || addr.includes('baroda') || addr.includes('vadodara')) {
            return {
                customerId: '874645000000060303',
                shippingAddressId: '874645000000060307', // Padra
                billingAddressId: '874645000000870001',
                placeOfSupply: 'GJ',
                isInterState: true,
            };
        }
        // Default Printers BDR
        return {
            customerId: '874645000000060293',
            shippingAddressId: '874645000000814001',
            billingAddressId: '874645000000814001',
            placeOfSupply: 'MH',
            isInterState: false,
        };
    }
}
