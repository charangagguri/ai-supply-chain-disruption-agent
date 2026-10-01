import { Scenario } from "@/data/scenarios";

export type AgentStep = {
  agent: string;
  status: "completed" | "warning" | "recommendation";
  message: string;
};
export type Analysis = {
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number; impact: string; shortageRisk: string;
  recommendedSupplier: string; recommendation: string;
  reasoning: string[]; steps: AgentStep[];
};

export function analyzeScenario(s: Scenario): Analysis {
  const steps: AgentStep[] = [], reasoning: string[] = [];
  steps.push({ agent:"Supplier Agent", status:s.supplier.status==="Delayed"?"warning":"completed",
    message:s.supplier.status==="Delayed"?`${s.supplier.name} reports a ${s.supplier.delayDays}-day delay.`:`${s.supplier.name} is operating on schedule.` });
  steps.push({ agent:"Inventory Agent", status:s.inventory.daysRemaining<=2?"warning":"completed",
    message:`${s.inventory.product}: ${s.inventory.units.toLocaleString()} units, ${s.inventory.daysRemaining} days of coverage.` });
  steps.push({ agent:"Demand Agent", status:s.demand.level==="High"?"warning":"completed",
    message:`${s.demand.level} demand at ${s.demand.dailyUnits.toLocaleString()} units/day.` });
  steps.push({ agent:"Logistics Agent", status:s.logistics.status==="Delayed"?"warning":"completed",
    message:s.logistics.status==="Delayed"?`Inbound logistics delayed by ${s.logistics.delayDays} days.`:"Inbound logistics is normal." });

  let score = 0;
  if (s.supplier.delayDays >= 5) score += 35; else if (s.supplier.delayDays > 0) score += 20;
  if (s.inventory.daysRemaining <= 2) score += 30; else if (s.inventory.daysRemaining <= 5) score += 15;
  if (s.demand.level === "High") score += 20; else if (s.demand.level === "Medium") score += 10;
  if (s.logistics.delayDays >= 2) score += 15; else if (s.logistics.delayDays > 0) score += 8;
  const risk = score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";

  steps.push({ agent:"Risk Agent", status:risk==="LOW"?"completed":"warning",
    message:`Correlated risk score: ${score}/100 (${risk}).` });

  const shortage = s.inventory.daysRemaining < s.supplier.delayDays + s.logistics.delayDays;
  const impact = shortage ? "Production shortage is likely if no mitigation is taken." : "Production can absorb the disruption with current inventory.";
  reasoning.push(`Inventory covers ${s.inventory.daysRemaining} days while inbound disruption exposure is ${s.supplier.delayDays+s.logistics.delayDays} days.`);
  reasoning.push(`${s.demand.level} demand creates ${s.demand.level==="High"?"additional":"limited"} pressure on available stock.`);
  reasoning.push(`Current disruption score is ${score}/100.`);
  steps.push({ agent:"Impact Agent", status:shortage?"warning":"completed", message:impact });

  const alternatives = [...s.alternatives].sort((a,b) => {
    const as = a.reliability-a.deliveryDays*5-a.costIncrease*1.5+Math.min(a.quantity/1000,10);
    const bs = b.reliability-b.deliveryDays*5-b.costIncrease*1.5+Math.min(b.quantity/1000,10);
    return bs-as;
  });
  const best = alternatives[0];
  steps.push({ agent:"Alternative Agent", status:"recommendation",
    message:`Compared ${alternatives.length} alternatives using delivery time, cost, quantity and reliability.` });

  const recommendation = shortage
    ? `Use ${best.name} as the mitigation supplier and prioritize current inventory for high-demand orders.`
    : `Keep the primary supplier active and prepare ${best.name} as a contingency option.`;
  reasoning.push(`${best.name} offers ${best.deliveryDays}-day delivery, ${best.reliability}% reliability and ${best.quantity.toLocaleString()} units.`);
  reasoning.push("The recommendation balances delivery speed, cost increase, quantity and reliability.");
  steps.push({ agent:"Decision Agent", status:"recommendation", message:recommendation });

  return { risk, riskScore:score, impact, shortageRisk:shortage?"Production shortage risk":"Manageable disruption",
    recommendedSupplier:best.name, recommendation, reasoning, steps };
}
