import { NextResponse } from "next/server";

const hasAnyKey =
  !!process.env.AI_GATEWAY_API_KEY || !!process.env.OPENAI_API_KEY;

export async function GET() {
  return NextResponse.json([
    {
      provider: "anthropic",
      hasAPIKey: hasAnyKey,
      models: [
        { name: "claude-sonnet-4-5", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
        { name: "claude-opus-4-5", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: ["image/png", "image/jpeg"] },
        { name: "claude-haiku-4-5", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
        { name: "claude-3-7-sonnet-20250219", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: ["image/png", "image/jpeg"] },
        { name: "claude-3-5-haiku-20241022", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
      ],
    },
    {
      provider: "openai",
      hasAPIKey: hasAnyKey,
      models: [
        { name: "gpt-4o", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
        { name: "gpt-4o-mini", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
        { name: "o3-mini", isToolCallUnsupported: true, isImageInputUnsupported: true, supportedFileMimeTypes: [] },
        { name: "o1", isToolCallUnsupported: true, isImageInputUnsupported: true, supportedFileMimeTypes: [] },
      ],
    },
    {
      provider: "google",
      hasAPIKey: hasAnyKey,
      models: [
        { name: "gemini-2.5-pro-exp-03-25", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
        { name: "gemini-2.0-flash", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: ["image/png", "image/jpeg"] },
        { name: "gemini-1.5-pro", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
      ],
    },
    {
      provider: "xai",
      hasAPIKey: hasAnyKey,
      models: [
        { name: "grok-3", isToolCallUnsupported: false, isImageInputUnsupported: true, supportedFileMimeTypes: [] },
        { name: "grok-3-mini", isToolCallUnsupported: false, isImageInputUnsupported: true, supportedFileMimeTypes: [] },
      ],
    },
    {
      provider: "meta",
      hasAPIKey: hasAnyKey,
      models: [
        { name: "llama-4-maverick", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
        { name: "llama-4-scout", isToolCallUnsupported: false, isImageInputUnsupported: false, supportedFileMimeTypes: [] },
        { name: "llama-3.3-70b-instruct", isToolCallUnsupported: false, isImageInputUnsupported: true, supportedFileMimeTypes: [] },
      ],
    },
  ]);
}
