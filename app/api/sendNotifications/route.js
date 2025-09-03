import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebaseAdmin';
import admin from 'firebase-admin';

export async function POST(request) {
  try {
    const requestBody = await request.json();

    if (!requestBody || !requestBody.email || !requestBody.notification) {
      return NextResponse.json(
        { message: 'Invalid request body. Email and notification are required.' },
        { status: 400 }
      );
    }

    const { email, notification } = requestBody;

    // Fetch the tokens associated with the specified email
    const tokensSnapshot = await firestore
      .collection('pushNotifications')
      .where('email', '==', email)
      .get();

    if (tokensSnapshot.empty) {
      return NextResponse.json({ message: 'No tokens found for the specified email.' }, { status: 404 });
    }

    // Extract tokens from the documents
    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

    if (tokens.length === 0) {
      return NextResponse.json({ message: 'No tokens available for the specified email.' }, { status: 404 });
    }

    // Create the message payload
    const message = {
      data: {
        title: notification.title,
        body: notification.body,
        
        
      },
      tokens,  // Array of FCM tokens
    };

    // Send notifications to each token
    const response = await admin.messaging().sendEachForMulticast(message);

    // console.log('FCM response:', response);

    return NextResponse.json({ message: 'Notification sent successfully!', response }, { status: 200 });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ message: 'Error sending notification.', error: error.message }, { status: 500 });
  }
}
