import { NextResponse } from "next/server";

import { scenarios } from "@/data/scenarios";
import { investigateSupplyChain } from "@/lib/orchestrator";
import { generateGeminiReasoning } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const scenarioId =
      body?.scenarioId ?? "critical-delay";

    const scenario = scenarios.find(
      (item) => item.id === scenarioId,
    );

    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: "Scenario not found",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------
    // STEP 1: Run deterministic multi-agent investigation
    // --------------------------------------------------

    const investigation =
      investigateSupplyChain(scenario);

    // --------------------------------------------------
    // STEP 2: Ask Gemini reasoning agent
    // --------------------------------------------------

    let geminiReasoning = null;

    try {
      geminiReasoning =
        await generateGeminiReasoning(
          investigation,
        );
    } catch (error) {
      console.error(
        "Gemini reasoning failed:",
        error,
      );

      // Failure boundary:
      // If Gemini is unavailable, the deterministic
      // investigation still remains usable.
      geminiReasoning = {
        summary:
          "Gemini reasoning unavailable. Using deterministic agent analysis.",
        businessImpact:
          investigation.impact.impact,
        recommendedAction:
          investigation.recommendation,
        alternativeComparison:
          "Alternative suppliers were evaluated using the deterministic scoring engine.",
        confidence: "Medium" as const,
      };
    }

    // --------------------------------------------------
    // STEP 3: Build dashboard-compatible analysis
    // --------------------------------------------------

    const analysis = {
      risk: investigation.risk,

      riskScore:
        investigation.riskScore,

      impact:
        geminiReasoning.businessImpact ||
        investigation.impact.impact,

      shortageRisk:
        investigation.impact.shortageRisk,

      recommendedSupplier:
        investigation.recommendedSupplier,

      recommendation:
        geminiReasoning.recommendedAction ||
        investigation.recommendation,

      reasoning: [
        ...investigation.reasoning,

        geminiReasoning.summary,

        geminiReasoning.alternativeComparison,

        `Gemini confidence: ${geminiReasoning.confidence}`,
      ],

      steps:
        investigation.events.map(
          (event) => ({
            agent: event.agent,
            status: event.status,
            message: event.message,
          }),
        ),

      geminiReasoning,
    };

    // --------------------------------------------------
    // STEP 4: Return complete agent investigation
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      scenario,

      analysis,

      investigation,

      ai: {
        provider: "Gemini",
        reasoningAgent: true,
        humanApprovalRequired:
          investigation.humanApprovalRequired,
      },
    });
  } catch (error) {
    console.error(
      "Investigation error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Investigation failed",
      },
      { status: 500 },
    );
  }
}