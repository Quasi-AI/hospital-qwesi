import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import connectDB from '../../../../../lib/mongodb';
import ImagingDevice from '../../../../../models/ImagingDevice';

// Helper to generate API key
function generateApiKey(): { apiKey: string; apiKeyHash: string; apiKeyPrefix: string } {
  const randomBytes = crypto.randomBytes(32);
  const apiKey = `img_${randomBytes.toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyPrefix = apiKey.substring(0, 12) + '...';
  return { apiKey, apiKeyHash, apiKeyPrefix };
}

// GET - Get single imaging device
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
    const device = await ImagingDevice.findById(id).lean();

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ device });
  } catch (error) {
    console.error('Error fetching imaging device:', error);
    return NextResponse.json(
      { error: 'Failed to fetch imaging device' },
      { status: 500 }
    );
  }
}

// PUT - Update imaging device
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
    const { action, ...updateData } = body;

    const device = await ImagingDevice.findById(id);
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Handle special actions
    if (action === 'regenerate-key') {
      const { apiKey, apiKeyHash, apiKeyPrefix } = generateApiKey();
      device.apiKeyHash = apiKeyHash;
      device.apiKeyPrefix = apiKeyPrefix;
      device.apiKeyGeneratedAt = new Date();
      await device.save();

      return NextResponse.json({
        device: {
          ...device.toObject(),
          apiKey, // Show new API key once
        },
        message: 'API key regenerated. Save it - it will not be shown again.',
      });
    }

    if (action === 'toggle-status') {
      device.isActive = !device.isActive;
      await device.save();
      return NextResponse.json({
        device,
        message: `Device ${device.isActive ? 'activated' : 'deactivated'}`,
      });
    }

    // Regular update
    const allowedUpdates = [
      'name', 'aeTitle', 'manufacturer', 'model', 'serialNumber', 
      'modality', 'supportedModalities', 'location', 'notes', 'isActive'
    ];

    for (const key of allowedUpdates) {
      if (updateData[key] !== undefined) {
        if (key === 'aeTitle') {
          device[key] = updateData[key].toUpperCase();
        } else {
          device[key] = updateData[key];
        }
      }
    }

    await device.save();

    return NextResponse.json({
      device,
      message: 'Device updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error updating imaging device:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update imaging device';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete imaging device
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
    const device = await ImagingDevice.findByIdAndDelete(id);

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Device deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting imaging device:', error);
    return NextResponse.json(
      { error: 'Failed to delete imaging device' },
      { status: 500 }
    );
  }
}
