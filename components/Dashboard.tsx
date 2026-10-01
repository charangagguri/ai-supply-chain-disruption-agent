"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  Factory,
  Gauge,
  Package,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  UserCheck,
  X,
  Zap,
} from "lucide-react";

import { useState } from "react";
import { scenarios, Scenario } from "@/data/scenarios";

type RiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

type AgentStep = {
  agent: string;
  status:
    | "completed"
    | "warning"
    | "recommendation";
  message: string;
};

type Alternative = {
  name: string;
  deliveryDays: number;
  costIncrease: number;
  quantity: number;
  reliability: number;
  evaluationScore?: number;
};

type Analysis = {
  risk: RiskLevel;
  riskScore: number;
  impact: string;
  shortageRisk: string;
  recommendedSupplier: string;
  recommendation: string;
  reasoning: string[];
  steps: AgentStep[];
};

type SimulationData = {
  supplier: {
    name: string;
    status: "Delayed" | "On Time";
    delayDays: number;
    reliability: number;
  };

  inventory: {
    product: string;
    units: number;
    daysRemaining: number;
  };

  demand: {
    level: "Low" | "Medium" | "High";
    dailyUnits: number;
  };

  logistics: {
    status: "Delayed" | "Normal";
    delayDays: number;
  };
};

type ExecutionResult = {
  success: boolean;
  executionStatus?: string;
  supplier?: string;
  quantity?: number;
  message?: string;

  purchaseOrder?: {
    status: string;
    supplier: string;
    quantity: number;
    priority: string;
  };

  inventoryReservation?: {
    status: string;
    quantity: number;
  };

  logisticsPlan?: {
    status: string;
    supplier: string;
  };

  executionSteps?: Array<{
    step: number;
    agent: string;
    action: string;
    status: string;
    message: string;
  }>;
};

type ApprovalStatus =
  | "PENDING"
  | "APPROVING"
  | "APPROVED"
  | "REJECTING"
  | "REJECTED"
  | "ERROR";

const riskClasses: Record<RiskLevel, string> = {
  LOW: "text-emerald-400",
  MEDIUM: "text-yellow-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-400",
};

const riskBorderClasses: Record<RiskLevel, string> = {
  LOW: "border-emerald-500/30",
  MEDIUM: "border-yellow-500/30",
  HIGH: "border-orange-500/30",
  CRITICAL: "border-red-500/30",
};

export default function Dashboard() {
  const [selectedScenarioId, setSelectedScenarioId] =
    useState("critical-delay");

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [simulation, setSimulation] =
    useState<SimulationData | null>(null);

  const [alternatives, setAlternatives] =
    useState<Alternative[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [simulating, setSimulating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [approvalStatus, setApprovalStatus] =
    useState<ApprovalStatus>("PENDING");

  const [execution, setExecution] =
    useState<ExecutionResult | null>(null);

  const selectedScenario =
    scenarios.find(
      (scenario) =>
        scenario.id === selectedScenarioId
    ) || scenarios[0];

  const currentSupplier =
    simulation?.supplier ||
    selectedScenario.supplier;

  const currentInventory =
    simulation?.inventory ||
    selectedScenario.inventory;

  const currentDemand =
    simulation?.demand ||
    selectedScenario.demand;

  const currentLogistics =
    simulation?.logistics ||
    selectedScenario.logistics;

  const runInvestigation = async () => {
    setLoading(true);
    setError("");
    setExecution(null);
    setApprovalStatus("PENDING");

    try {
      const response = await fetch(
        "/api/investigate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scenarioId:
              selectedScenarioId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Investigation failed."
        );
      }

      setAnalysis(data.analysis);

      setAlternatives(
        data.investigation?.alternatives ||
          selectedScenario.alternatives
      );

      setApprovalStatus("PENDING");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Investigation failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const simulateDisruption = async () => {
    setSimulating(true);
    setError("");

    try {
      const response = await fetch(
        "/api/simulate",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Simulation failed."
        );
      }

      setSimulation(data.data);

      setAnalysis(null);
      setExecution(null);
      setApprovalStatus("PENDING");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Simulation failed."
      );
    } finally {
      setSimulating(false);
    }
  };

  const handleApproval = async (
    approved: boolean
  ) => {
    if (!analysis) {
      setError(
        "Run AI Investigation before approval."
      );
      return;
    }

    setError("");

    setApprovalStatus(
      approved
        ? "APPROVING"
        : "REJECTING"
    );

    try {
      const response = await fetch(
        "/api/approve",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            approved,

            scenarioId:
              selectedScenarioId,

            supplier:
              analysis.recommendedSupplier,

            recommendation:
              analysis.recommendation,

            action: approved
              ? "EXECUTE_MITIGATION"
              : "REJECT_MITIGATION",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Approval failed."
        );
      }

      if (approved) {
        setApprovalStatus("APPROVED");
      } else {
        setApprovalStatus("REJECTED");
      }
    } catch (err) {
      console.error(err);

      setApprovalStatus("ERROR");

      setError(
        err instanceof Error
          ? err.message
          : "Approval failed."
      );
    }
  };

  const executeMitigation = async () => {
    if (!analysis) {
      setError(
        "Run AI Investigation first."
      );
      return;
    }

    if (
      approvalStatus !== "APPROVED"
    ) {
      setError(
        "Human approval is required before execution."
      );
      return;
    }

    setError("");
    setExecution(null);

    try {
      const recommended =
        alternatives.find(
          (supplier) =>
            supplier.name ===
            analysis.recommendedSupplier
        );

      const quantity =
        recommended?.quantity || 5000;

      const response = await fetch(
        "/api/execute",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            scenarioId:
              selectedScenarioId,

            supplier:
              analysis.recommendedSupplier,

            action:
              "PREPARE_MITIGATION_ORDER",

            quantity,
          }),
        }
      );

      const data =
        (await response.json()) as ExecutionResult;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Execution failed."
        );
      }

      setExecution(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Execution failed."
      );
    }
  };

  const risk =
    analysis?.risk || "LOW";

  return (
    <main className="min-h-screen bg-[#06101f] text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-7">

        {/* HEADER */}
        <header className="mb-8 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-7 shadow-2xl">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
                <Bot className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Supply Chain AI Control Center
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Agentic disruption detection &
                  response
                </p>
              </div>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <select
                value={selectedScenarioId}
                onChange={(event) => {
                  setSelectedScenarioId(
                    event.target.value
                  );

                  setAnalysis(null);
                  setExecution(null);
                  setSimulation(null);
                  setApprovalStatus(
                    "PENDING"
                  );
                }}
                className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-medium outline-none focus:border-cyan-400"
              >
                {scenarios.map(
                  (scenario) => (
                    <option
                      key={scenario.id}
                      value={scenario.id}
                    >
                      {scenario.name}
                    </option>
                  )
                )}
              </select>

              <button
                onClick={
                  runInvestigation
                }
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />

                {loading
                  ? "Investigating..."
                  : "Run AI Investigation"}
              </button>

            </div>
          </div>
        </header>

        {/* STATUS BAR */}
        <section className="mb-8 grid gap-4 md:grid-cols-3">

          <StatusCard
            icon={
              <Activity className="h-5 w-5" />
            }
            title="AI AGENTS ONLINE"
            subtitle="Multi-agent workflow ready"
            type="green"
          />

          <StatusCard
            icon={
              <Zap className="h-5 w-5" />
            }
            title="BACKEND CONNECTED"
            subtitle="Investigation & execution APIs ready"
            type="cyan"
          />

          <StatusCard
            icon={
              <UserCheck className="h-5 w-5" />
            }
            title="HUMAN APPROVAL ENABLED"
            subtitle="High-impact actions require approval"
            type="yellow"
          />

        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                System Error
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

            <button
              onClick={() =>
                setError("")
              }
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* LIVE MONITOR */}
        <section className="mb-8 rounded-2xl border border-cyan-500/30 bg-[#071827] p-7">

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-3">
                <RefreshCw className="h-6 w-6 text-cyan-400" />

                <h2 className="text-2xl font-bold">
                  Live Supply Chain Monitor
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-400">
                Simulated supplier, inventory,
                demand and logistics signals
              </p>
            </div>

            <button
              onClick={
                simulateDisruption
              }
              disabled={simulating}
              className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  simulating
                    ? "animate-spin"
                    : ""
                }`}
              />

              {simulating
                ? "Simulating..."
                : "Simulate New Disruption"}
            </button>

          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <MonitorCard
              icon={
                <Factory className="h-5 w-5" />
              }
              label="SUPPLIER"
              title={
                currentSupplier.name
              }
              value={
                currentSupplier.status
              }
              detail={`${currentSupplier.delayDays} day delay • ${currentSupplier.reliability}% reliability`}
              warning={
                currentSupplier.status ===
                "Delayed"
              }
            />

            <MonitorCard
              icon={
                <Package className="h-5 w-5" />
              }
              label="INVENTORY"
              title={
                currentInventory.product
              }
              value={`${currentInventory.units.toLocaleString()} units`}
              detail={`${currentInventory.daysRemaining} days coverage`}
            />

            <MonitorCard
              icon={
                <Gauge className="h-5 w-5" />
              }
              label="DEMAND"
              title={
                currentDemand.level
              }
              value={`${currentDemand.dailyUnits.toLocaleString()} units/day`}
              detail="Current market pressure"
              warning={
                currentDemand.level ===
                "High"
              }
            />

            <MonitorCard
              icon={
                <Truck className="h-5 w-5" />
              }
              label="LOGISTICS"
              title={
                currentLogistics.status
              }
              value={`${currentLogistics.delayDays} day delay`}
              detail="Transportation signal"
              warning={
                currentLogistics.status ===
                "Delayed"
              }
            />

          </div>

          {simulation && (
            <div className="mt-5 flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Live simulation data received
              from{" "}
              <span className="font-mono">
                /api/simulate
              </span>
            </div>
          )}

        </section>

        {/* BASIC SIGNAL CARDS */}
        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <SignalCard
            title="Supplier"
            value={
              currentSupplier.status
            }
            detail={`${currentSupplier.name} • ${currentSupplier.delayDays}d delay`}
            icon={
              <Factory className="h-6 w-6" />
            }
          />

          <SignalCard
            title="Inventory"
            value={`${currentInventory.daysRemaining} days`}
            detail={`${currentInventory.units.toLocaleString()} units available`}
            icon={
              <Package className="h-6 w-6" />
            }
          />

          <SignalCard
            title="Demand"
            value={
              currentDemand.level
            }
            detail={`${currentDemand.dailyUnits.toLocaleString()} units/day`}
            icon={
              <Gauge className="h-6 w-6" />
            }
          />

          <SignalCard
            title="Logistics"
            value={
              currentLogistics.status
            }
            detail={`${currentLogistics.delayDays}d inbound delay`}
            icon={
              <Truck className="h-6 w-6" />
            }
          />

        </section>

        {/* ANALYSIS */}
        {analysis && (
          <>
            <section className="mb-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">

              {/* RISK */}
              <div
                className={`rounded-2xl border ${riskBorderClasses[risk]} bg-slate-900/70 p-7`}
              >

                <div className="flex items-start justify-between">

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Risk Intelligence
                    </p>

                    <h2
                      className={`mt-2 text-4xl font-bold ${riskClasses[risk]}`}
                    >
                      {analysis.risk}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Analysis complete
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-4 text-center">
                    <p className="text-xs text-slate-500">
                      Risk score
                    </p>

                    <p className="mt-1 text-3xl font-bold">
                      {analysis.riskScore}
                      <span className="text-sm text-slate-500">
                        /100
                      </span>
                    </p>
                  </div>

                </div>

                <div className="mt-7 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{
                      width: `${Math.min(
                        analysis.riskScore,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  <MetricRow
                    label="Supplier exposure"
                    value={`${currentSupplier.delayDays} days`}
                  />

                  <MetricRow
                    label="Stock coverage"
                    value={`${currentInventory.daysRemaining} days`}
                  />

                  <MetricRow
                    label="Demand pressure"
                    value={currentDemand.level}
                  />

                  <MetricRow
                    label="Inbound logistics"
                    value={currentLogistics.status}
                  />

                </div>

                <div className="mt-6 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">

                  <div className="flex items-center gap-2 text-cyan-300">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-bold">
                      Business Impact
                    </span>
                  </div>

                  <p className="mt-3 leading-7 text-slate-200">
                    {analysis.impact}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    {analysis.shortageRisk}
                  </p>

                </div>

              </div>

              {/* AGENT TIMELINE */}
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-7">

                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Agent Activity
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Investigation Timeline
                    </h2>
                  </div>

                  <Clock3 className="h-6 w-6 text-slate-400" />
                </div>

                <div className="space-y-4">

                  <TimelineItem
                    title="Investigation Complete"
                    message="All agents completed their analysis."
                    status="completed"
                  />

                  {analysis.steps.map(
                    (step, index) => (
                      <TimelineItem
                        key={`${step.agent}-${index}`}
                        title={step.agent}
                        message={step.message}
                        status={step.status}
                      />
                    )
                  )}

                </div>

              </div>

            </section>

            {/* ALTERNATIVES + DECISION */}
            <section className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">

              {/* ALTERNATIVES */}
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-7">

                <div className="mb-6 flex items-center gap-3">
                  <Route className="h-6 w-6 text-cyan-400" />

                  <div>
                    <h2 className="text-2xl font-bold">
                      Alternative Suppliers
                    </h2>

                    <p className="text-sm text-slate-400">
                      Delivery • cost • quantity • reliability
                    </p>
                  </div>
                </div>

                <div className="space-y-4">

                  {alternatives.map(
                    (supplier) => {
                      const recommended =
                        supplier.name ===
                        analysis.recommendedSupplier;

                      return (
                        <div
                          key={supplier.name}
                          className={`rounded-xl border p-5 ${
                            recommended
                              ? "border-cyan-400/50 bg-cyan-400/5"
                              : "border-slate-700 bg-slate-950/30"
                          }`}
                        >

                          <div className="flex items-start justify-between">

                            <div>
                              <h3 className="text-lg font-bold">
                                {supplier.name}
                              </h3>

                              <p className="mt-1 text-sm text-slate-400">
                                {supplier.quantity.toLocaleString()}{" "}
                                units •{" "}
                                {supplier.reliability}%
                                reliability
                              </p>
                            </div>

                            {recommended && (
                              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                                Recommended
                              </span>
                            )}

                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">

                            <div>
                              <p className="text-slate-500">
                                Delivery
                              </p>
                              <p className="font-semibold">
                                {supplier.deliveryDays} days
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">
                                Cost
                              </p>
                              <p className="font-semibold">
                                +{supplier.costIncrease}%
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">
                                Reliability
                              </p>
                              <p className="font-semibold">
                                {supplier.reliability}%
                              </p>
                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

              {/* DECISION */}
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-7">

                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-cyan-400" />

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Decision Center
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      Next Best Action
                    </h2>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6">

                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                    AI Recommendation
                  </p>

                  <p className="mt-3 text-xl font-bold leading-8">
                    {analysis.recommendation}
                  </p>

                </div>

                {/* REASONING */}
                <div className="mt-7">

                  <h3 className="text-lg font-bold">
                    Agent Reasoning
                  </h3>

                  <div className="mt-4 space-y-3">

                    {analysis.reasoning.map(
                      (reason, index) => (
                        <div
                          key={index}
                          className="flex gap-3 text-sm leading-6 text-slate-300"
                        >
                          <span className="text-cyan-400">
                            →
                          </span>

                          <span>
                            {reason}
                          </span>
                        </div>
                      )
                    )}

                  </div>

                </div>

              </div>

            </section>

            {/* HUMAN APPROVAL */}
            <section className="mb-8 rounded-2xl border border-yellow-500/30 bg-slate-900/70 p-7">

              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Human Approval Gate
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    High-impact mitigation requires human approval
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Recommended supplier:{" "}
                    <span className="font-semibold text-cyan-300">
                      {analysis.recommendedSupplier}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">

                  <button
                    onClick={() =>
                      handleApproval(true)
                    }
                    disabled={
                      approvalStatus ===
                        "APPROVING" ||
                      approvalStatus ===
                        "APPROVED" ||
                      approvalStatus ===
                        "REJECTING"
                    }
                    className="flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-5 w-5" />

                    {approvalStatus ===
                    "APPROVING"
                      ? "Recording..."
                      : approvalStatus ===
                        "APPROVED"
                      ? "Action Approved"
                      : "Approve Action"}
                  </button>

                  <button
                    onClick={() =>
                      handleApproval(false)
                    }
                    disabled={
                      approvalStatus ===
                        "APPROVING" ||
                      approvalStatus ===
                        "REJECTING" ||
                      approvalStatus ===
                        "REJECTED"
                    }
                    className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                    Reject
                  </button>

                </div>

              </div>

              {approvalStatus ===
                "APPROVED" && (
                <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">

                  <div className="flex items-center gap-3 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />

                    <span className="font-bold">
                      Human approval recorded
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-300">
                    Mitigation action is now authorized.
                  </p>

                  <button
                    onClick={
                      executeMitigation
                    }
                    disabled={
                      !!execution
                    }
                    className="mt-5 flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Zap className="h-5 w-5" />

                    {execution
                      ? "Execution Prepared"
                      : "Execute Mitigation"}
                  </button>

                </div>
              )}

              {approvalStatus ===
                "REJECTED" && (
                <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-5">

                  <div className="flex items-center gap-3 text-red-300">
                    <X className="h-5 w-5" />

                    <span className="font-bold">
                      Mitigation rejected
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-400">
                    No execution action was triggered.
                  </p>

                </div>
              )}

            </section>

            {/* EXECUTION RESULT */}
            {execution && (
              <section className="mb-8 rounded-2xl border border-emerald-500/30 bg-[#071b19] p-7">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <Zap className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
                        Execution Agent
                      </p>

                      <h2 className="mt-1 text-2xl font-bold">
                        Mitigation Execution Ready
                      </h2>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300">
                    {execution.executionStatus ||
                      "EXECUTION_READY"}
                  </span>

                </div>

                <p className="mt-5 text-slate-300">
                  {execution.message}
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">

                  <ExecutionCard
                    title="Purchase Order"
                    status={
                      execution
                        .purchaseOrder
                        ?.status ||
                      "PREPARED"
                    }
                    detail={`${execution.purchaseOrder?.supplier || execution.supplier || "Supplier"} • ${execution.purchaseOrder?.quantity || execution.quantity || 0} units`}
                    icon={
                      <Package className="h-5 w-5" />
                    }
                  />

                  <ExecutionCard
                    title="Inventory Reservation"
                    status={
                      execution
                        .inventoryReservation
                        ?.status ||
                      "RESERVED"
                    }
                    detail={`${execution.inventoryReservation?.quantity || execution.quantity || 0} units reserved`}
                    icon={
                      <ShieldCheck className="h-5 w-5" />
                    }
                  />

                  <ExecutionCard
                    title="Logistics Route"
                    status={
                      execution
                        .logisticsPlan
                        ?.status ||
                      "ROUTE_PREPARED"
                    }
                    detail={`Inbound route for ${execution.logisticsPlan?.supplier || execution.supplier || "supplier"}`}
                    icon={
                      <Truck className="h-5 w-5" />
                    }
                  />

                </div>

                {execution.executionSteps &&
                  execution.executionSteps.length >
                    0 && (
                    <div className="mt-7">

                      <h3 className="mb-4 text-lg font-bold">
                        Execution Timeline
                      </h3>

                      <div className="space-y-3">

                        {execution.executionSteps.map(
                          (step) => (
                            <div
                              key={step.step}
                              className="flex items-start gap-4 rounded-xl border border-slate-700/70 bg-slate-950/40 p-4"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                                <Check className="h-4 w-4" />
                              </div>

                              <div>
                                <p className="font-semibold">
                                  {step.agent}
                                </p>

                                <p className="text-sm text-cyan-300">
                                  {step.action}
                                </p>

                                <p className="mt-1 text-sm text-slate-400">
                                  {step.message}
                                </p>
                              </div>
                            </div>
                          )
                        )}

                      </div>

                    </div>
                  )}

              </section>
            )}
          </>
        )}

        {/* EMPTY STATE */}
        {!analysis && !loading && (
          <section className="mb-8 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
              <Bot className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              AI Investigation Ready
            </h2>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Select a supply-chain scenario and
              run the AI investigation. The
              multi-agent system will analyze
              supplier, inventory, demand and
              logistics signals before recommending
              a mitigation action.
            </p>

            <button
              onClick={
                runInvestigation
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300"
            >
              <Sparkles className="h-5 w-5" />
              Start Investigation
            </button>

          </section>
        )}

        {/* FOOTER */}
        <footer className="border-t border-slate-800 pt-6 text-center text-sm text-slate-500">

          <p>
            AI Supply Chain Disruption Response Agent
          </p>

          <p className="mt-1">
            Hackathon MVP • Multi-Agent AI • Human-in-the-Loop • Simulated Enterprise Data
          </p>

        </footer>

      </div>
    </main>
  );
}

/* =========================
   STATUS CARD
========================= */

function StatusCard({
  icon,
  title,
  subtitle,
  type,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  type: "green" | "cyan" | "yellow";
}) {
  const classes = {
    green:
      "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    cyan:
      "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
    yellow:
      "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
  };

  return (
    <div
      className={`rounded-2xl border p-5 ${classes[type]}`}
    >
      <div className="flex items-center gap-3">

        <div className="h-3 w-3 rounded-full bg-current" />

        <div className="flex-1">
          <div className="flex items-center gap-2 font-bold">
            {icon}
            {title}
          </div>

          <p className="mt-1 text-sm text-slate-400">
            {subtitle}
          </p>
        </div>

      </div>
    </div>
  );
}

/* =========================
   MONITOR CARD
========================= */

function MonitorCard({
  icon,
  label,
  title,
  value,
  detail,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-5">

      <div className="flex items-center justify-between">

        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        <span className="text-cyan-400">
          {icon}
        </span>

      </div>

      <h3 className="mt-5 text-lg font-bold">
        {title}
      </h3>

      <p
        className={`mt-1 text-xl font-semibold ${
          warning
            ? "text-yellow-300"
            : "text-slate-200"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {detail}
      </p>

    </div>
  );
}

/* =========================
   SIGNAL CARD
========================= */

function SignalCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6">

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {title}
        </p>

        <span className="text-cyan-400">
          {icon}
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {detail}
      </p>

    </div>
  );
}

/* =========================
   METRIC ROW
========================= */

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/30 px-4 py-3">

      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span className="font-semibold">
        {value}
      </span>

    </div>
  );
}

/* =========================
   TIMELINE
========================= */

function TimelineItem({
  title,
  message,
  status,
}: {
  title: string;
  message: string;
  status:
    | "completed"
    | "warning"
    | "recommendation";
}) {
  const isWarning =
    status === "warning";

  const isRecommendation =
    status === "recommendation";

  return (
    <div className="flex gap-4">

      <div
        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isWarning
            ? "bg-yellow-400/10 text-yellow-400"
            : isRecommendation
            ? "bg-cyan-400/10 text-cyan-400"
            : "bg-emerald-400/10 text-emerald-400"
        }`}
      >
        {isWarning ? (
          <AlertTriangle className="h-4 w-4" />
        ) : isRecommendation ? (
          <Sparkles className="h-4 w-4" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0">

        <p className="font-semibold">
          {title}
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          {message}
        </p>

      </div>

    </div>
  );
}

/* =========================
   EXECUTION CARD
========================= */

function ExecutionCard({
  title,
  status,
  detail,
  icon,
}: {
  title: string;
  status: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-slate-950/30 p-5">

      <div className="flex items-center gap-3 text-emerald-400">
        {icon}

        <span className="font-semibold">
          {title}
        </span>
      </div>

      <p className="mt-4 text-lg font-bold text-emerald-300">
        {status}
      </p>

      <p className="mt-1 text-sm text-slate-400">
        {detail}
      </p>

    </div>
  );
}