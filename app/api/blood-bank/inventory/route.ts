import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodInventory from '@/models/BloodInventory';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const bloodGroup = searchParams.get('bloodGroup');
    const component = searchParams.get('component');
    const status = searchParams.get('status');
    const testingStatus = searchParams.get('testingStatus');
    const search = searchParams.get('search');
    const availableOnly = searchParams.get('availableOnly');
    const expiringWithin = searchParams.get('expiringWithin'); // days

    const query: Record<string, unknown> = {};

    if (bloodGroup && bloodGroup !== 'all') {
      query.bloodGroup = bloodGroup;
    }

    if (component && component !== 'all') {
      query.component = component;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (testingStatus && testingStatus !== 'all') {
      query.testingStatus = testingStatus;
    }

    if (availableOnly === 'true') {
      query.status = 'available';
      query.testingStatus = 'cleared';
    }

    if (expiringWithin) {
      const days = parseInt(expiringWithin);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      query.expiryDate = { $lte: futureDate, $gte: new Date() };
      query.status = { $nin: ['expired', 'discarded', 'issued'] };
    }

    if (search) {
      query.$or = [
        { unitNumber: { $regex: search, $options: 'i' } },
        { bagNumber: { $regex: search, $options: 'i' } },
        { donorName: { $regex: search, $options: 'i' } },
        { storageLocation: { $regex: search, $options: 'i' } },
      ];
    }

    const inventory = await BloodInventory.find(query)
      .sort({ expiryDate: 1, createdAt: -1 })
      .limit(500);

    return NextResponse.json(inventory);
  } catch (error: unknown) {
    console.error('Error fetching blood inventory:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blood inventory';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();

    if (!body.bloodGroup || !body.component || !body.bagNumber || !body.storageLocation) {
      return NextResponse.json(
        { error: 'Blood group, component, bag number, and storage location are required' },
        { status: 400 }
      );
    }

    // Generate unit number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await BloodInventory.countDocuments({
      createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) }
    });
    const unitNumber = `BU-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Check for duplicate
    const existing = await BloodInventory.findOne({ unitNumber });
    if (existing) {
      return NextResponse.json(
        { error: 'A blood unit with this number already exists' },
        { status: 400 }
      );
    }

    // Calculate expiry date based on component
    let expiryDays = 35; // Default for whole blood
    switch (body.component) {
      case 'packed-rbc':
        expiryDays = 42;
        break;
      case 'platelets':
        expiryDays = 5;
        break;
      case 'plasma':
        expiryDays = 365;
        break;
      case 'cryoprecipitate':
        expiryDays = 365;
        break;
    }

    const collectionDate = body.collectionDate ? new Date(body.collectionDate) : new Date();
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : new Date(collectionDate.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    const inventoryItem = new BloodInventory({
      ...body,
      unitNumber,
      collectionDate,
      donationDate: body.donationDate || collectionDate,
      expiryDate,
      status: 'quarantine', // Start in quarantine until cleared
      testingStatus: 'pending',
      createdBy: session.user?.email || 'Unknown',
    });

    await inventoryItem.save();

    return NextResponse.json(inventoryItem, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating blood inventory item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create blood inventory item';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
