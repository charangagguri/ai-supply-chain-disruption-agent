import { NextResponse } from "next/server";

type ApprovalRequest = {
  scenarioId?: string;
  action?: string;
  approved?: boolean;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as ApprovalRequest;

    const {
      scenarioId,
      action,
      approved,
    } = body;

    if (!scenarioId) {
      return NextResponse.json(
        {
          success: false,
          error: "Scenario ID is required.",
        },
        { status: 400 },
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: "Mitigation action is required.",
        },
        { status: 400 },
      );
    }

    if (approved !== true) {
      return NextResponse.json({
        success: true,
        status: "REJECTED",
        message:
          "Mitigation action was rejected by the human decision maker.",
        scenarioId,
        action,
      });
    }

    // Execution boundary:
    // The AI does NOT directly execute external
    // supply-chain actions.
    //
    // This endpoint records the human approval
    // and returns an execution-ready state.

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      message:
        "Human approval recorded. Mitigation is ready for execution.",
      scenarioId,
      action,
      execution: {
        status: "READY_FOR_EXECUTION",
        executed: false,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Approval API error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Approval request failed.",
      },
      { status: 500 },
    );
  }
}