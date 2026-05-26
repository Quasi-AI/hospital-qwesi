import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Supplier from '@/models/Supplier';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const supplyType = searchParams.get('supplyType');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (supplyType) query.supplyType = supplyType;
    if (isActive !== null && isActive !== '') query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const data = await request.json();

    // Generate code if not provided
    if (!data.code) {
      const count = await Supplier.countDocuments();
      data.code = `SUP-${String(count + 1).padStart(4, '0')}`;
    }

    data.createdBy = session.user?.id || 'system';
    const supplier = new Supplier(data);
    await supplier.save();

    return NextResponse.json(supplier, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating supplier:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create supplier';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
