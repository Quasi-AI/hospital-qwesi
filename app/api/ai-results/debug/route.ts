import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import AIResult from '../../../../models/AIResult';
import dbConnect from '../../../../lib/mongodb';

// GET - Debug endpoint to check all AI results in database
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const type = searchParams.get('type');

    let query: any = {};
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (type) {
      query.type = type;
    }

    // Get all results
    const allResults = await AIResult.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    // Get counts by type
    const countsByType = await AIResult.aggregate([
      ...(Object.keys(query).length > 0 ? [{ $match: query }] : []),
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get unique patient IDs
    const uniquePatientIds = await AIResult.distinct('patientId');

    // Get sample results
    const sampleResults = allResults.slice(0, 5).map(result => ({
      _id: result._id,
      patientId: result.patientId,
      type: result.type,
      title: result.title,
      createdAt: result.createdAt,
      hasContent: !!result.content,
      contentLength: result.content?.length || 0
    }));

    return NextResponse.json({
      total: allResults.length,
      countsByType: countsByType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      uniquePatientIds: uniquePatientIds.length,
      sampleResults,
      allResults: allResults.map(result => ({
        _id: result._id.toString(),
        patientId: result.patientId,
        patientIdType: typeof result.patientId,
        type: result.type,
        title: result.title,
        content: result.content, // Include full content
        createdAt: result.createdAt,
        aiModel: result.aiModel,
        metadata: result.metadata,
        contentPreview: result.content?.substring(0, 100) || 'No content'
      }))
    });
  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json({ 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

