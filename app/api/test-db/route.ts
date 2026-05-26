import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ 
      success: true, 
      message: 'MongoDB connected successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to MongoDB',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
