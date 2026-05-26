import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '../../../../lib/mongodb';
import IncomingImage from '../../../../models/IncomingImage';

// GET - List incoming images with filters and stats
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
    const modality = searchParams.get('modality');
    const deviceId = searchParams.get('deviceId');
    const search = searchParams.get('search');
    const groupBy = searchParams.get('groupBy'); // 'study' or 'series'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query: Record<string, unknown> = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (matchStatus && matchStatus !== 'all') {
      query.matchStatus = matchStatus;
    }

    if (modality && modality !== 'all') {
      query.modality = modality;
    }

    if (deviceId && deviceId !== 'all') {
      query.deviceId = deviceId;
    }

    if (search) {
      query.$or = [
        { imageNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { accessionNumber: { $regex: search, $options: 'i' } },
        { studyDescription: { $regex: search, $options: 'i' } },
      ];
    }

    // If grouping by study, use aggregation
    if (groupBy === 'study') {
      const studyGroups = await IncomingImage.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$studyInstanceUID',
            studyInstanceUID: { $first: '$studyInstanceUID' },
            patientName: { $first: '$patientName' },
            patientId: { $first: '$patientId' },
            studyDate: { $first: '$studyDate' },
            studyDescription: { $first: '$studyDescription' },
            modality: { $first: '$modality' },
            imageCount: { $sum: 1 },
            seriesCount: { $addToSet: '$seriesInstanceUID' },
            firstImage: { $first: '$$ROOT' },
            matchStatus: { $first: '$matchStatus' },
            matchedStudyId: { $first: '$matchedStudyId' },
            status: { $first: '$status' },
            receivedAt: { $min: '$receivedAt' },
          },
        },
        {
          $addFields: {
            seriesCount: { $size: '$seriesCount' },
          },
        },
        { $sort: { receivedAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]);

      const totalStudies = await IncomingImage.aggregate([
        { $match: query },
        { $group: { _id: '$studyInstanceUID' } },
        { $count: 'count' },
      ]);

      return NextResponse.json({
        studies: studyGroups,
        pagination: {
          page,
          limit,
          total: totalStudies[0]?.count || 0,
          pages: Math.ceil((totalStudies[0]?.count || 0) / limit),
        },
      });
    }

    // Regular image list
    const [images, total] = await Promise.all([
      IncomingImage.find(query)
        .sort({ receivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      IncomingImage.countDocuments(query),
    ]);

    // Get statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, pendingCount, matchedCount, unmatchedCount] = await Promise.all([
      IncomingImage.countDocuments({ receivedAt: { $gte: today } }),
      IncomingImage.countDocuments({ status: 'pending' }),
      IncomingImage.countDocuments({ matchStatus: 'matched', status: 'pending' }),
      IncomingImage.countDocuments({ matchStatus: 'unmatched', status: 'pending' }),
    ]);

    return NextResponse.json({
      images,
      stats: {
        totalToday,
        pending: pendingCount,
        matched: matchedCount,
        unmatched: unmatchedCount,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching incoming images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incoming images' },
      { status: 500 }
    );
  }
}
