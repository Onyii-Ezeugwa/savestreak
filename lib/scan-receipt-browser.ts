"use client";

export interface BrowserOcrProgress {
  status: string;
  progress: number;
}

/** Compress a phone photo so free OCR APIs (1 MB limit) can accept it. */
export async function compressReceiptImage(file: File): Promise<File> {
  if (typeof createImageBitmap === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let maxSide = 1600;
    let quality = 0.82;

    const render = (side: number, q: number) => {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        return null;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      return canvas;
    };

    let canvas = render(maxSide, quality);
    if (!canvas) {
      bitmap.close();
      return file;
    }

    let blob = await new Promise<Blob | null>((resolve) => {
      canvas!.toBlob((next) => resolve(next), "image/jpeg", quality);
    });

    while (blob && blob.size > 900_000 && (quality > 0.45 || maxSide > 900)) {
      if (quality > 0.45) {
        quality -= 0.1;
      } else {
        maxSide = Math.round(maxSide * 0.85);
        canvas = render(maxSide, quality);
        if (!canvas) {
          break;
        }
      }
      blob = await new Promise<Blob | null>((resolve) => {
        canvas!.toBlob((next) => resolve(next), "image/jpeg", quality);
      });
    }

    bitmap.close();
    if (!blob) {
      return file;
    }

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export async function scanReceiptInBrowser(
  file: File,
  onProgress?: (update: BrowserOcrProgress) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const prepared = await compressReceiptImage(file);
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text") {
        onProgress?.({
          status: "Reading text from receipt...",
          progress: Math.round((message.progress ?? 0) * 100),
        });
        return;
      }
      if (message.status) {
        onProgress?.({
          status: "Preparing receipt scan...",
          progress: Math.round((message.progress ?? 0) * 100),
        });
      }
    },
  });

  try {
    onProgress?.({ status: "Scanning receipt...", progress: 0 });
    await worker.setParameters({
      tessedit_pageseg_mode: 6 as never,
    });
    const result = await worker.recognize(prepared);
    return result.data.text ?? "";
  } finally {
    await worker.terminate();
  }
}
