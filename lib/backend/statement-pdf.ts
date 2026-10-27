import { extractText, getDocumentProxy } from "unpdf";
import { ApiError } from "./types";

const OCR_SPACE_URL = "https://api.ocr.space/parse/image";
const OCR_SPACE_MAX_BYTES = 1_000_000;

function letterCount(text: string) {
  return (text.match(/[A-Za-z]/g) ?? []).length;
}

/** Read the text layer of a digital bank statement. */
export async function extractStatementPdfText(bytes: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  try {
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } finally {
    await pdf.cleanup();
  }
}

/** OCR a scanned statement. OCR.space reads a PDF directly, without turning it into a photo first. */
async function ocrStatementPdf(bytes: Buffer): Promise<string | null> {
  const apiKey = process.env.OCR_SPACE_API_KEY?.trim();
  if (!apiKey || bytes.length > OCR_SPACE_MAX_BYTES) {
    return null;
  }

  const form = new FormData();
  form.append("base64Image", `data:application/pdf;base64,${bytes.toString("base64")}`);
  form.append("filetype", "PDF");
  form.append("language", "eng");
  form.append("isTable", "true");
  form.append("OCREngine", "2");
  form.append("scale", "true");
  form.append("detectOrientation", "true");

  try {
    const response = await fetch(OCR_SPACE_URL, {
      method: "POST",
      headers: { apikey: apiKey },
      body: form,
      signal: AbortSignal.timeout(60_000),
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
      const message = Array.isArray(payload.ErrorMessage)
        ? payload.ErrorMessage.join(" ")
        : (payload.ErrorMessage ?? "");
      if (/page limit|file size|too large|maximum/i.test(message)) {
        throw new ApiError(
          422,
          "That scanned PDF is too long to read. Upload a statement of a few pages, or a CSV with date, merchant, and amount.",
        );
      }
      return null;
    }
    const text = (payload.ParsedResults ?? [])
      .map((row) => row.ParsedText ?? "")
      .join("\n")
      .trim();
    return text || null;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    return null;
  }
}

export async function readStatementPdf(bytes: Buffer): Promise<string> {
  let embedded = "";
  try {
    embedded = await extractStatementPdfText(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/password/i.test(message)) {
      throw new ApiError(
        422,
        "That PDF is password protected. Export an unlocked statement, or upload a CSV.",
      );
    }
  }

  if (letterCount(embedded) >= 40) {
    return embedded;
  }

  const scanned = await ocrStatementPdf(bytes);
  if (scanned && letterCount(scanned) >= 40) {
    return scanned;
  }

  if (bytes.length > OCR_SPACE_MAX_BYTES) {
    throw new ApiError(
      422,
      "That PDF looks like a scan and is over 1 MB, so it could not be read. Upload a smaller PDF or a CSV.",
    );
  }

  throw new ApiError(
    422,
    "We could not read that PDF. Upload a text statement, or a CSV with date, merchant, and amount.",
  );
}
