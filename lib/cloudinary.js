import {v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async(filePath) =>{
  try {
    if(!filePath ) {
      throw new Error('No file path provided');
    }

    const result = await cloudinary.uploader.upload(filePath , {
      resource_type : "auto"
    });
    // file has been uploaded successfully
    console.log('Uploaded image to Cloudinary:', result.url);



    return result;
  } catch (error) {
    fs.unlinkSync(filePath);// remove the locally saved temporary file as the operation failed .
    console.error('Error uploading image to Cloudinary:', error.message);
    throw error;
    
  }
}


export { uploadImage };