import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import AIModel from '../../../../models/AIModel';

// GET active AI model
export async function GET() {
  try {
    await dbConnect();
    const activeModel = await AIModel.findOne({ isActive: true });
    
    return NextResponse.json({
      success: true,
      data: activeModel
    });
  } catch (error) {
    console.error('Error fetching active AI model:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch active AI model',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST set active AI model
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Model ID is required' 
        },
        { status: 400 }
      );
    }

    // First, set all models to inactive
    await AIModel.updateMany({}, { isActive: false });

    // Then, set the specified model as active
    const activeModel = await AIModel.findOneAndUpdate(
      { id: body.id },
      { isActive: true },
      { new: true }
    );

    if (!activeModel) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI model not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activeModel,
      message: 'Active AI model set successfully'
    });

  } catch (error) {
    console.error('Error setting active AI model:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to set active AI model',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
