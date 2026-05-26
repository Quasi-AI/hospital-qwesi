import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import InventoryItem from '@/models/InventoryItem';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const department = searchParams.get('department');

    const query: Record<string, unknown> = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (department) query.department = department;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await InventoryItem.find(query).sort({ name: 1 });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory items' }, { status: 500 });
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
      const count = await InventoryItem.countDocuments();
      data.sku = `INV-${String(count + 1).padStart(5, '0')}`;
    }

    data.createdBy = session.user?.id || 'system';
    const item = new InventoryItem(data);
    await item.save();

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating inventory item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create inventory item';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
