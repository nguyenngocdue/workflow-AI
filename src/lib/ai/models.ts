import { openai, createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const isToolCallUnsupportedModel = (_model: LanguageModel) => false;
export const getFilePartSupportedMimeTypes = (_model: LanguageModel): string[] => [];

/**
 * Vercel AI Gateway — single endpoint for all providers.
 * https://vercel.com/ai-gateway
 * Model format: "provider/model-name"  e.g. "openai/gpt-4o", "anthropic/claude-3-5-sonnet-20241022"
 */
// Use AI_GATEWAY_API_KEY if set, otherwise fall back to OPENAI_API_KEY
// Both work with Vercel AI Gateway endpoint
const gatewayApiKey =
  process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;

const gateway = gatewayApiKey
  ? createOpenAI({
      baseURL: "https://ai-gateway.vercel.sh/v1",
      apiKey: gatewayApiKey,
    })
  : null;

export const customModelProvider = {
  languageModel: (modelId: string): LanguageModel => {
    // modelId format: "provider:model"  e.g. "openai:gpt-4o"
    const [provider, ...rest] = modelId.split(":");
    const model = rest.join(":") || provider;

    // Prefer Vercel AI Gateway (supports all providers with 1 key)
    if (gateway) {
      const gatewayModelId = `${provider}/${model}`;
      return gateway(gatewayModelId) as LanguageModel;
    }

    // Fallback: direct provider keys
    if (provider === "openai" || !provider) {
      return openai(model) as LanguageModel;
    }

    // Other providers without gateway: warn and fall back to openai
    console.warn(
      `[models] No gateway key — cannot call "${provider}" provider. ` +
        `Set AI_GATEWAY_API_KEY in .env.local or add provider SDK.`,
    );
    return openai("gpt-4o-mini") as LanguageModel;
  },
};
