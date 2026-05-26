import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import connectDB from '../../../../lib/mongodb';
import LabDevice from '../../../../models/LabDevice';
import DeviceResult from '../../../../models/DeviceResult';
import LabTest from '../../../../models/LabTest';

// Helper to verify API key
function verifyApiKey(apiKey: string, apiKeyHash: string): boolean {
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  return hash === apiKeyHash;
}

// Helper to determine result flag based on value and normal range
function determineFlag(value: string, normalRange: string, criticalLow?: string, criticalHigh?: string): 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'normal';

  // Check critical values first
  if (criticalLow && numValue <= parseFloat(criticalLow)) return 'critical-low';
  if (criticalHigh && numValue >= parseFloat(criticalHigh)) return 'critical-high';

  // Parse normal range (e.g., "70-100", "<100", ">40", "0-5")
  if (normalRange.includes('-')) {
    const [low, high] = normalRange.split('-').map(v => parseFloat(v.trim()));
    if (!isNaN(low) && numValue < low) return 'low';
    if (!isNaN(high) && numValue > high) return 'high';
  } else if (normalRange.startsWith('<')) {
    const high = parseFloat(normalRange.substring(1).trim());
    if (!isNaN(high) && numValue >= high) return 'high';
  } else if (normalRange.startsWith('>')) {
    const low = parseFloat(normalRange.substring(1).trim());
    if (!isNaN(low) && numValue <= low) return 'low';
  }

  return 'normal';
}

// POST - Receive results from a device (called by device/middleware)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get API key from header
    const apiKey = request.headers.get('X-Device-API-Key') || request.headers.get('x-device-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key. Include X-Device-API-Key header.' },
        { status: 401 }
      );
    }

    // Hash the provided API key to find the device
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const device = await LabDevice.findOne({ apiKeyHash, isActive: true });
    
    if (!device) {
      return NextResponse.json(
        { error: 'Invalid API key or device is inactive' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sampleId, analyzedAt, results, patientId } = body;

    if (!sampleId || !results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: sampleId, results (array)' },
        { status: 400 }
      );
    }

    // Map device results using device's parameter mappings
    const mappedResults = results.map((r: { code: string; value: string; unit?: string; flag?: string }) => {
      const mapping = device.parameterMappings.find(
        (m: { deviceCode: string; testName: string; unit: string; normalRange: string; criticalLow?: string; criticalHigh?: string }) => 
          m.deviceCode.toUpperCase() === r.code.toUpperCase()
      );

      const unit = r.unit || mapping?.unit || '';
      const normalRange = mapping?.normalRange || '';
      const criticalLow = mapping?.criticalLow;
      const criticalHigh = mapping?.criticalHigh;

      // Determine flag based on value and ranges
      let flag: 'normal' | 'low' | 'high' | 'critical-low' | 'critical-high' = 'normal';
      if (r.flag) {
        // Map device flags to our format
        const deviceFlag = r.flag.toUpperCase();
        if (deviceFlag === 'L') flag = 'low';
        else if (deviceFlag === 'H') flag = 'high';
        else if (deviceFlag === 'LL' || deviceFlag === 'CL') flag = 'critical-low';
        else if (deviceFlag === 'HH' || deviceFlag === 'CH') flag = 'critical-high';
        else if (deviceFlag === 'N') flag = 'normal';
      } else {
        flag = determineFlag(r.value, normalRange, criticalLow, criticalHigh);
      }

      return {
        parameterCode: r.code,
        parameterName: mapping?.testName || r.code,
        value: r.value,
        unit,
        normalRange,
        flag,
        rawValue: r.value,
      };
    });

    // Try to auto-match with existing lab test
    let matchedLabTestId: string | undefined;
    let matchedTestNumber: string | undefined;
    let matchStatus: 'matched' | 'unmatched' | 'multiple' | 'manual' = 'unmatched';
    let matchConfidence = 0;
    let possibleMatches: any[] = [];

    // Search for matching lab tests
    const labTests = await LabTest.find({
      $or: [
        { testNumber: sampleId },
        { testNumber: { $regex: sampleId, $options: 'i' } },
      ],
      status: { $in: ['pending', 'sample-collected', 'in-progress'] },
    }).limit(5).lean();

    if (labTests.length === 1) {
      // Exact match
      matchedLabTestId = labTests[0]._id.toString();
      matchedTestNumber = labTests[0].testNumber;
      matchStatus = 'matched';
      matchConfidence = 100;
    } else if (labTests.length > 1) {
      // Multiple possible matches
      matchStatus = 'multiple';
      matchConfidence = 70;
      possibleMatches = labTests.map(lt => ({
        labTestId: lt._id.toString(),
        testNumber: lt.testNumber,
        patientName: lt.patientName,
        testType: lt.testType,
        confidence: lt.testNumber === sampleId ? 100 : 70,
      }));
    }

    // Create device result record
    const deviceResult = new DeviceResult({
      deviceId: device._id,
      deviceCode: device.deviceCode,
      deviceName: device.name,
      receivedAt: new Date(),
      analyzedAt: analyzedAt ? new Date(analyzedAt) : undefined,
      sampleId,
      patientId,
      matchedLabTestId,
      matchedTestNumber,
      matchStatus,
      matchConfidence,
      possibleMatches,
      results: mappedResults,
      rawPayload: JSON.stringify(body),
    });

    await deviceResult.save();

    // Update device stats
    device.lastSeenAt = new Date();
    device.lastResultAt = new Date();
    device.connectionStatus = 'online';
    device.totalResultsReceived += 1;
    
    // Reset daily counter if needed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(device.lastResetDate || 0);
    lastReset.setHours(0, 0, 0, 0);
    if (today > lastReset) {
      device.resultsToday = 1;
      device.lastResetDate = new Date();
    } else {
      device.resultsToday += 1;
    }
    
    await device.save();

    return NextResponse.json({
      success: true,
      resultNumber: deviceResult.resultNumber,
      matched: matchStatus === 'matched',
      matchedTestNumber,
      matchStatus,
      hasCriticalValues: deviceResult.hasCriticalValues,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error receiving device results:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process device results' },
      { status: 500 }
    );
  }
}

// GET - List device results (for dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const matchStatus = searchParams.get('matchStatus');
    const deviceId = searchParams.get('deviceId');
    const hasCritical = searchParams.get('hasCritical');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (matchStatus && matchStatus !== 'all') {
      query.matchStatus = matchStatus;
    }

    if (deviceId) {
      query.deviceId = deviceId;
    }

    if (hasCritical === 'true') {
      query.hasCriticalValues = true;
    }

    if (search) {
      query.$or = [
        { resultNumber: { $regex: search, $options: 'i' } },
        { sampleId: { $regex: search, $options: 'i' } },
        { deviceName: { $regex: search, $options: 'i' } },
        { matchedTestNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [deviceResults, total] = await Promise.all([
      DeviceResult.find(query)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DeviceResult.countDocuments(query),
    ]);

    // Get stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, pendingCount, criticalCount, matchedCount, unmatchedCount] = await Promise.all([
      DeviceResult.countDocuments({ receivedAt: { $gte: today } }),
      DeviceResult.countDocuments({ status: 'pending' }),
      DeviceResult.countDocuments({ hasCriticalValues: true, status: 'pending' }),
      DeviceResult.countDocuments({ matchStatus: 'matched', status: 'pending' }),
      DeviceResult.countDocuments({ matchStatus: { $in: ['unmatched', 'multiple'] }, status: 'pending' }),
    ]);

    return NextResponse.json({
      results: deviceResults,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalToday,
        pending: pendingCount,
        critical: criticalCount,
        matched: matchedCount,
        unmatched: unmatchedCount,
      },
    });
  } catch (error) {
    console.error('Error fetching device results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device results' },
      { status: 500 }
    );
  }
}
