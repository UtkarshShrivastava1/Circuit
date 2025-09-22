import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI;
const URI = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
// Debug log
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in .env file");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
