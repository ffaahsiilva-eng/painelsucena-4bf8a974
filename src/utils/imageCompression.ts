import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before upload.
 * If the file is not an image, it returns the original file.
 * 
 * @param file The original File or Blob
 * @returns A promise that resolves to the compressed File/Blob
 */
export async function compressImage(file: File | Blob): Promise<File | Blob> {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Convert Blob to File if needed because browser-image-compression expects File,
  // but it usually works with Blob too. We'll explicitly handle it.
  let targetFile: File;
  if (file instanceof File) {
    targetFile = file;
  } else {
    targetFile = new File([file], 'image.jpg', { type: file.type });
  }

  const options = {
    maxSizeMB: 1, // Limita a ~1MB
    maxWidthOrHeight: 1920, // Resolução máxima
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(targetFile, options);
    console.log(`Original: ${(file.size / 1024 / 1024).toFixed(2)} MB, Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Retorna original se falhar
  }
}
