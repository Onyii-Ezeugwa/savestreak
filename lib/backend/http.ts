import { NextResponse } from "next/server";
import { ApiError } from "./types";

const AUTH_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: AUTH_CACHE_HEADERS });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, fieldErrors: error.fieldErrors },
      { status: error.statusCode, headers: AUTH_CACHE_HEADERS },
    );
  }
  console.error(error);
  const detail =
    process.env.NODE_ENV !== "production" && error instanceof Error
      ? error.message
      : "Something went wrong. Try again.";
  return NextResponse.json(
    { error: detail },
    { status: 500, headers: AUTH_CACHE_HEADERS },
  );
}
