import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodDonor from '@/models/BloodDonor';
import BloodInventory from '@/models/BloodInventory';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const donor = await BloodDonor.findById(id);
    if (!donor) {
      return NextResponse.json({ error: 'Blood donor not found' }, { status: 404 });
    }

    // Check if donor is eligible
    if (donor.status !== 'active') {
      return NextResponse.json(
        { error: `Donor is ${donor.status}. Cannot accept donation.` },
        { status: 400 }
      );
    }

    // Check if enough time has passed since last donation (56 days for whole blood)
    if (donor.lastDonationDate) {
      const daysSinceLastDonation = Math.floor(
        (Date.now() - new Date(donor.lastDonationDate).getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysSinceLastDonation < 56) {
        return NextResponse.json(
          { error: `Donor must wait ${56 - daysSinceLastDonation} more days before next donation` },
          { status: 400 }
        );
      }
    }

    const donationDate = body.donationDate ? new Date(body.donationDate) : new Date();
    const component = body.component || 'whole-blood';
    const volume = body.volume || 450;
    const storageLocation = body.storageLocation || 'Main Blood Bank';

    // Generate unit number
    const dateStr = donationDate.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await BloodInventory.countDocuments({
      createdAt: { $gte: new Date(donationDate.setHours(0, 0, 0, 0)) }
    });
    const unitNumber = `BU-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Calculate expiry date
    let expiryDays = 35;
    switch (component) {
      case 'packed-rbc': expiryDays = 42; break;
      case 'platelets': expiryDays = 5; break;
      case 'plasma': expiryDays = 365; break;
      case 'cryoprecipitate': expiryDays = 365; break;
    }
    const expiryDate = new Date(donationDate.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    // Create blood inventory item
    const inventoryItem = new BloodInventory({
      bloodGroup: donor.bloodGroup,
      component,
      unitNumber,
      bagNumber: body.bagNumber || unitNumber,
      volume,
      donorId: donor._id,
      donorName: `${donor.firstName} ${donor.lastName}`,
      donationDate,
      collectionDate: donationDate,
      expiryDate,
      storageLocation,
      status: 'quarantine',
      testingStatus: 'pending',
      createdBy: session.user?.email || 'Unknown',
    });

    await inventoryItem.save();

    // Update donor record
    const nextEligibleDate = new Date(donationDate.getTime() + 56 * 24 * 60 * 60 * 1000);
    
    await BloodDonor.findByIdAndUpdate(id, {
      $inc: { totalDonations: 1 },
      $set: {
        lastDonationDate: donationDate,
        nextEligibleDate,
      },
      $push: {
        donations: {
          donationDate,
          unitNumber,
          volume,
          component,
          location: storageLocation,
          notes: body.notes,
        }
      }
    });

    return NextResponse.json({
      message: 'Donation recorded successfully',
      inventoryItem,
      nextEligibleDate
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error recording donation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to record donation';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
