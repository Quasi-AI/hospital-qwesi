import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import AmbulanceBooking from '@/models/AmbulanceBooking';
import Ambulance from '@/models/Ambulance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const booking = await AmbulanceBooking.findById(id);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error: unknown) {
    console.error('Error fetching booking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch booking';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const booking = await AmbulanceBooking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const body = await request.json();
    const now = new Date();

    // Handle status changes
    if (body.status && body.status !== booking.status) {
      const newStatus = body.status;
      
      // Update timestamps based on status
      switch (newStatus) {
        case 'confirmed':
          booking.confirmedAt = now;
          break;
        case 'dispatched':
          booking.dispatchedAt = now;
          if (booking.ambulanceId) {
            await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'en-route' });
          }
          break;
        case 'en-route-pickup':
          if (booking.ambulanceId) {
            await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'en-route' });
          }
          break;
        case 'at-pickup':
          booking.arrivedAtPickupAt = now;
          if (booking.ambulanceId) {
            await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'at-scene' });
          }
          break;
        case 'patient-loaded':
          booking.patientLoadedAt = now;
          if (booking.ambulanceId) {
            await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'transporting' });
          }
          break;
        case 'en-route-destination':
          if (booking.ambulanceId) {
            await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'transporting' });
          }
          break;
        case 'arrived':
          booking.arrivedAtDestinationAt = now;
          if (booking.ambulanceId) {
            await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'at-hospital' });
          }
          break;
        case 'completed':
          booking.completedAt = now;
          // Calculate actual duration
          if (booking.dispatchedAt) {
            booking.actualDuration = Math.round((now.getTime() - new Date(booking.dispatchedAt).getTime()) / 60000);
          }
          // Release ambulance
          if (booking.ambulanceId) {
            await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'available' });
          }
          break;
        case 'cancelled':
          booking.cancelledAt = now;
          booking.cancellationReason = body.cancellationReason;
          // Release ambulance
          if (booking.ambulanceId) {
            await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'available' });
          }
          break;
      }
      
      booking.status = newStatus;
    }

    // Handle ambulance assignment
    if (body.ambulanceId && body.ambulanceId !== booking.ambulanceId?.toString()) {
      const ambulance = await Ambulance.findById(body.ambulanceId);
      if (ambulance) {
        // Release old ambulance if any
        if (booking.ambulanceId) {
          await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'available' });
        }
        
        // Assign new ambulance
        booking.ambulanceId = body.ambulanceId;
        booking.ambulanceNumber = ambulance.vehicleNumber;
        booking.ambulanceType = ambulance.vehicleType;
        booking.driverName = ambulance.driverName;
        booking.driverPhone = ambulance.driverPhone;
        booking.paramedicName = ambulance.paramedicName;
        booking.paramedicPhone = ambulance.paramedicPhone;
        booking.baseCharge = ambulance.baseCharge;
        
        // Update ambulance status
        ambulance.status = 'on-call';
        await ambulance.save();
        
        if (booking.status === 'pending') {
          booking.status = 'confirmed';
          booking.confirmedAt = now;
        }
      }
    }

    // Add tracking update
    if (body.trackingUpdate) {
      booking.trackingUpdates.push({
        ...body.trackingUpdate,
        timestamp: now,
        status: booking.status,
      });
      
      // Update ambulance location
      if (booking.ambulanceId) {
        await Ambulance.findByIdAndUpdate(booking.ambulanceId, {
          currentLocation: {
            latitude: body.trackingUpdate.latitude,
            longitude: body.trackingUpdate.longitude,
            address: body.trackingUpdate.address,
            updatedAt: now,
          }
        });
      }
    }

    // Update other fields
    const updateFields = [
      'patientName', 'patientPhone', 'patientAge', 'patientGender',
      'emergencyContact', 'emergencyContactPhone',
      'pickupAddress', 'pickupLatitude', 'pickupLongitude', 'pickupLandmark',
      'destinationAddress', 'destinationLatitude', 'destinationLongitude', 'destinationType',
      'priority', 'medicalCondition', 'specialRequirements',
      'requiresOxygen', 'requiresStretcher', 'requiresWheelchair',
      'actualDistance', 'distanceCharge', 'additionalCharges', 'totalCharge',
      'billingStatus', 'notes'
    ];

    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        (booking as Record<string, unknown>)[field] = body[field];
      }
    });

    // Recalculate total charge
    if (body.actualDistance !== undefined || body.distanceCharge !== undefined || body.additionalCharges !== undefined) {
      booking.totalCharge = (booking.baseCharge || 0) + (booking.distanceCharge || 0) + (booking.additionalCharges || 0);
    }

    await booking.save();

    return NextResponse.json(booking);
  } catch (error: unknown) {
    console.error('Error updating booking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update booking';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete bookings
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete bookings' }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const booking = await AmbulanceBooking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Release ambulance if assigned
    if (booking.ambulanceId) {
      await Ambulance.findByIdAndUpdate(booking.ambulanceId, { status: 'available' });
    }

    await AmbulanceBooking.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Booking deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting booking:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete booking';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
