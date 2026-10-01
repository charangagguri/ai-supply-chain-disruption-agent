import { NextResponse } from "next/server";

import { scenarios, Scenario } from "@/data/scenarios";
import { investigateSupplyChain } from "@/lib/orchestrator";
import { generateGeminiReasoning } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const scenarioId =
      body?.scenarioId ?? "critical-delay";

    const baseScenario = scenarios.find(
      (item) => item.id === scenarioId
    );

    if (!baseScenario) {
      return NextResponse.json(
        {
          success: false,
          error: "Scenario not found",
        },
        { status: 404 }
      );
    }

    /*
      If Live Supply Chain Monitor generated
      new data, use that data for investigation.
    */

    let scenario: Scenario = baseScenario;

    if (body?.liveData) {
      const live = body.liveData;

      scenario = {
        ...baseScenario,

        supplier: {
          name:
            live.supplier?.name ??
            baseScenario.supplier.name,

          status:
            live.supplier?.status ??
            baseScenario.supplier.status,

          delayDays:
            live.supplier?.delayDays ??
            baseScenario.supplier.delayDays,

          reliability:
            live.supplier?.reliability ??
            baseScenario.supplier.reliability,
        },

        inventory: {
          product:
            live.inventory?.product ??
            baseScenario.inventory.product,

          units:
            live.inventory?.units ??
            baseScenario.inventory.units,

          daysRemaining:
            live.inventory?.daysRemaining ??
            baseScenario.inventory.daysRemaining,
        },

        demand: {
          level:
            live.demand?.level ??
            baseScenario.demand.level,

          dailyUnits:
            live.demand?.dailyUnits ??
            baseScenario.demand.dailyUnits,
        },

        logistics: {
          status:
            live.logistics?.status ??
            baseScenario.logistics.status,

          delayDays:
            live.logistics?.delayDays ??
            baseScenario.logistics.delayDays,
        },
      };
    }

    /*
      STEP 1:
      Run deterministic multi-agent investigation
    */

    const investigation =
      investigateSupplyChain(scenario);

    /*
      STEP 2:
      Ask Gemini reasoning agent
    */

    let geminiReasoning = null;

    try {
      geminiReasoning =
        await generateGeminiReasoning(
          investigation
        );
    } catch (error) {
      console.error(
        "Gemini reasoning failed:",
        error
      );

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

    /*
      STEP 3:
      Combine agent + Gemini results
    */

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
          })
        ),

      geminiReasoning,
    };

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

      source:
        body?.liveData
          ? "LIVE_SIMULATION"
          : "SCENARIO",
    });
  } catch (error) {
    console.error(
      "Investigation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Investigation failed",
      },
      {
        status: 500,
      }
    );
  }
}