import { NextRequest, NextResponse } from "next/server";

export interface ParsedJsonResult<T = any> {
  data: T | null;
  errorResponse: NextResponse | null;
}

/**
 * Safely parse JSON body from a NextRequest.
 * Returns HTTP 400 Bad Request if body is empty or malformed.
 */
export async function parseJsonBody<T = any>(
  request: NextRequest
): Promise<ParsedJsonResult<T>> {
  try {
    const text = await request.text();
    if (!text || text.trim() === "") {
      return {
        data: null,
        errorResponse: NextResponse.json(
          { error: "Request body cannot be empty" },
          { status: 400 }
        ),
      };
    }

    const data = JSON.parse(text) as T;
    return { data, errorResponse: null };
  } catch {
    return {
      data: null,
      errorResponse: NextResponse.json(
        { error: "Malformed or invalid JSON payload" },
        { status: 400 }
      ),
    };
  }
}
