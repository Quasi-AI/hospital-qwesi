import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import ServiceItem from '../../../../../models/ServiceItem';

// GET - Fetch a single service item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const serviceItem = await ServiceItem.findById(id).lean();

    if (!serviceItem) {
      return NextResponse.json(
        { error: 'Service item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ serviceItem });
  } catch (error: any) {
    console.error('Error fetching service item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch service item' },
      { status: 500 }
    );
  }
}

// PUT - Update a service item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const { name, description, unitPrice, serviceType, isActive } = body;

    const serviceItem = await ServiceItem.findById(id);

    if (!serviceItem) {
      return NextResponse.json(
        { error: 'Service item not found' },
        { status: 404 }
      );
    }

    if (name !== undefined) serviceItem.name = name;
    if (description !== undefined) serviceItem.description = description;
    if (unitPrice !== undefined) serviceItem.unitPrice = parseFloat(unitPrice);
    if (serviceType !== undefined) serviceItem.serviceType = serviceType;
    if (isActive !== undefined) serviceItem.isActive = isActive;

    await serviceItem.save();

    return NextResponse.json({
      serviceItem,
      message: 'Service item updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating service item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update service item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a service item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const serviceItem = await ServiceItem.findByIdAndDelete(id);

    if (!serviceItem) {
      return NextResponse.json(
        { error: 'Service item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Service item deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting service item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete service item' },
      { status: 500 }
    );
  }
}
