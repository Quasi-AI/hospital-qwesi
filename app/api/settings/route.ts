import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { DEFAULT_HOSPITAL_NAME, normalizeHospitalName } from '@/lib/getLandingSettings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get or create settings
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings({});
      await settings.save();
    }

    // For non-admin users, return only public/display settings
    if (session.user.role !== 'admin') {
      const publicSettings = {
        systemTitle: normalizeHospitalName(settings.systemTitle),
        systemDescription: settings.systemDescription,
        currency: settings.currency,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
        language: settings.language,
        theme: settings.theme,
        workingHours: settings.workingHours,
        address: settings.address,
        invoiceLogoUrl: settings.invoiceLogoUrl || '',
      };
      return NextResponse.json(publicSettings);
    }

    // Admin gets full settings
    if (!settings.systemTitle || settings.systemTitle === 'AI Doctor' || settings.systemTitle === 'AI Doc') {
      settings.systemTitle = DEFAULT_HOSPITAL_NAME;
    }
    return NextResponse.json(settings);

  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update settings
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await request.json();

    await dbConnect();

    // Update or create settings
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: updates },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      settings 
    });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
