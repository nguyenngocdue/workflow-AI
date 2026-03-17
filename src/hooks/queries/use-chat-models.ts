import { appStore } from "@/app/store";
import { fetcher } from "lib/utils";
import useSWR, { SWRConfiguration } from "swr";

export const useChatModels = (options?: SWRConfiguration) => {
  return useSWR<
    {
      provider: string;
      hasAPIKey: boolean;
      models: {
        name: string;
        isToolCallUnsupported: boolean;
        isImageInputUnsupported: boolean;
        supportedFileMimeTypes: string[];
      }[];
    }[]
  >("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: [],
    onSuccess: (data) => {
      const status = appStore.getState();
      if (!status.chatModel && data?.[0]?.models?.[0]) {
        const anthropicProvider = data.find((p) => p.provider === "anthropic");
        const defaultModel = anthropicProvider?.models.find((m) =>
          m.name.includes("claude-sonnet-4"),
        );
        appStore.setState({
          chatModel: defaultModel
            ? { provider: "anthropic", model: defaultModel.name }
            : { provider: data[0].provider, model: data[0].models[0].name },
        });
      }
    },
    ...options,
  });
};
