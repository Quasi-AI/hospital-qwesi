import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import connectDB from '../../../../lib/mongodb';
import ImagingDevice from '../../../../models/ImagingDevice';
import { 
  imagingDeviceProfiles, 
  getImagingProfile, 
  getImagingManufacturers,
  getImagingCategories 
} from '../../../../lib/imaging-device-profiles';

// Helper to generate API key
function generateApiKey(): { apiKey: string; apiKeyHash: string; apiKeyPrefix: string } {
  const randomBytes = crypto.randomBytes(32);
  const apiKey = `img_${randomBytes.toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyPrefix = apiKey.substring(0, 12) + '...';
  return { apiKey, apiKeyHash, apiKeyPrefix };
}

// GET - List all imaging devices or get device profiles
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
      return NextResponse.json({ profiles: imagingDeviceProfiles });
    }

    // Return manufacturers for dropdown
    if (action === 'manufacturers') {
      const manufacturers = getImagingManufacturers();
      return NextResponse.json({ manufacturers });
    }

    // Return categories for dropdown
    if (action === 'categories') {
      const categories = getImagingCategories();
      return NextResponse.json({ categories });
    }

    // Return modalities for dropdown
    if (action === 'modalities') {
      const modalities = [
        { id: 'CR', name: 'Computed Radiography' },
        { id: 'CT', name: 'CT Scan' },
        { id: 'MR', name: 'MRI' },
        { id: 'US', name: 'Ultrasound' },
        { id: 'MG', name: 'Mammography' },
        { id: 'XA', name: 'X-Ray Angiography' },
        { id: 'DX', name: 'Digital X-Ray' },
        { id: 'NM', name: 'Nuclear Medicine' },
        { id: 'PT', name: 'PET Scan' },
        { id: 'RF', name: 'Fluoroscopy' },
        { id: 'OT', name: 'Other' },
      ];
      return NextResponse.json({ modalities });
    }

    await connectDB();

    const status = searchParams.get('status');
    const modality = searchParams.get('modality');
    const manufacturer = searchParams.get('manufacturer');
    const search = searchParams.get('search');

    // Build query
    const query: Record<string, unknown> = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (modality && modality !== 'all') {
      query.$or = [
        { modality: modality },
        { supportedModalities: modality }
      ];
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
        { aeTitle: { $regex: search, $options: 'i' } },
      ];
    }

    // Update connection status based on last seen time
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await ImagingDevice.updateMany(
      { lastSeenAt: { $lt: fiveMinutesAgo }, connectionStatus: 'online' },
      { $set: { connectionStatus: 'offline' } }
    );

    const devices = await ImagingDevice.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Get stats
    const [totalDevices, activeDevices, onlineDevices] = await Promise.all([
      ImagingDevice.countDocuments(),
      ImagingDevice.countDocuments({ isActive: true }),
      ImagingDevice.countDocuments({ connectionStatus: 'online', isActive: true }),
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
    console.error('Error fetching imaging devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch imaging devices' },
      { status: 500 }
    );
  }
}

// POST - Create a new imaging device
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { 
      profileId, 
      deviceCode, 
      name, 
      aeTitle,
      manufacturer, 
      model, 
      serialNumber, 
      modality,
      supportedModalities,
      location, 
      notes 
    } = body;

    // Validate required fields
    if (!deviceCode || !name || !aeTitle || !manufacturer || !model || !modality) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if device code already exists
    const existingDevice = await ImagingDevice.findOne({ 
      $or: [
        { deviceCode: deviceCode.toUpperCase() },
        { aeTitle: aeTitle.toUpperCase() }
      ]
    });
    if (existingDevice) {
      return NextResponse.json(
        { error: 'Device code or AE Title already exists' },
        { status: 400 }
      );
    }

    // Generate API key
    const { apiKey, apiKeyHash, apiKeyPrefix } = generateApiKey();

    // Get profile info if selected
    let profileName = '';
    let isCustomProfile = true;
    let deviceModalities = supportedModalities || [modality];

    if (profileId) {
      const profile = getImagingProfile(profileId);
      if (profile) {
        profileName = `${profile.manufacturer} ${profile.model}`;
        isCustomProfile = false;
        deviceModalities = profile.supportedModalities;
      }
    }

    const device = new ImagingDevice({
      deviceCode: deviceCode.toUpperCase(),
      name,
      aeTitle: aeTitle.toUpperCase(),
      profileId,
      profileName,
      isCustomProfile,
      manufacturer,
      model,
      serialNumber,
      modality,
      supportedModalities: deviceModalities,
      location,
      apiKeyHash,
      apiKeyPrefix,
      apiKeyGeneratedAt: new Date(),
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
  } catch (error: unknown) {
    console.error('Error creating imaging device:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create imaging device';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
