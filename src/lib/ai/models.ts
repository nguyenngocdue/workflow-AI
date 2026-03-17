import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const isToolCallUnsupportedModel = (_model: LanguageModel) => false;

export const getFilePartSupportedMimeTypes = (_model: LanguageModel): string[] => [];

export const customModelProvider = {
  languageModel: (modelId: string): LanguageModel => {
    const [provider, model] = modelId.includes(":")
      ? modelId.split(":")
      : ["openai", modelId];
    if (provider === "openai" || !provider) {
      return openai(model) as LanguageModel;
    }
    return openai(model) as LanguageModel;
  },
};
