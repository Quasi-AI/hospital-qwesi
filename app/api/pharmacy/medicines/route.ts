import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Medicine from '@/models/Medicine';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');
    const expiringSoon = searchParams.get('expiringSoon');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    const query: Record<string, unknown> = {};

    if (category) query.category = category;
    if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';
    if (lowStock === 'true') query.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expiryDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const medicines = await Medicine.find(query).sort({ name: 1 });
    return NextResponse.json(medicines);
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return NextResponse.json({ error: 'Failed to fetch medicines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const data = await request.json();

    // Generate SKU if not provided
    if (!data.sku) {
      const count = await Medicine.countDocuments();
      data.sku = `MED-${String(count + 1).padStart(5, '0')}`;
    }

    data.createdBy = session.user?.id || 'system';
    const medicine = new Medicine(data);
    await medicine.save();

    return NextResponse.json(medicine, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating medicine:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create medicine';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
