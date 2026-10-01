import { NextResponse } from "next/server";
import { scenarios } from "@/data/scenarios";
import { analyzeScenario } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scenario = scenarios.find(s => s.id === (body?.scenarioId ?? "critical-delay"));
    if (!scenario) return NextResponse.json({error:"Scenario not found"}, {status:404});
    return NextResponse.json({scenario, analysis:analyzeScenario(scenario)});
  } catch {
    return NextResponse.json({error:"Invalid request"}, {status:400});
  }
}
