import sharp from "sharp";
import { parseReceiptText } from "@/lib/receipt-text-parse";
import type { ReceiptScanResult } from "./expense-types";
import { ApiError } from "./types";

const OCR_SPACE_URL = "https://api.ocr.space/parse/image";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OCR_SPACE_MAX_BYTES = 900_000;

async function compressForOcr(bytes: Buffer): Promise<{
  bytes: Buffer;
  mimeType: string;
}> {
  let quality = 85;
  let width = 1400;
  let output = await sharp(bytes)
    .rotate()
    .resize({
      width,
      height: width,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  while (output.length > OCR_SPACE_MAX_BYTES && (quality > 45 || width > 800)) {
    if (quality > 45) {
      quality -= 10;
    } else {
      width = Math.round(width * 0.85);
    }
    output = await sharp(bytes)
      .rotate()
      .resize({
        width,
        height: width,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  return { bytes: output, mimeType: "image/jpeg" };
}

async function scanWithOcrSpace(bytes: Buffer, mimeType: string) {
  const apiKey = process.env.OCR_SPACE_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const prepared =
    bytes.length > OCR_SPACE_MAX_BYTES || !mimeType.includes("jpeg")
      ? await compressForOcr(bytes)
      : { bytes, mimeType };

  const dataUrl = `data:${prepared.mimeType};base64,${prepared.bytes.toString("base64")}`;
  const form = new FormData();
  form.append("base64Image", dataUrl);
  form.append("language", "eng");
  form.append("isTable", "true");
  form.append("OCREngine", "2");
  form.append("scale", "true");
  form.append("detectOrientation", "true");

  try {
    const response = await fetch(OCR_SPACE_URL, {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body: form,
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      IsErroredOnProcessing?: boolean;
      ErrorMessage?: string | string[];
      ParsedResults?: Array<{ ParsedText?: string }>;
    };

    if (payload.IsErroredOnProcessing) {
      return null;
    }

    const text = (payload.ParsedResults ?? [])
      .map((row) => row.ParsedText ?? "")
      .join("\n")
      .trim();

    return text || null;
  } catch {
    return null;
  }
}

async function scanWithOpenRouter(bytes: Buffer, mimeType: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const prepared = await compressForOcr(bytes);
  const dataUrl = `data:${prepared.mimeType};base64,${prepared.bytes.toString("base64")}`;
  const models = [
    "google/gemma-4-31b-it:free",
    "openrouter/free",
  ];

  for (const model of models) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://savestreak.org",
          "X-Title": "$aveStreak",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: 'Read this receipt, including refunds. Return ONLY JSON: {"merchant":"string","purchaseDate":"YYYY-MM-DD","amount":number}. Use a positive amount even for refunds. If unreadable, return {"error":"unreadable"}.',
                },
                {
                  type: "image_url",
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        continue;
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start === -1 || end === -1) {
        continue;
      }
      const parsed = JSON.parse(content.slice(start, end + 1)) as {
        error?: string;
        merchant?: string;
        purchaseDate?: string;
        amount?: number;
      };
      if (
        parsed.error ||
        !parsed.merchant ||
        !parsed.purchaseDate ||
        !parsed.amount
      ) {
        continue;
      }
      const amount = Math.abs(Number(parsed.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        continue;
      }
      return parseReceiptText(
        `${parsed.merchant}\n${parsed.purchaseDate}\nGrand Total $${amount.toFixed(2)}`,
      );
    } catch {
      // try next model
    }
  }

  return null;
}

function tryParse(text: string | null | undefined) {
  if (!text?.trim()) {
    return null;
  }
  return (
    parseReceiptText(text) ??
    parseReceiptText(text.replace(/[|]/g, " ").replace(/\s{2,}/g, "\n"))
  );
}

export async function scanReceiptImage(input: {
  bytes: Buffer;
  mimeType: string;
  ocrText?: string;
}): Promise<ReceiptScanResult> {
  const clientText = input.ocrText?.trim() ?? "";
  const fromClient = tryParse(clientText);
  if (fromClient) {
    return fromClient;
  }

  // OCR.space free tier rejects large phone photos unless we compress first.
  const fromOcrSpace = await scanWithOcrSpace(input.bytes, input.mimeType);
  const parsedSpace = tryParse(fromOcrSpace);
  if (parsedSpace) {
    return parsedSpace;
  }

  const fromVision = await scanWithOpenRouter(input.bytes, input.mimeType);
  if (fromVision) {
    return fromVision;
  }

  throw new ApiError(
    422,
    "We could not read that receipt. Retake the photo in good light and make sure the total is visible.",
  );
}
