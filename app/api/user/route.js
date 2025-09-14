import dbConnect from "@/lib/mongodb";
import User from "@/app/models/User";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (email) {
      const user = await User.findOne({ email }).select('-password');
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(user);
    }

    const users = await User.find().select('-password');
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const data = await request.json();
    console.log('PATCH request data:', data);

    // Get current user to check existing profileState
    const currentUser = await User.findOne({ email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Current user profileState:', currentUser.profileState);
    console.log('New profileState:', data.profileState);

    // Prepare update operations
    const setOperations = {};
    
    // Add all fields except password
    Object.keys(data).forEach(key => {
      if (key !== 'password') {
        setOperations[key] = data[key];
      }
    });

    // Set stateChangedAt when profileState changes or when profileState is provided
    if (data.profileState && data.profileState !== currentUser.profileState) {
      setOperations.stateChangedAt = new Date();
      console.log('Profile state changed! Setting stateChangedAt to:', setOperations.stateChangedAt);
    } else if (data.profileState) {
      // Always update stateChangedAt for any profileState update (for testing)
      setOperations.stateChangedAt = new Date();
      console.log('Updating stateChangedAt for profileState update:', setOperations.stateChangedAt);
    }

    console.log('Set operations:', setOperations);

    // Use direct MongoDB collection update to ensure field is set
    const updateResult = await User.collection.updateOne(
      { email },
      { $set: setOperations }
    );

    console.log('MongoDB update result:', updateResult);

    // Fetch the updated user
    const updatedUser = await User.findOne({ email }).select('-password');
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found after update' }, { status: 404 });
    }

    console.log('Final updated user stateChangedAt:', updatedUser.stateChangedAt);
    console.log('Updated user profileState:', updatedUser.profileState);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const result = await User.deleteOne({ email });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
