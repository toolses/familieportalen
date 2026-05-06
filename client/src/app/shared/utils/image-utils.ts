/** Splits a preprocessed base64 JPEG into top and bottom halves. */
export function splitImageInHalf(base64: string): Promise<{ top: string; bottom: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const halfH = Math.ceil(img.height / 2);

      const topCanvas = document.createElement('canvas');
      topCanvas.width = img.width;
      topCanvas.height = halfH;
      topCanvas.getContext('2d')!.drawImage(img, 0, 0, img.width, halfH, 0, 0, img.width, halfH);

      const bottomCanvas = document.createElement('canvas');
      bottomCanvas.width = img.width;
      bottomCanvas.height = img.height - halfH;
      bottomCanvas.getContext('2d')!.drawImage(img, 0, halfH, img.width, img.height - halfH, 0, 0, img.width, img.height - halfH);

      resolve({
        top: topCanvas.toDataURL('image/jpeg', 0.92).split(',')[1],
        bottom: bottomCanvas.toDataURL('image/jpeg', 0.92).split(',')[1],
      });
    };
    img.onerror = () => resolve({ top: base64, bottom: base64 });
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Preprocesses a base64 image for AI/OCR: converts to grayscale and boosts contrast
 * so text stands out clearly against the background. Returns a new base64 string.
 * The preview image is kept unchanged — only the copy sent to the AI is processed.
 */
export function preprocessImageForAI(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.filter = 'grayscale(1) contrast(1.4) brightness(1.05)';
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Skalerer ned et base64/data-URL-bilde til maks bredde.
 * Returnerer JPEG data-URL med redusert kvalitet for å spare localStorage-plass.
 */
export function downscaleBase64Image(dataUrl: string, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth) {
        resolve(dataUrl);
        return;
      }
      const scale = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('Kunne ikke laste bilde for nedskalering'));
    img.src = dataUrl;
  });
}
