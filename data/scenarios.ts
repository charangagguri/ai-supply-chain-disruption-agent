export type Scenario = {
  id: string; name: string; description: string;
  supplier: { name: string; status: "Delayed" | "On Time"; delayDays: number; reliability: number };
  inventory: { product: string; units: number; daysRemaining: number };
  demand: { level: "Low" | "Medium" | "High"; dailyUnits: number };
  logistics: { status: "Delayed" | "Normal"; delayDays: number };
  alternatives: Array<{ name: string; deliveryDays: number; costIncrease: number; quantity: number; reliability: number }>;
};

export const scenarios: Scenario[] = [
  {
    id: "critical-delay", name: "Critical Supplier Delay",
    description: "Supplier delay + low inventory + high demand + logistics delay",
    supplier: { name: "Supplier A", status: "Delayed", delayDays: 5, reliability: 71 },
    inventory: { product: "EV Battery Cells", units: 2400, daysRemaining: 2 },
    demand: { level: "High", dailyUnits: 1200 },
    logistics: { status: "Delayed", delayDays: 2 },
    alternatives: [
      { name: "Supplier B", deliveryDays: 2, costIncrease: 6, quantity: 5000, reliability: 94 },
      { name: "Supplier C", deliveryDays: 3, costIncrease: 3, quantity: 3500, reliability: 89 },
      { name: "Supplier D", deliveryDays: 1, costIncrease: 12, quantity: 2200, reliability: 97 }
    ]
  },
  {
    id: "moderate-risk", name: "Moderate Logistics Risk",
    description: "Supplier stable, but logistics is slowing inbound delivery",
    supplier: { name: "Supplier A", status: "On Time", delayDays: 0, reliability: 96 },
    inventory: { product: "Power Modules", units: 5600, daysRemaining: 5 },
    demand: { level: "High", dailyUnits: 900 },
    logistics: { status: "Delayed", delayDays: 3 },
    alternatives: [
      { name: "Supplier B", deliveryDays: 3, costIncrease: 5, quantity: 6000, reliability: 94 },
      { name: "Supplier C", deliveryDays: 4, costIncrease: 2, quantity: 7000, reliability: 90 }
    ]
  }
];
