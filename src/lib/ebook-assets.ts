import { supabase } from "@/integrations/supabase/client";

/** Convertit un blob en data URL utilisable par jsPDF / docx. */
export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture de l'image impossible"));
    reader.readAsDataURL(blob);
  });
}

/** Téléverse une image (data URL) dans le bucket privé `covers`. */
export async function uploadImage(path: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, blob, { upsert: true, contentType: "image/png" });
  if (error) throw error;
  return path;
}

export async function signedUrl(path?: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("covers").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function pathToDataUrl(path?: string | null) {
  const url = await signedUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
}
