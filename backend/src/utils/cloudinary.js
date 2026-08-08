import { v2 as cloudinary } from 'cloudinary';


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


export async function uploadToCloudinary(base64Data, mimeType, messageType) {
    // Cloudinary treats audio files as 'video' resource types
    const resourceType = messageType === 'audio' ? 'video' : 'image';
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    
    const result = await cloudinary.uploader.upload(dataUri, {
        resource_type: resourceType,
        
        format: messageType === 'audio' ? 'mp3' : undefined 
    });
    
    return result.secure_url;
}