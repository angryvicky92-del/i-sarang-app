import { supabase } from './supabaseClient';
import { decode } from 'base64-arraybuffer';

/**
 * Uploads community post images to Supabase Storage
 * @param userId - ID of the user uploading images
 * @param images - Array of image objects { uri: string, base64: string }
 * @returns Promise<string[]> - Array of public URLs
 */
export const uploadPostImages = async (userId: string, images: any[]): Promise<string[]> => {
  if (!images || images.length === 0) return [];

  const uploadPromises = images.map(async (image) => {
    // If it's already a URL (string), return as is
    if (typeof image === 'string') return image;
    
    // Check if it's a new image object with base64
    if (!image.base64 || !image.uri) return null;

    try {
      const fileExt = image.uri.split('.').pop() || 'jpg';
      const fileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `post_images/${fileName}`;

          const { data, error } = await supabase.storage
        .from('community_images')
        .upload(filePath, decode(image.base64), { 
          contentType: `image/${fileExt}`,
          upsert: true
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage.from('community_images').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Upload failed for one image:', err);
      return null;
    }
  });

  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
};
