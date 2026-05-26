import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import connectDB from '../../../../lib/mongodb';
import LabDevice from '../../../../models/LabDevice';
import { deviceProfiles, getDeviceProfile } from '../../../../lib/device-profiles';

// Helper to generate API key
function generateApiKey(): { apiKey: string; apiKeyHash: string; apiKeyPrefix: string } {
  const randomBytes = crypto.randomBytes(32);
  const apiKey = `dk_${randomBytes.toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyPrefix = apiKey.substring(0, 11) + '...';
  return { apiKey, apiKeyHash, apiKeyPrefix };
}

// GET - List all lab devices or get device profiles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Return device profiles for dropdown
    if (action === 'profiles') {
      return NextResponse.json({ profiles: deviceProfiles });
    }

    // Return manufacturers for dropdown
    if (action === 'manufacturers') {
      const manufacturers = [...new Set(deviceProfiles.map(p => p.manufacturer))].sort();
      return NextResponse.json({ manufacturers });
    }

    // Return categories for dropdown
    if (action === 'categories') {
      const categories = [
        { id: 'hematology', name: 'Hematology' },
        { id: 'biochemistry', name: 'Biochemistry / Chemistry' },
        { id: 'immunology', name: 'Immunoassay' },
        { id: 'urinalysis', name: 'Urinalysis' },
        { id: 'coagulation', name: 'Coagulation' },
        { id: 'bloodgas', name: 'Blood Gas' },
        { id: 'electrolyte', name: 'Electrolyte' },
        { id: 'esr', name: 'ESR' },
        { id: 'hba1c', name: 'HbA1c' },
        { id: 'microbiology', name: 'Microbiology' },
        { id: 'poc', name: 'Point of Care' },
        { id: 'other', name: 'Other' },
      ];
      return NextResponse.json({ categories });
    }

    await connectDB();

    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const manufacturer = searchParams.get('manufacturer');
    const search = searchParams.get('search');

    // Build query
    const query: any = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (manufacturer && manufacturer !== 'all') {
      query.manufacturer = { $regex: manufacturer, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { deviceCode: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ];
    }

    // Update connection status based on last seen time
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await LabDevice.updateMany(
      { lastSeenAt: { $lt: fiveMinutesAgo }, connectionStatus: 'online' },
      { $set: { connectionStatus: 'offline' } }
    );

    const devices = await LabDevice.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Get stats
    const [totalDevices, activeDevices, onlineDevices] = await Promise.all([
      LabDevice.countDocuments(),
      LabDevice.countDocuments({ isActive: true }),
      LabDevice.countDocuments({ connectionStatus: 'online', isActive: true }),
    ]);

    return NextResponse.json({
      devices,
      stats: {
        total: totalDevices,
        active: activeDevices,
        online: onlineDevices,
        offline: activeDevices - onlineDevices,
      },
    });
  } catch (error) {
    console.error('Error fetching lab devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab devices' },
      { status: 500 }
    );
  }
}

// POST - Create a new lab device
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { profileId, deviceCode, name, manufacturer, model, serialNumber, category, location, notes, customMappings } = body;

    // Check if device code already exists
    const existingDevice = await LabDevice.findOne({ deviceCode: deviceCode.toUpperCase() });
    if (existingDevice) {
      return NextResponse.json(
        { error: 'Device code already exists' },
        { status: 400 }
      );
    }

    // Generate API key
    const { apiKey, apiKeyHash, apiKeyPrefix } = generateApiKey();

    // Get parameter mappings from profile or custom
    let parameterMappings = [];
    let isCustomProfile = false;
    let profileName = '';

    if (profileId) {
      const profile = getDeviceProfile(profileId);
      if (profile) {
        parameterMappings = profile.parameters;
        profileName = `${profile.manufacturer} ${profile.model}`;
      }
    } else if (customMappings && customMappings.length > 0) {
      parameterMappings = customMappings;
      isCustomProfile = true;
      profileName = 'Custom Profile';
    }

    const device = new LabDevice({
      deviceCode: deviceCode.toUpperCase(),
      name,
      profileId,
      profileName,
      isCustomProfile,
      manufacturer,
      model,
      serialNumber,
      category,
      location,
      apiKeyHash,
      apiKeyPrefix,
      apiKeyGeneratedAt: new Date(),
      parameterMappings,
      notes,
      createdBy: session.user?.email || 'system',
    });

    await device.save();

    // Return the API key ONCE (it won't be retrievable again)
    return NextResponse.json({
      device: {
        ...device.toObject(),
        apiKey, // Include the actual API key in the response (only time it's shown)
      },
      message: 'Device created successfully. Save the API key - it will not be shown again.',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lab device:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lab device' },
      { status: 500 }
    );
  }
}
