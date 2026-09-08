/**
 * Client-side Canvas Image Compression, Zoom, and Framing Utility
 * Converts heavy images (JPG/PNG 5MB-15MB) into lightweight WebP files (~100KB-250KB)
 * and crops/frames them according to user's selected position, zoom (0.5x to 3.0x) & fit mode.
 */
export async function compressImageOnClient(
  file: File,
  maxDimension = 1920,
  quality = 0.82,
  offsetY = 0.5, // 0 = top, 0.5 = center, 1 = bottom
  fitMode: 'cover' | 'contain' = 'cover',
  zoom = 1.0 // 0.5x to 3.0x
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const imgWidth = img.width;
      const imgHeight = img.height;

      let targetWidth = imgWidth;
      let targetHeight = imgHeight;

      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
          targetWidth = maxDimension;
        } else {
          targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
          targetHeight = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      const effectiveZoom = Math.max(0.4, Math.min(3.0, zoom));

      if (fitMode === 'contain' || effectiveZoom < 1.0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const scaledW = targetWidth * effectiveZoom;
        const scaledH = targetHeight * effectiveZoom;
        const dx = (targetWidth - scaledW) / 2;
        const dy = (targetHeight - scaledH) * offsetY;

        ctx.drawImage(img, dx, dy, scaledW, scaledH);
      } else {
        const canvasRatio = targetWidth / targetHeight;

        let sWidth = imgWidth / effectiveZoom;
        let sHeight = imgHeight / effectiveZoom;

        const imgRatio = imgWidth / imgHeight;
        if (imgRatio > canvasRatio) {
          sWidth = (imgHeight * canvasRatio) / effectiveZoom;
        } else {
          sHeight = (imgWidth / canvasRatio) / effectiveZoom;
        }

        const maxSx = imgWidth - sWidth;
        const maxSy = imgHeight - sHeight;

        const sx = maxSx > 0 ? maxSx / 2 : 0;
        const clampedOffsetY = Math.max(0, Math.min(1, offsetY));
        const sy = maxSy > 0 ? maxSy * clampedOffsetY : 0;

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
          const compressedFile = new File([blob], webpName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
