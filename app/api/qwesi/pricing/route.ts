import { NextResponse } from 'next/server';
import { qwesiPaygItems, qwesiSubscriptionPlans } from '@/lib/qwesi-pricing';

export async function GET() {
  return NextResponse.json({
    payg: qwesiPaygItems,
    subscriptions: qwesiSubscriptionPlans,
  });
}
