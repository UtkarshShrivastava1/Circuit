// // lib/firebaseAdmin.js
// import admin from "firebase-admin";

// // Initialize Firebase Admin SDK if not already initialized
// if (!admin.apps.length) {
//   const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT);

//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     // databaseURL: "https://zager-stream.firebaseapp.com",
//   });
// }

// const firestore = admin.firestore();
// const auth = admin.auth();

// export { firestore, auth };
