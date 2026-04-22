import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

export interface UploadResult {
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Pick an image from gallery, compress it, and upload to Supabase Storage.
 * - Crops to square
 * - Resizes to max 512x512
 * - Compresses to quality 0.6
 * - Returns public URL
 */
export async function pickAndUploadImage({
  userId,
  folder = 'avatars',
  maxSize = 512,
  quality = 0.6,
}: {
  userId: string;
  folder?: string;
  maxSize?: number;
  quality?: number;
}): Promise<UploadResult | null> {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Photo library permission is required');
  }

  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1, // Full quality from picker, we'll compress ourselves
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];

  // Compress + resize using expo-image-manipulator
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: maxSize, height: maxSize } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Read file as base64 (React Native doesn't support fetch().blob() for local files)
  console.log('[ImageUpload] Reading file:', manipulated.uri);
  const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  console.log('[ImageUpload] Base64 length:', base64.length);

  // Convert base64 to Uint8Array
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const uint8Array = new Uint8Array(byteNumbers);
  console.log('[ImageUpload] Uint8Array size:', uint8Array.length);

  // Upload to Supabase Storage
  const fileName = `${folder}/${userId}_${Date.now()}.jpg`;
  console.log('[ImageUpload] Uploading to:', fileName);
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, uint8Array, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

  return {
    url: `${urlData.publicUrl}?t=${Date.now()}`,
    width: manipulated.width,
    height: manipulated.height,
    sizeBytes: uint8Array.length,
  };
}
