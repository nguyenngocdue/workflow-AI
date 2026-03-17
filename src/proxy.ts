import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Minimal proxy - no locale routing needed (single locale "en" app)
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
