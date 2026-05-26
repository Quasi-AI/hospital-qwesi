import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid workflow ID' },
        { status: 400 }
      );
    }
    
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();
    const workflowsCollection = db.collection('workflows');
    
    const workflow = await workflowsCollection.findOne({ _id: new ObjectId(id) });
    
    await client.close();
    
    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow._id.toString(),
        ...workflow
      }
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid workflow ID' },
        { status: 400 }
      );
    }
    
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();
    const workflowsCollection = db.collection('workflows');
    
    const updateData = {
      ...body,
      updatedAt: new Date()
    };
    
    const result = await workflowsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    await client.close();
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Workflow updated successfully',
      workflow: {
        id,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('DELETE request for workflow ID:', id);
    
    if (!ObjectId.isValid(id)) {
      console.log('Invalid ObjectId:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid workflow ID' },
        { status: 400 }
      );
    }
    
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();
    const workflowsCollection = db.collection('workflows');
    
    console.log('Attempting to delete workflow with ObjectId:', new ObjectId(id));
    const result = await workflowsCollection.deleteOne({ _id: new ObjectId(id) });
    console.log('Delete result:', result);
    
    await client.close();
    
    if (result.deletedCount === 0) {
      console.log('No workflow found with ID:', id);
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }
    
    console.log('Workflow deleted successfully');
    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
