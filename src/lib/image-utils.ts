/**
 * Resize and compress an image client-side using a canvas.
 * Returns a base64 string WITHOUT the `data:image/...;base64,` prefix.
 *
 * - Preserves aspect ratio
 * - Output is JPEG (handles HEIC by treating it as JPEG via the browser
 *   image decoder, which works on iOS Safari)
 */
export async function compressImage(
  file: File,
  maxWidthPx: number,
  qualityPercent: number,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);

    const ratio = image.width > maxWidthPx ? maxWidthPx / image.width : 1;
    const targetWidth = Math.round(image.width * ratio);
    const targetHeight = Math.round(image.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const dataUrl = canvas.toDataURL("image/jpeg", qualityPercent);
    const commaIdx = dataUrl.indexOf(",");
    return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
