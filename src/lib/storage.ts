import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a storage path or URL to a valid signed URL.
 * Handles both raw paths (e.g., 'avatars/me.jpg') and legacy full URLs.
 */
export async function resolveStorageUrl(path: string | null): Promise<string | null> {
  if (!path || path.trim() === "") return null;
  
  // If it's already a non-Supabase external URL, return as is
  if (path.startsWith("http") && !path.includes("supabase.co/storage/v1/object/")) {
    return path;
  }

  // Extract path if it's a legacy Supabase URL
  let finalPath = path;
  if (path.startsWith("http")) {
    try {
      const url = new URL(path);
      const parts = url.pathname.split("site-assets/");
      if (parts.length > 1) {
        finalPath = parts[1];
      }
    } catch (e) {
      console.error("Invalid URL in resolveStorageUrl:", path);
      return null;
    }
  }

  try {
    const { data } = await supabase.storage
      .from("site-assets")
      .createSignedUrl(finalPath, 315360000); // 10 years
    return data?.signedUrl || null;
  } catch (e) {
    console.error("Error resolving storage URL:", finalPath, e);
    return null;
  }
}

/**
 * Hook-friendly version of resolveStorageUrl for multiple items.
 */
export async function resolveStorageUrls(paths: (string | null)[]): Promise<(string | null)[]> {
  return Promise.all(paths.map(resolveStorageUrl));
}
