'use client';

import OrderFormV2 from '@/components/OrderFormV2';
import { Suspense } from 'react';

export default function NewOrderV2Page() {
    return (
        <div className="py-6">
            <Suspense fallback={<div>Loading form...</div>}>
                <OrderFormV2 />
            </Suspense>
        </div>
    );
}
