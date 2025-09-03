import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { Readable } from "stream";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = "force-dynamic"; // optional: force dynamic route

// Utility: Convert buffer to readable stream
const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    console.log("File received:", {
      type: file?.type,
      size: file?.size,
      name: file?.name,
    });

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      console.error(`Invalid file type: ${file.type}`);
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error(`File too large: ${file.size} bytes`);
      return NextResponse.json(
        { error: "File too large. Maximum size allowed: 5MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise((resolve, reject) => {
      const cloudinaryStream = cloudinary.uploader.upload_stream(
        {
          folder: "uploads",
          allowed_formats: ["jpg", "png", "gif", "webp"],
          transformation: [{ quality: "auto" }],
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      bufferToStream(buffer).pipe(cloudinaryStream);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: error.message || "Upload failed",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: error.status || 500 }
    );
  }
}
