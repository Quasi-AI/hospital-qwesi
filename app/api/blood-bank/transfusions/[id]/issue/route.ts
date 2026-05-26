import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodTransfusion from '@/models/BloodTransfusion';
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

    const transfusion = await BloodTransfusion.findById(id);
    if (!transfusion) {
      return NextResponse.json({ error: 'Transfusion request not found' }, { status: 404 });
    }

    if (!['approved', 'cross-matching', 'ready'].includes(transfusion.status)) {
      return NextResponse.json(
        { error: 'Transfusion must be approved before issuing blood units' },
        { status: 400 }
      );
    }

    const { unitIds } = body;
    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one blood unit ID is required' },
        { status: 400 }
      );
    }

    const issuedUnits = [];

    for (const unitId of unitIds) {
      const unit = await BloodInventory.findById(unitId);
      
      if (!unit) {
        return NextResponse.json(
          { error: `Blood unit ${unitId} not found` },
          { status: 404 }
        );
      }

      if (unit.status !== 'available') {
        return NextResponse.json(
          { error: `Blood unit ${unit.unitNumber} is not available (current status: ${unit.status})` },
          { status: 400 }
        );
      }

      if (unit.testingStatus !== 'cleared') {
        return NextResponse.json(
          { error: `Blood unit ${unit.unitNumber} has not been cleared for use` },
          { status: 400 }
        );
      }

      if (new Date(unit.expiryDate) < new Date()) {
        return NextResponse.json(
          { error: `Blood unit ${unit.unitNumber} has expired` },
          { status: 400 }
        );
      }

      // Update inventory item
      await BloodInventory.findByIdAndUpdate(unitId, {
        $set: {
          status: 'issued',
          issuedTo: {
            patientId: transfusion.patientId,
            patientName: transfusion.patientName,
            issuedAt: new Date(),
            issuedBy: session.user?.email || 'Unknown',
            transfusionId: transfusion._id
          }
        }
      });

      issuedUnits.push({
        unitId: unit._id,
        unitNumber: unit.unitNumber,
        bloodGroup: unit.bloodGroup,
        component: unit.component,
        volume: unit.volume,
        issuedAt: new Date(),
        status: 'issued'
      });
    }

    // Update transfusion with issued units
    const existingUnits = transfusion.bloodUnits || [];
    const updatedTransfusion = await BloodTransfusion.findByIdAndUpdate(
      id,
      {
        $set: {
          bloodUnits: [...existingUnits, ...issuedUnits],
          status: 'ready'
        }
      },
      { new: true }
    );

    return NextResponse.json({
      message: `${issuedUnits.length} blood unit(s) issued successfully`,
      transfusion: updatedTransfusion,
      issuedUnits
    });
  } catch (error: unknown) {
    console.error('Error issuing blood units:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to issue blood units';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
