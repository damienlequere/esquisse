// Gemini client for the scene generator: images through the Interactions API
// (Nano Banana), boxes through generateContent in vision. The key comes from
// GEMINI_API_KEY.

import type { Box } from "@esquisse/shared";

export type ImageRequest = {
  model: string;
  prompt: string;
  references: { mimeType: string; data: Buffer }[];
  aspectRatio: string;
  imageSize: string;
};

// Transient errors (rate, overload, outage) are worth another attempt; the
// others (prompt refused, invalid key) are final.
const TRANSIENT = new Set([429, 500, 502, 503, 504]);
const DELAYS = [10_000, 30_000, 60_000];

class GeminiError extends Error {
  readonly response: Response;
  constructor(response: Response, message: string) {
    super(`Gemini ${response.status}: ${message}`);
    this.response = response;
  }
}

// The wait Gemini asks for (in seconds), otherwise the planned one.
const retryAfter = (response: Response, fallback: number) => {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : fallback;
};

const withRetries = async <T>(call: () => Promise<T>, log: (line: string) => void) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (e) {
      const delay = DELAYS[attempt];
      if (!(e instanceof GeminiError) || !TRANSIENT.has(e.response.status) || delay === undefined) {
        throw e;
      }
      const wait = retryAfter(e.response, delay);
      log(`↻ Gemini ${e.response.status}, retrying in ${Math.round(wait / 1000)} s`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
};

type InteractionResponse = {
  error?: { message?: string };
  errors?: { message?: string }[];
  steps?: { type?: string; content?: { type?: string; data?: string; text?: string }[] }[];
};

const imageCall = async (apiKey: string, request: ImageRequest): Promise<Buffer> => {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      model: request.model,
      input: [
        { type: "text", text: request.prompt },
        ...request.references.map((ref) => ({
          type: "image",
          mime_type: ref.mimeType,
          data: ref.data.toString("base64"),
        })),
      ],
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: request.aspectRatio,
        image_size: request.imageSize,
      },
      store: false,
    }),
  });
  const body: InteractionResponse | undefined = await response.json().catch(() => undefined);
  const message = body?.error?.message ?? body?.errors?.[0]?.message;
  if (!response.ok) throw new GeminiError(response, message ?? "error");
  if (message !== undefined) throw new Error(`Gemini: ${message}`);
  const content = (body?.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? []);
  const image = content.findLast((c) => c.type === "image" && c.data !== undefined);
  if (image?.data === undefined) {
    const text = content.find((c) => c.type === "text")?.text;
    throw new Error(`Gemini: no image in the response${text ? ` (“${text}”)` : ""}`);
  }
  return Buffer.from(image.data, "base64");
};

export const generateImage = (
  apiKey: string,
  request: ImageRequest,
  log: (line: string) => void = console.log,
) => withRetries(() => imageCall(apiKey, request), log);

type ContentResponse = {
  error?: { message?: string };
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

// Gemini returns the boxes as [ymin, xmin, ymax, xmax], from 0 to 1000.
const detectCall = async (
  apiKey: string,
  model: string,
  jpg: Buffer,
  elements: { id: string; detect: string }[],
): Promise<Record<string, Box>> => {
  const prompt = [
    "Detect these elements in the image and return their bounding boxes as JSON:",
    ...elements.map((e) => `- id "${e.id}": ${e.detect}`),
    'Answer only with a JSON array of {"id": string, "box_2d": [ymin, xmin, ymax, xmax]}, coordinates normalized to 0-1000.',
  ].join("\n");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: jpg.toString("base64") } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING", enum: elements.map((e) => e.id) },
                box_2d: { type: "ARRAY", items: { type: "INTEGER" } },
              },
              required: ["id", "box_2d"],
            },
          },
          temperature: 0,
        },
      }),
    },
  );
  const body: ContentResponse | undefined = await response.json().catch(() => undefined);
  if (!response.ok) throw new GeminiError(response, body?.error?.message ?? "error");
  const text = body?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (text === undefined) throw new Error("Gemini: no text in the response");
  const found: { id: string; box_2d: [number, number, number, number] }[] = JSON.parse(text);
  return Object.fromEntries(
    found.map(({ id, box_2d: [y0, x0, y1, x1] }) => [
      id,
      { x0: x0 / 1000, y0: y0 / 1000, x1: x1 / 1000, y1: y1 / 1000 },
    ]),
  );
};

export const detectBoxes = (
  apiKey: string,
  model: string,
  jpg: Buffer,
  elements: { id: string; detect: string }[],
  log: (line: string) => void = console.log,
) => withRetries(() => detectCall(apiKey, model, jpg, elements), log);
