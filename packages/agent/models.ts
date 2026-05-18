import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGateway } from "ai";
import type { LanguageModel } from "ai";

// Declaração dos tipos que o index.ts está tentando exportar
export type GatewayConfig = { baseURL?: string; apiKey?: string };
export type GatewayOptions = { headers?: Record<string, string> };

export const REFLECTION_MODEL = "openai/gpt-4o-mini";

export function getProviderAndModelId(modelId: string) {
  const [provider, ...rest] = modelId.split("/");
  return { provider, modelId: rest.join("/") };
}

export function getModel(modelId: string): LanguageModel {
  const { provider, modelId: id } = getProviderAndModelId(modelId);

  switch (provider) {
    case "openai":
      return openai(id);
    case "anthropic":
      return anthropic(id);
    case "google": {
      const google = createGoogleGenerativeAI();
      return google(id);
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export function gateway(
  modelId: string,
  config?: GatewayConfig,
): LanguageModel {
  const attributionHeaders = {
    "x-vercel-ai-attribution": "Open Agents",
  };

  let model: LanguageModel;

  // Bypass: Se o modelo for do Google, chama a API diretamente ignorando o AI Gateway da Vercel
  if (modelId.startsWith("google/")) {
    const google = createGoogleGenerativeAI();
    model = google(modelId.replace("google/", ""));
  } else {
    // Mantém o comportamento original com Gateway para OpenAI e Anthropic
    const baseGateway = config
      ? createGateway({
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          headers: attributionHeaders,
        })
      : createGateway({ headers: attributionHeaders });

    model = baseGateway(modelId);
  }

  return model;
}
