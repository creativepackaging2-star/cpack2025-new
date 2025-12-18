'use client';

import OrderForm from '@/components/OrderForm';
import { Suspense } from 'react';

export default function NewOrderPage() {
    return (
        <div className="py-6">
            <Suspense fallback={<div>Loading form...</div>}>
                <OrderForm />
            </Suspense>
        </div>
    );
}
