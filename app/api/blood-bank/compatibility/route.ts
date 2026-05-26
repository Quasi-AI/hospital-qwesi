import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// Blood compatibility matrix
// Key: Recipient blood group
// Value: Array of compatible donor blood groups
const WHOLE_BLOOD_COMPATIBILITY: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Universal donor
};

// For plasma, compatibility is reversed
const PLASMA_COMPATIBILITY: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'AB+', 'AB-'],
  'A-': ['A-', 'AB-'],
  'B+': ['B+', 'B-', 'AB+', 'AB-'],
  'B-': ['B-', 'AB-'],
  'AB+': ['AB+'],
  'AB-': ['AB-'], // Universal donor for plasma
  'O+': ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'], // Universal recipient for plasma
  'O-': ['A-', 'B-', 'AB-', 'O-'],
};

// Platelet compatibility (similar to RBC but can be more flexible in emergencies)
const PLATELET_COMPATIBILITY: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipientBloodGroup = searchParams.get('recipientBloodGroup');
    const component = searchParams.get('component') || 'whole-blood';

    if (!recipientBloodGroup) {
      return NextResponse.json(
        { error: 'Recipient blood group is required' },
        { status: 400 }
      );
    }

    let compatibilityMatrix: Record<string, string[]>;
    
    switch (component) {
      case 'plasma':
      case 'cryoprecipitate':
        compatibilityMatrix = PLASMA_COMPATIBILITY;
        break;
      case 'platelets':
        compatibilityMatrix = PLATELET_COMPATIBILITY;
        break;
      default:
        compatibilityMatrix = WHOLE_BLOOD_COMPATIBILITY;
    }

    const compatibleGroups = compatibilityMatrix[recipientBloodGroup];

    if (!compatibleGroups) {
      return NextResponse.json(
        { error: 'Invalid blood group' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      recipientBloodGroup,
      component,
      compatibleDonorGroups: compatibleGroups,
      preferredGroup: recipientBloodGroup, // Same group is always preferred
      emergencyGroup: component === 'plasma' ? 'AB-' : 'O-', // Universal donor
    });
  } catch (error: unknown) {
    console.error('Error checking compatibility:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check compatibility';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientBloodGroup, donorBloodGroup, component } = body;

    if (!recipientBloodGroup || !donorBloodGroup) {
      return NextResponse.json(
        { error: 'Both recipient and donor blood groups are required' },
        { status: 400 }
      );
    }

    let compatibilityMatrix: Record<string, string[]>;
    
    switch (component) {
      case 'plasma':
      case 'cryoprecipitate':
        compatibilityMatrix = PLASMA_COMPATIBILITY;
        break;
      case 'platelets':
        compatibilityMatrix = PLATELET_COMPATIBILITY;
        break;
      default:
        compatibilityMatrix = WHOLE_BLOOD_COMPATIBILITY;
    }

    const compatibleGroups = compatibilityMatrix[recipientBloodGroup];

    if (!compatibleGroups) {
      return NextResponse.json(
        { error: 'Invalid recipient blood group' },
        { status: 400 }
      );
    }

    const isCompatible = compatibleGroups.includes(donorBloodGroup);
    const isIdentical = recipientBloodGroup === donorBloodGroup;

    return NextResponse.json({
      recipientBloodGroup,
      donorBloodGroup,
      component: component || 'whole-blood',
      isCompatible,
      isIdentical,
      compatibilityLevel: isIdentical ? 'identical' : isCompatible ? 'compatible' : 'incompatible',
      recommendation: isIdentical 
        ? 'Identical blood type - ideal match' 
        : isCompatible 
          ? 'Compatible - safe for transfusion after crossmatch' 
          : 'INCOMPATIBLE - DO NOT TRANSFUSE',
      requiresCrossmatch: true,
    });
  } catch (error: unknown) {
    console.error('Error checking compatibility:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check compatibility';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
