import { Scenario } from "@/data/scenarios";

export type SupplierStatus = {
  name: string;
  status: "Delayed" | "On Time";
  delayDays: number;
  reliability: number;
};

export type InventoryStatus = {
  product: string;
  units: number;
  daysRemaining: number;
};

export type DemandStatus = {
  level: "Low" | "Medium" | "High";
  dailyUnits: number;
};

export type LogisticsStatus = {
  status: "Delayed" | "Normal";
  delayDays: number;
};

export type AlternativeSupplier = {
  name: string;
  deliveryDays: number;
  costIncrease: number;
  quantity: number;
  reliability: number;
};

/**
 * Supplier Tool
 * Retrieves supplier health and delay information.
 */
export function getSupplierStatus(
  scenario: Scenario,
): SupplierStatus {
  return {
    name: scenario.supplier.name,
    status: scenario.supplier.status,
    delayDays: scenario.supplier.delayDays,
    reliability: scenario.supplier.reliability,
  };
}

/**
 * Inventory Tool
 * Retrieves current stock and coverage.
 */
export function getInventoryStatus(
  scenario: Scenario,
): InventoryStatus {
  return {
    product: scenario.inventory.product,
    units: scenario.inventory.units,
    daysRemaining: scenario.inventory.daysRemaining,
  };
}

/**
 * Demand Tool
 * Retrieves current demand pressure.
 */
export function getDemandStatus(
  scenario: Scenario,
): DemandStatus {
  return {
    level: scenario.demand.level,
    dailyUnits: scenario.demand.dailyUnits,
  };
}

/**
 * Logistics Tool
 * Retrieves inbound logistics condition.
 */
export function getLogisticsStatus(
  scenario: Scenario,
): LogisticsStatus {
  return {
    status: scenario.logistics.status,
    delayDays: scenario.logistics.delayDays,
  };
}

/**
 * Alternative Supplier Tool
 * Searches available backup suppliers.
 */
export function findAlternativeSuppliers(
  scenario: Scenario,
): AlternativeSupplier[] {
  return scenario.alternatives.map((supplier) => ({
    name: supplier.name,
    deliveryDays: supplier.deliveryDays,
    costIncrease: supplier.costIncrease,
    quantity: supplier.quantity,
    reliability: supplier.reliability,
  }));
}

/**
 * Risk Tool
 * Correlates multiple independent signals.
 */
export function calculateRisk(input: {
  supplier: SupplierStatus;
  inventory: InventoryStatus;
  demand: DemandStatus;
  logistics: LogisticsStatus;
}) {
  let score = 0;
  const reasons: string[] = [];

  if (input.supplier.delayDays >= 5) {
    score += 35;
    reasons.push(
      `Supplier delay is ${input.supplier.delayDays} days.`,
    );
  } else if (input.supplier.delayDays > 0) {
    score += 20;
    reasons.push(
      `Supplier has a ${input.supplier.delayDays}-day delay.`,
    );
  }

  if (input.inventory.daysRemaining <= 2) {
    score += 30;
    reasons.push(
      `Inventory covers only ${input.inventory.daysRemaining} days.`,
    );
  } else if (input.inventory.daysRemaining <= 5) {
    score += 15;
    reasons.push(
      `Inventory coverage is ${input.inventory.daysRemaining} days.`,
    );
  }

  if (input.demand.level === "High") {
    score += 20;
    reasons.push("Demand pressure is high.");
  } else if (input.demand.level === "Medium") {
    score += 10;
    reasons.push("Demand pressure is medium.");
  }

  if (input.logistics.delayDays >= 2) {
    score += 15;
    reasons.push(
      `Inbound logistics has a ${input.logistics.delayDays}-day delay.`,
    );
  } else if (input.logistics.delayDays > 0) {
    score += 8;
    reasons.push(
      `Inbound logistics has a ${input.logistics.delayDays}-day delay.`,
    );
  }

  const risk =
    score >= 80
      ? "CRITICAL"
      : score >= 60
        ? "HIGH"
        : score >= 35
          ? "MEDIUM"
          : "LOW";

  return {
    score,
    risk,
    reasons,
  };
}

/**
 * Business Impact Tool
 * Determines whether current stock can absorb the disruption.
 */
export function calculateBusinessImpact(input: {
  supplierDelayDays: number;
  inventoryDays: number;
  logisticsDelayDays: number;
  demandLevel: string;
}) {
  const disruptionExposure =
    input.supplierDelayDays + input.logisticsDelayDays;

  const shortage =
    input.inventoryDays < disruptionExposure;

  return {
    shortageRisk: shortage
      ? "Production shortage risk"
      : "Manageable disruption",

    disruptionExposure,

    impact: shortage
      ? "Production shortage is likely if no mitigation is taken."
      : "Production can absorb the disruption with current inventory.",

    demandPressure:
      input.demandLevel === "High"
        ? "High demand increases the speed at which available inventory will be consumed."
        : "Demand pressure is limited.",
  };
}

/**
 * Alternative Evaluation Tool
 * Compares backup suppliers using multiple business factors.
 */
export function evaluateAlternatives(
  suppliers: AlternativeSupplier[],
) {
  const evaluated = suppliers.map((supplier) => {
    const score =
      supplier.reliability -
      supplier.deliveryDays * 5 -
      supplier.costIncrease * 1.5 +
      Math.min(supplier.quantity / 1000, 10);

    return {
      ...supplier,
      evaluationScore: Number(score.toFixed(2)),
    };
  });

  return evaluated.sort(
    (a, b) => b.evaluationScore - a.evaluationScore,
  );
}