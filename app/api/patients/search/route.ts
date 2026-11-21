import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import Patient from '../../../../models/Patient';
import { forbidden, getPatientScope, patientFilterForScope, unauthorized } from '@/lib/patient-access';

export async function GET(request: NextRequest) {
  try {
    const { user, scope } = await getPatientScope();
    if (!user) return unauthorized();
    if (scope.kind === 'none' || scope.kind === 'self') return forbidden();
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10') || 10);
    
    let searchFilter = {};
    
    if (query.trim()) {
      // Search by name, email, phone, or patientId
      searchFilter = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
          { patientId: { $regex: query, $options: 'i' } }
        ]
      };
    }
    
    const patients = await Patient.find({ $and: [searchFilter, patientFilterForScope(scope)] })
      .select('_id patientId name email phone dateOfBirth gender')
      .limit(limit)
      .sort({ name: 1 });
    
    return NextResponse.json(patients);
  } catch (error) {
    console.error('Error searching patients:', error);
    return NextResponse.json(
      { error: 'Failed to search patients' },
      { status: 500 }
    );
  }
}
