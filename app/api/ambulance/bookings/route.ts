import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import AmbulanceBooking from '@/models/AmbulanceBooking';
import Ambulance from '@/models/Ambulance';
import { getSystemCurrency } from '@/lib/getSystemCurrency';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const bookingType = searchParams.get('bookingType');
    const activeOnly = searchParams.get('activeOnly');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (bookingType && bookingType !== 'all') {
      query.bookingType = bookingType;
    }

    // Active bookings (not completed or cancelled)
    if (activeOnly === 'true') {
      query.status = { 
        $nin: ['completed', 'cancelled'] 
      };
    }

    if (search) {
      query.$or = [
        { bookingNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { patientPhone: { $regex: search, $options: 'i' } },
        { pickupAddress: { $regex: search, $options: 'i' } },
      ];
    }

    const bookings = await AmbulanceBooking.find(query)
      .sort({ requestedAt: -1 })
      .limit(200);

    return NextResponse.json(bookings);
  } catch (error: unknown) {
    console.error('Error fetching ambulance bookings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bookings';
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

    // Validate required fields
    if (!body.patientName || !body.patientPhone || !body.pickupAddress || !body.destinationAddress || !body.bookingType) {
      return NextResponse.json(
        { error: 'Patient name, phone, pickup address, destination, and booking type are required' },
        { status: 400 }
      );
    }

    // Generate booking number
    const count = await AmbulanceBooking.countDocuments();
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const bookingNumber = `AMB-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;

    // Calculate charges if ambulance is assigned
    let baseCharge = 0;
    let ambulanceDetails: Record<string, unknown> = {};
    
    if (body.ambulanceId) {
      const ambulance = await Ambulance.findById(body.ambulanceId);
      if (ambulance) {
        baseCharge = ambulance.baseCharge;
        ambulanceDetails = {
          ambulanceNumber: ambulance.vehicleNumber,
          ambulanceType: ambulance.vehicleType,
          driverName: ambulance.driverName,
          driverPhone: ambulance.driverPhone,
          paramedicName: ambulance.paramedicName,
          paramedicPhone: ambulance.paramedicPhone,
        };
        
        // Update ambulance status
        ambulance.status = 'on-call';
        await ambulance.save();
      }
    }

    const systemCurrency = await getSystemCurrency();

    const booking = new AmbulanceBooking({
      bookingNumber,
      patientId: body.patientId,
      patientName: body.patientName,
      patientPhone: body.patientPhone,
      patientAge: body.patientAge,
      patientGender: body.patientGender,
      emergencyContact: body.emergencyContact,
      emergencyContactPhone: body.emergencyContactPhone,
      pickupAddress: body.pickupAddress,
      pickupLatitude: body.pickupLatitude,
      pickupLongitude: body.pickupLongitude,
      pickupLandmark: body.pickupLandmark,
      destinationAddress: body.destinationAddress,
      destinationLatitude: body.destinationLatitude,
      destinationLongitude: body.destinationLongitude,
      destinationType: body.destinationType || 'hospital',
      bookingType: body.bookingType,
      scheduledDateTime: body.scheduledDateTime ? new Date(body.scheduledDateTime) : undefined,
      priority: body.priority || 'normal',
      medicalCondition: body.medicalCondition,
      specialRequirements: body.specialRequirements || [],
      requiresOxygen: body.requiresOxygen || false,
      requiresStretcher: body.requiresStretcher || true,
      requiresWheelchair: body.requiresWheelchair || false,
      ambulanceId: body.ambulanceId,
      ...ambulanceDetails,
      status: body.ambulanceId ? 'confirmed' : 'pending',
      confirmedAt: body.ambulanceId ? new Date() : undefined,
      requestedAt: new Date(),
      baseCharge,
      totalCharge: baseCharge,
      currency: systemCurrency,
      emergencyCaseId: body.emergencyCaseId,
      notes: body.notes,
      createdBy: session.user?.email || 'Unknown',
    });

    await booking.save();

    return NextResponse.json(booking, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating ambulance booking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create booking';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
