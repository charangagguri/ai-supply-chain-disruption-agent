import { NextResponse } from "next/server";

type ExecuteRequest = {
  scenarioId?: string;
  supplier?: string;
  action?: string;
  quantity?: number;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as ExecuteRequest;

    const {
      scenarioId,
      supplier,
      action,
      quantity,
    } = body;

    if (!scenarioId) {
      return NextResponse.json(
        {
          success: false,
          error: "Scenario ID is required.",
        },
        { status: 400 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier is required.",
        },
        { status: 400 }
      );
    }

    const executedAction =
      action ||
      "PREPARE_MITIGATION_ORDER";

    const orderQuantity =
      quantity || 5000;

    // Simulated enterprise execution workflow
    const executionSteps = [
      {
        step: 1,
        agent: "Execution Agent",
        action: "Validate approved mitigation",
        status: "completed",
        message:
          "Human-approved mitigation validated.",
      },

      {
        step: 2,
        agent: "Procurement Agent",
        action: "Prepare supplier order",
        status: "completed",
        message:
          `Purchase order prepared for ${supplier}.`,
      },

      {
        step: 3,
        agent: "Inventory Agent",
        action: "Reserve incoming quantity",
        status: "completed",
        message:
          `${orderQuantity.toLocaleString()} units reserved for mitigation.`,
      },

      {
        step: 4,
        agent: "Logistics Agent",
        action: "Prepare inbound routing",
        status: "completed",
        message:
          `Inbound logistics routing prepared for ${supplier}.`,
      },

      {
        step: 5,
        agent: "Execution Agent",
        action: "Finalize mitigation",
        status: "completed",
        message:
          "Mitigation execution package is ready.",
      },
    ];

    return NextResponse.json({
      success: true,

      executionStatus:
        "EXECUTION_READY",

      scenarioId,

      supplier,

      action: executedAction,

      quantity: orderQuantity,

      executionSteps,

      purchaseOrder: {
        status: "PREPARED",
        supplier,
        quantity: orderQuantity,
        priority: "HIGH",
      },

      inventoryReservation: {
        status: "RESERVED",
        quantity: orderQuantity,
      },

      logisticsPlan: {
        status: "ROUTE_PREPARED",
        supplier,
      },

      message:
        `Mitigation execution prepared successfully using ${supplier}.`,

      executedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Execution API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Execution failed.",
      },
      { status: 500 }
    );
  }
}