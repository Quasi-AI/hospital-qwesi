import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import ServiceItem from '../../../../models/ServiceItem';

// GET - Fetch all service items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const serviceType = searchParams.get('serviceType');

    const query: any = {};
    if (activeOnly) {
      query.isActive = true;
    }
    if (serviceType) {
      query.serviceType = serviceType;
    }

    const serviceItems = await ServiceItem.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ serviceItems });
  } catch (error: any) {
    console.error('Error fetching service items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch service items' },
      { status: 500 }
    );
  }
}

// POST - Create a new service item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, description, unitPrice, serviceType, isActive } = body;

    if (!name || !description || unitPrice === undefined || !serviceType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const serviceItem = new ServiceItem({
      name,
      description,
      unitPrice: parseFloat(unitPrice),
      serviceType,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: session.user.id || session.user.email,
    });

    await serviceItem.save();

    return NextResponse.json(
      { serviceItem, message: 'Service item created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating service item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create service item' },
      { status: 500 }
    );
  }
}
