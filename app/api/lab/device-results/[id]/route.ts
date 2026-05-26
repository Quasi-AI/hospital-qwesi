import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '../../../../../lib/mongodb';
import DeviceResult from '../../../../../models/DeviceResult';
import LabTest from '../../../../../models/LabTest';

// GET - Get a single device result
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const result = await DeviceResult.findById(id).lean();

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // If matched, fetch the lab test details
    let labTest = null;
    if (result.matchedLabTestId) {
      labTest = await LabTest.findById(result.matchedLabTestId).lean();
    }

    return NextResponse.json({ result, labTest });
  } catch (error) {
    console.error('Error fetching device result:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device result' },
      { status: 500 }
    );
  }
}

// PUT - Update a device result (approve, reject, match, edit)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { action, labTestId, results, notes, rejectionReason } = body;

    const deviceResult = await DeviceResult.findById(id);
    if (!deviceResult) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Handle different actions
    switch (action) {
      case 'approve':
        // Approve and apply results to lab test
        if (!deviceResult.matchedLabTestId && !labTestId) {
          return NextResponse.json(
            { error: 'No lab test matched. Please manually match first.' },
            { status: 400 }
          );
        }

        const targetLabTestId = labTestId || deviceResult.matchedLabTestId;
        const labTest = await LabTest.findById(targetLabTestId);
        
        if (!labTest) {
          return NextResponse.json(
            { error: 'Lab test not found' },
            { status: 404 }
          );
        }

        // Use edited results if provided, otherwise use original
        const resultsToApply = results || deviceResult.results;

        // Convert device results to lab test results format
        const labResults = resultsToApply.map((r: any) => ({
          testName: r.parameterName,
          value: r.value,
          unit: r.unit || '',
          normalRange: r.normalRange || '',
          status: r.flag === 'critical-low' || r.flag === 'critical-high' ? 'critical' :
                  r.flag === 'low' || r.flag === 'high' ? 'abnormal' : 'normal',
          notes: '',
        }));

        // Update lab test with results
        labTest.results = labResults;
        labTest.status = 'completed';
        labTest.completedAt = new Date();
        labTest.isCritical = deviceResult.hasCriticalValues;
        
        await labTest.save();

        // Update device result status
        deviceResult.status = 'applied';
        deviceResult.reviewedBy = session.user?.email;
        deviceResult.reviewerName = session.user?.name || session.user?.email;
        deviceResult.reviewedAt = new Date();
        deviceResult.appliedAt = new Date();
        deviceResult.matchedLabTestId = targetLabTestId;
        deviceResult.matchedTestNumber = labTest.testNumber;
        if (notes) deviceResult.notes = notes;
        
        await deviceResult.save();

        return NextResponse.json({
          message: 'Results approved and applied to lab test',
          deviceResult,
          labTest,
        });

      case 'reject':
        deviceResult.status = 'rejected';
        deviceResult.reviewedBy = session.user?.email;
        deviceResult.reviewerName = session.user?.name || session.user?.email;
        deviceResult.reviewedAt = new Date();
        deviceResult.rejectionReason = rejectionReason || 'Rejected by technician';
        if (notes) deviceResult.notes = notes;
        
        await deviceResult.save();

        return NextResponse.json({
          message: 'Results rejected',
          deviceResult,
        });

      case 'match':
        // Manually match to a lab test
        if (!labTestId) {
          return NextResponse.json(
            { error: 'labTestId is required for manual matching' },
            { status: 400 }
          );
        }

        const matchLabTest = await LabTest.findById(labTestId);
        if (!matchLabTest) {
          return NextResponse.json(
            { error: 'Lab test not found' },
            { status: 404 }
          );
        }

        deviceResult.matchedLabTestId = labTestId;
        deviceResult.matchedTestNumber = matchLabTest.testNumber;
        deviceResult.matchStatus = 'manual';
        deviceResult.matchConfidence = 100;
        deviceResult.patientName = matchLabTest.patientName;
        
        await deviceResult.save();

        return NextResponse.json({
          message: 'Result manually matched to lab test',
          deviceResult,
        });

      case 'edit':
        // Edit results before approval
        if (results) {
          deviceResult.results = results;
          // Recalculate critical values flag
          deviceResult.hasCriticalValues = results.some((r: any) => 
            r.flag === 'critical-low' || r.flag === 'critical-high'
          );
        }
        if (notes) deviceResult.notes = notes;
        
        await deviceResult.save();

        return NextResponse.json({
          message: 'Results updated',
          deviceResult,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: approve, reject, match, or edit' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error updating device result:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update device result' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a device result
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const result = await DeviceResult.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Error deleting device result:', error);
    return NextResponse.json(
      { error: 'Failed to delete device result' },
      { status: 500 }
    );
  }
}
