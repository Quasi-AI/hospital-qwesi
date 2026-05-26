import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import AIModel from '../../../../models/AIModel';

// Test endpoint to verify database connection and basic operations
export async function GET() {
  try {
    console.log('Testing database connection...');
    await dbConnect();
    console.log('Database connected successfully');
    
    const count = await AIModel.countDocuments();
    console.log('Current AI models in database:', count);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      modelCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Test endpoint to create a sample model
export async function POST(request: NextRequest) {
  try {
    console.log('Testing model creation...');
    await dbConnect();
    
    const testModel = new AIModel({
      id: Date.now().toString(),
      name: 'Test Model',
      provider: 'OpenAI',
      type: 'llm',
      status: 'inactive',
      apiKey: 'test-key',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o',
      maxTokens: 4000,
      temperature: 0.3,
      accuracy: 90,
      speed: 80,
      cost: 0.005,
      features: ['test'],
      lastTest: new Date().toLocaleString(),
      testResults: { accuracy: 90, responseTime: 2.0, reliability: 90 },
      isActive: false
    });

    const savedModel = await testModel.save();
    console.log('Test model saved:', savedModel);

    return NextResponse.json({
      success: true,
      message: 'Test model created successfully',
      data: savedModel
    });
  } catch (error) {
    console.error('Test model creation failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test model creation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
