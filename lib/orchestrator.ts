import { Scenario } from "@/data/scenarios";
import {
  calculateBusinessImpact,
  calculateRisk,
  evaluateAlternatives,
  findAlternativeSuppliers,
  getDemandStatus,
  getInventoryStatus,
  getLogisticsStatus,
  getSupplierStatus,
} from "@/lib/agents/tools";

export type InvestigationEvent = {
  id: number;
  agent: string;
  action: string;
  status: "completed" | "warning" | "recommendation";
  message: string;
};

export type InvestigationResult = {
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;

  signals: {
    supplier: ReturnType<typeof getSupplierStatus>;
    inventory: ReturnType<typeof getInventoryStatus>;
    demand: ReturnType<typeof getDemandStatus>;
    logistics: ReturnType<typeof getLogisticsStatus>;
  };

  impact: ReturnType<typeof calculateBusinessImpact>;

  alternatives: ReturnType<typeof evaluateAlternatives>;

  recommendedSupplier: string;
  recommendation: string;

  reasoning: string[];

  events: InvestigationEvent[];

  humanApprovalRequired: boolean;
};

/**
 * Main AI Supply Chain Orchestrator
 *
 * Responsible for coordinating the multi-step investigation.
 */
export function investigateSupplyChain(
  scenario: Scenario,
): InvestigationResult {
  const events: InvestigationEvent[] = [];

  let eventId = 1;

  // --------------------------------------------------
  // STEP 1 — Supplier Agent
  // --------------------------------------------------

  const supplier = getSupplierStatus(scenario);

  events.push({
    id: eventId++,
    agent: "Supplier Agent",
    action: "getSupplierStatus",
    status:
      supplier.status === "Delayed"
        ? "warning"
        : "completed",
    message:
      supplier.status === "Delayed"
        ? `${supplier.name} reports a ${supplier.delayDays}-day delay with ${supplier.reliability}% reliability.`
        : `${supplier.name} is operating on schedule with ${supplier.reliability}% reliability.`,
  });

  // --------------------------------------------------
  // STEP 2 — Inventory Agent
  // --------------------------------------------------

  const inventory = getInventoryStatus(scenario);

  events.push({
    id: eventId++,
    agent: "Inventory Agent",
    action: "getInventoryStatus",
    status:
      inventory.daysRemaining <= 2
        ? "warning"
        : "completed",
    message: `${inventory.product}: ${inventory.units.toLocaleString()} units available with ${inventory.daysRemaining} days of coverage.`,
  });

  // --------------------------------------------------
  // STEP 3 — Demand Agent
  // --------------------------------------------------

  const demand = getDemandStatus(scenario);

  events.push({
    id: eventId++,
    agent: "Demand Agent",
    action: "getDemandStatus",
    status:
      demand.level === "High"
        ? "warning"
        : "completed",
    message: `${demand.level} demand detected at ${demand.dailyUnits.toLocaleString()} units/day.`,
  });

  // --------------------------------------------------
  // STEP 4 — Logistics Agent
  // --------------------------------------------------

  const logistics = getLogisticsStatus(scenario);

  events.push({
    id: eventId++,
    agent: "Logistics Agent",
    action: "getLogisticsStatus",
    status:
      logistics.status === "Delayed"
        ? "warning"
        : "completed",
    message:
      logistics.status === "Delayed"
        ? `Inbound logistics is delayed by ${logistics.delayDays} days.`
        : "Inbound logistics is operating normally.",
  });

  // --------------------------------------------------
  // STEP 5 — Risk Agent
  // --------------------------------------------------

  const risk = calculateRisk({
    supplier,
    inventory,
    demand,
    logistics,
  });

  events.push({
    id: eventId++,
    agent: "Risk Agent",
    action: "calculateRisk",
    status:
      risk.risk === "LOW"
        ? "completed"
        : "warning",
    message: `Correlated ${risk.score}/100 risk from supplier, inventory, demand and logistics signals. Classification: ${risk.risk}.`,
  });

  // --------------------------------------------------
  // STEP 6 — Business Impact Agent
  // --------------------------------------------------

  const impact = calculateBusinessImpact({
    supplierDelayDays: supplier.delayDays,
    inventoryDays: inventory.daysRemaining,
    logisticsDelayDays: logistics.delayDays,
    demandLevel: demand.level,
  });

  events.push({
    id: eventId++,
    agent: "Impact Agent",
    action: "calculateBusinessImpact",
    status: impact.shortageRisk === "Production shortage risk"
      ? "warning"
      : "completed",
    message: impact.impact,
  });

  // --------------------------------------------------
  // STEP 7 — Alternative Supplier Agent
  // --------------------------------------------------

  const alternatives = findAlternativeSuppliers(
    scenario,
  );

  const evaluatedAlternatives =
    evaluateAlternatives(alternatives);

  const bestSupplier =
    evaluatedAlternatives[0];

  events.push({
    id: eventId++,
    agent: "Alternative Supplier Agent",
    action: "findAlternativeSuppliers + evaluateAlternatives",
    status: "recommendation",
    message: `Compared ${evaluatedAlternatives.length} alternative suppliers using delivery time, cost, quantity and reliability.`,
  });

  // --------------------------------------------------
  // STEP 8 — Decision Agent
  // --------------------------------------------------

  const recommendation =
    impact.shortageRisk ===
    "Production shortage risk"
      ? `Use ${bestSupplier.name} as the mitigation supplier and prioritize current inventory for high-demand orders.`
      : `Keep ${supplier.name} active and prepare ${bestSupplier.name} as a contingency supplier.`;

  const reasoning = [
    `Supplier exposure is ${supplier.delayDays} days while current inventory covers ${inventory.daysRemaining} days.`,
    `Inbound logistics adds another ${logistics.delayDays} days of disruption exposure.`,
    `${demand.level} demand is consuming approximately ${demand.dailyUnits.toLocaleString()} units per day.`,
    `Combined disruption risk is ${risk.score}/100 (${risk.risk}).`,
    `${bestSupplier.name} provides ${bestSupplier.deliveryDays}-day delivery, ${bestSupplier.reliability}% reliability and ${bestSupplier.quantity.toLocaleString()} units.`,
    `The alternative evaluation balances delivery speed, reliability, quantity and additional cost.`,
  ];

  events.push({
    id: eventId++,
    agent: "Decision Agent",
    action: "recommendAction",
    status: "recommendation",
    message: recommendation,
  });

  // --------------------------------------------------
  // STEP 9 — Human Approval Gate
  // --------------------------------------------------

  const humanApprovalRequired =
    risk.risk === "HIGH" ||
    risk.risk === "CRITICAL";

  events.push({
    id: eventId++,
    agent: "Human Approval Gate",
    action: "requestApproval",
    status: humanApprovalRequired
      ? "warning"
      : "completed",
    message: humanApprovalRequired
      ? "High-impact mitigation requires human approval before execution."
      : "No critical intervention detected; human approval is optional.",
  });

  // --------------------------------------------------
  // FINAL RESULT
  // --------------------------------------------------

  return {
    risk: risk.risk,
    riskScore: risk.score,

    signals: {
      supplier,
      inventory,
      demand,
      logistics,
    },

    impact,

    alternatives: evaluatedAlternatives,

    recommendedSupplier:
      bestSupplier.name,

    recommendation,

    reasoning,

    events,

    humanApprovalRequired,
  };
}