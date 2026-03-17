import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    { provider: "openai", model: "gpt-4o", label: "GPT-4o" },
    { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o Mini" },
    { provider: "openai", model: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ]);
}
