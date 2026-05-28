import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id).select('-password').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, image } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (image !== undefined) {
      const imageValue = String(image || '').trim();
      const validDataImage = imageValue === '' || /^data:image\/(png|jpe?g|webp);base64,/i.test(imageValue);
      if (!validDataImage) {
        return NextResponse.json({ error: 'Photo must be a PNG, JPG, or WEBP image' }, { status: 400 });
      }
      if (imageValue.length > 1_600_000) {
        return NextResponse.json({ error: 'Photo is too large. Please upload an image under 1 MB.' }, { status: 400 });
      }
    }

    await dbConnect();

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(),
      _id: { $ne: session.user.id === 'demo-user' ? null : session.user.id }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already taken' }, { status: 400 });
    }

    // For demo user, just return success without updating database
    if (session.user.id === 'demo-user') {
      return NextResponse.json({ 
        message: 'Profile updated successfully',
        user: {
          id: session.user.id,
          name,
          email,
          role: session.user.role
        }
      });
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { 
        name: name.trim(),
        email: email.toLowerCase().trim(),
        ...(image !== undefined ? { image: String(image || '').trim() } : {}),
      },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        image: updatedUser.image || '',
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
