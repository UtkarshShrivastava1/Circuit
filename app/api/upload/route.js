import { uploadImage } from "@/lib/cloudinary";
// import { rejects } from "assert";
import { v2 as cloudinary } from "cloudinary";
import { Upload } from "lucide-react";
// import { error } from "console";
// import mongoose from "mongoose";
import { NextResponse } from "next/server";
// import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// export const dynamic = "force-dynamic";

// const bufferToStream = (buffer) => {
//   const stream = new Readable();
//   stream.push(buffer);
//   stream.push(null);
//   return stream;
// };

// export async function POST(req) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get("file");

//     if (!file) {
//       return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
//     }

//     console.log("File received:", {
//       type: file.type,
//       size: file.size,
//       name: file.name,
//     });

//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     const uploadOptions = {
//       folder: "uploads",
//       resource_type: "auto", // supports pdf + images
//       public_id: file.name.split(".")[0], // save with original filename (without extension)
//       use_filename: true,
//       unique_filename: false, // keep original name
//       fetch_format:'auto'
//     };

//     const result = await new Promise((resolve, reject) => {
//       const cloudinaryStream = cloudinary.uploader.upload_stream(
//         uploadOptions,
//         (error, result) => {
//           if (error) reject(error);
//           else resolve(result);
//         }
//       );
//       bufferToStream(buffer).pipe(cloudinaryStream);
//     });

    

//     // Return both URL + originalName
//     return NextResponse.json({
//       url: result.secure_url,
//       originalName: file.name,
//     });
//   } catch (error) {
//     console.error("Upload error:", error);
//     return NextResponse.json(
//       { error: error.message || "Upload failed" },
//       { status: 500 }
//     );
//   }
// }

export async function POST(requset) {
  
  try {
 const formData =   await requset.formData();
    const file =formData.get('file') || null ; 

    if(!file){ return NextResponse.json({error : "File not found in fileurl "},{status:200 });}

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes);

 const result =    await new Promise((resolve, rejects)=> {
    const UploadStream =  cloudinary.uploader.upload_stream(
        { folder:'uploads',
          resource_type:"auto",
          transformation:[
           { quality: "auto", fetch_format: "auto" } 
          ]
        },
        (error,result)=>{
          if(error) rejects(error);
          else resolve(result )
        }
      )
      UploadStream.end(buffer);
    })
    console.log("Upload : ",result ); 
      return NextResponse.json(
      { url: result.secure_url, public_id: result.public_id },
      { status: 200 })
  } catch (error) {
    console.log("Upload Image failed : ",error);
    return NextResponse.json({error : "Upload Image Failed "},
      {status : 500}
    )
  }

  
}

