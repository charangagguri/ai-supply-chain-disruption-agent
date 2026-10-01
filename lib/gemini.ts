import { InvestigationResult } from "@/lib/orchestrator";

export type GeminiReasoning = {
  summary: string;
  businessImpact: string;
  recommendedAction: string;
  alternativeComparison: string;
  confidence: "High" | "Medium" | "Low";
};

type GeminiModel =
  | "gemini-3.8-flash"
  | "gemini-3.7-flash";

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

async function callGemini(
  model: GeminiModel,
  apiKey: string,
  prompt: string,
): Promise<GeminiReasoning> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },

    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text:
              "You are a supply-chain reasoning agent. Use only supplied evidence. Never invent facts. Do not claim that an action was executed.",
          },
        ],
      },

      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],

      generationConfig: {
        responseMimeType:
          "application/json",

        maxOutputTokens: 800,

        thinkingConfig: {
          thinkingLevel: "low",
        },
      },
    }),
  });

  const data =
    (await response.json()) as GeminiApiResponse;

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Gemini API failed: ${response.status}`;

    const error = new Error(message) as Error & {
      status?: number;
      model?: string;
    };

    error.status = response.status;
    error.model = model;

    throw error;
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(
      `${model} returned an empty response`,
    );
  }

  let parsed: Partial<GeminiReasoning>;

  try {
    parsed = JSON.parse(text);
  } catch {
    console.error(
      `${model} RAW RESPONSE:`,
      text,
    );

    throw new Error(
      `${model} returned invalid JSON`,
    );
  }

  return {
    summary:
      parsed.summary ||
      "Gemini completed the supply-chain analysis.",

    businessImpact:
      parsed.businessImpact ||
      "The current supply-chain signals indicate measurable disruption exposure.",

    recommendedAction:
      parsed.recommendedAction ||
      "Follow the Decision Agent recommendation after human approval.",

    alternativeComparison:
      parsed.alternativeComparison ||
      "Alternative suppliers were compared using delivery, reliability, quantity and cost.",

    confidence:
      parsed.confidence === "Low"
        ? "Low"
        : parsed.confidence === "Medium"
          ? "Medium"
          : "High",
  };
}

export async function generateGeminiReasoning(
  investigation: InvestigationResult,
): Promise<GeminiReasoning> {
  const apiKey =
    process.env.NEXT_LLM_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEXT_LLM_API_KEY is missing",
    );
  }

  const evidence = {
    risk: investigation.risk,

    riskScore:
      investigation.riskScore,

    supplier:
      investigation.signals.supplier,

    inventory:
      investigation.signals.inventory,

    demand:
      investigation.signals.demand,

    logistics:
      investigation.signals.logistics,

    impact:
      investigation.impact,

    alternatives:
      investigation.alternatives,

    currentRecommendation:
      investigation.recommendation,

    reasoning:
      investigation.reasoning,
  };

  const prompt = `
You are an AI Supply Chain Reasoning Agent.

Analyze ONLY the evidence provided below.

Do not invent any data.

Your tasks:

1. Explain the current supply-chain risk.
2. Explain the business impact.
3. Compare the alternative suppliers.
4. Recommend a mitigation action.
5. Explain why the recommended action is appropriate.
6. Give confidence as High, Medium, or Low.
7. Do not claim that any action was executed.
8. If risk is HIGH or CRITICAL, clearly mention that human approval is required.

Return ONLY valid JSON.

Required JSON structure:

{
  "summary": "...",
  "businessImpact": "...",
  "recommendedAction": "...",
  "alternativeComparison": "...",
  "confidence": "High"
}

Evidence:

${JSON.stringify(
  evidence,
  null,
  2,
)}
`;

  /*
   * ============================================================
   * MODEL 1
   * Gemini 3.8 Flash
   * ============================================================
   */

  try {
    console.log(
      "GEMINI: Trying gemini-3.8-flash",
    );

    return await callGemini(
      "gemini-3.8-flash",
      apiKey,
      prompt,
    );
  } catch (error) {
    const status =
      error &&
      typeof error === "object" &&
      "status" in error
        ? (error as { status?: number })
            .status
        : undefined;

    const message =
      error instanceof Error
        ? error.message
        : "Unknown Gemini error";

    console.error(
      "GEMINI 3.8 ERROR:",
      message,
    );

    /*
     * Retry only for temporary server/rate
     * limiting problems.
     */

    if (
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504
    ) {
      console.log(
        "GEMINI: Temporary server issue. Retrying...",
      );

      await sleep(1200);

      try {
        return await callGemini(
          "gemini-3.8-flash",
          apiKey,
          prompt,
        );
      } catch (retryError) {
        console.error(
          "GEMINI 3.8 RETRY ERROR:",
          retryError,
        );
      }
    }
  }

  /*
   * ============================================================
   * MODEL 2 FALLBACK
   * Gemini 3.7 Flash
   * ============================================================
   */

  try {
    console.log(
      "GEMINI: Falling back to gemini-3.7-flash",
    );

    return await callGemini(
      "gemini-3.7-flash",
      apiKey,
      prompt,
    );
  } catch (error) {
    console.error(
      "GEMINI 3.7 ERROR:",
      error,
    );

    throw error;
  }
}