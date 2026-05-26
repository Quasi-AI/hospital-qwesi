import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import connectDB from '../../../../../lib/mongodb';
import LabDevice from '../../../../../models/LabDevice';
import { getDeviceProfile } from '../../../../../lib/device-profiles';

// Helper to generate API key
function generateApiKey(): { apiKey: string; apiKeyHash: string; apiKeyPrefix: string } {
  const randomBytes = crypto.randomBytes(32);
  const apiKey = `dk_${randomBytes.toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyPrefix = apiKey.substring(0, 11) + '...';
  return { apiKey, apiKeyHash, apiKeyPrefix };
}

// GET - Get a single lab device
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
    const device = await LabDevice.findById(id).lean();

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Update connection status based on last seen time
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let connectionStatus = device.connectionStatus;
    if (device.lastSeenAt) {
      connectionStatus = new Date(device.lastSeenAt) >= fiveMinutesAgo ? 'online' : 'offline';
    }

    return NextResponse.json({
      device: {
        ...device,
        connectionStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching lab device:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lab device' },
      { status: 500 }
    );
  }
}

// PUT - Update a lab device
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

    const device = await LabDevice.findById(id);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Handle API key regeneration
    if (body.regenerateApiKey) {
      const { apiKey, apiKeyHash, apiKeyPrefix } = generateApiKey();
      device.apiKeyHash = apiKeyHash;
      device.apiKeyPrefix = apiKeyPrefix;
      device.apiKeyGeneratedAt = new Date();
      await device.save();

      return NextResponse.json({
        device: device.toObject(),
        apiKey, // Return the new API key (only time it's shown)
        message: 'API key regenerated successfully. Save the new API key - it will not be shown again.',
      });
    }

    // Handle profile change
    if (body.profileId && body.profileId !== device.profileId) {
      const profile = getDeviceProfile(body.profileId);
      if (profile) {
        device.profileId = body.profileId;
        device.profileName = `${profile.manufacturer} ${profile.model}`;
        device.parameterMappings = profile.parameters;
        device.isCustomProfile = false;
      }
    }

    // Handle custom mappings
    if (body.customMappings) {
      device.parameterMappings = body.customMappings;
      device.isCustomProfile = true;
      device.profileName = 'Custom Profile';
    }

    // Update other fields
    const updateFields = ['name', 'manufacturer', 'model', 'serialNumber', 'category', 'location', 'notes', 'isActive'];
    updateFields.forEach(field => {
      if (body[field] !== undefined) {
        (device as any)[field] = body[field];
      }
    });

    await device.save();

    return NextResponse.json({ device });
  } catch (error: any) {
    console.error('Error updating lab device:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lab device' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a lab device
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
    const device = await LabDevice.findByIdAndDelete(id);

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab device:', error);
    return NextResponse.json(
      { error: 'Failed to delete lab device' },
      { status: 500 }
    );
  }
}
