"use client";

import { useEffect, useState } from "react";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Factory,
  Gauge,
  PackageSearch,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";

import { scenarios, Scenario } from "@/data/scenarios";
import { Analysis } from "@/lib/agent";

type ApprovalStatus =
  | "PENDING"
  | "APPROVING"
  | "APPROVED"
  | "REJECTED"
  | "ERROR";

export default function Dashboard() {
  const [scenarioId, setScenarioId] =
    useState("critical-delay");

  const [scenario, setScenario] =
    useState<Scenario>(scenarios[0]);

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [running, setRunning] =
    useState(false);

  const [approvalStatus, setApprovalStatus] =
    useState<ApprovalStatus>("PENDING");

  const [approvalMessage, setApprovalMessage] =
    useState("");

  const [executionStatus, setExecutionStatus] =
    useState("");

  /*
   * Update selected scenario
   */
  useEffect(() => {
    setScenario(
      scenarios.find(
        (s) => s.id === scenarioId,
      ) ?? scenarios[0],
    );

    setAnalysis(null);

    setApprovalStatus("PENDING");
    setApprovalMessage("");
    setExecutionStatus("");
  }, [scenarioId]);

  /*
   * RUN AI INVESTIGATION
   */
  async function run() {
    setRunning(true);

    setAnalysis(null);

    setApprovalStatus("PENDING");
    setApprovalMessage("");
    setExecutionStatus("");

    try {
      const response = await fetch(
        "/api/investigate",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            scenarioId,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Investigation failed",
        );
      }

      setScenario(data.scenario);
      setAnalysis(data.analysis);
    } catch (error) {
      console.error(
        "Investigation error:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to run AI investigation.",
      );
    } finally {
      setRunning(false);
    }
  }

  /*
   * HUMAN APPROVAL
   *
   * This calls the backend /api/approve
   * instead of only changing local UI state.
   */
  async function handleApproval(
    approved: boolean,
  ) {
    if (!analysis) {
      return;
    }

    setApprovalStatus("APPROVING");
    setApprovalMessage("");
    setExecutionStatus("");

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
            scenarioId,
            action:
              analysis.recommendation,
            approved,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Approval request failed",
        );
      }

      if (approved) {
        setApprovalStatus("APPROVED");

        setApprovalMessage(
          data?.message ||
            "Human approval recorded.",
        );

        setExecutionStatus(
          data?.execution?.status ||
            "READY_FOR_EXECUTION",
        );
      } else {
        setApprovalStatus("REJECTED");

        setApprovalMessage(
          data?.message ||
            "Mitigation action was rejected.",
        );

        setExecutionStatus("");
      }
    } catch (error) {
      console.error(
        "Approval error:",
        error,
      );

      setApprovalStatus("ERROR");

      setApprovalMessage(
        error instanceof Error
          ? error.message
          : "Approval request failed.",
      );
    }
  }

  /*
   * SIGNAL CARDS
   */
  const cards = [
    [
      "Supplier",
      scenario.supplier.status,
      `${scenario.supplier.name} • ${scenario.supplier.delayDays}d delay`,
      Factory,
    ],
    [
      "Inventory",
      `${scenario.inventory.daysRemaining} days`,
      `${scenario.inventory.units.toLocaleString()} units available`,
      PackageSearch,
    ],
    [
      "Demand",
      scenario.demand.level,
      `${scenario.demand.dailyUnits.toLocaleString()} units/day`,
      Gauge,
    ],
    [
      "Logistics",
      scenario.logistics.status,
      `${scenario.logistics.delayDays}d inbound delay`,
      Truck,
    ],
  ];

  return (
    <main className="min-h-screen grid-bg">
      <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-7 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-5 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
              <Bot />
            </div>

            <div>
              <h1 className="text-xl font-bold">
                Supply Chain AI Control Center
              </h1>

              <p className="text-sm text-slate-400">
                Agentic disruption detection & response
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-3">

            {/* SCENARIO SELECTOR */}

            <label className="relative">

              <select
                value={scenarioId}
                onChange={(e) =>
                  setScenarioId(
                    e.target.value,
                  )
                }
                className="appearance-none rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 pr-10 text-sm"
              >
                {scenarios.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                  >
                    {s.name}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4" />

            </label>

            {/* RUN INVESTIGATION */}

            <button
              onClick={run}
              disabled={running}
              className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />

              {running
                ? "Agents Running..."
                : "Run AI Investigation"}
            </button>

          </div>

        </header>

        {/* =====================================================
            SIGNAL CARDS
        ====================================================== */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {cards.map(
            ([title, value, subtitle, IconComponent]) => {
              const Icon =
                IconComponent as React.ElementType;

              return (
                <div
                  key={title as string}
                  className="rounded-2xl border border-white/10 bg-white/[.035] p-5"
                >

                  <div className="mb-5 flex justify-between text-sm text-slate-400">

                    {title}

                    <span className="text-cyan-300">
                      <Icon />
                    </span>

                  </div>

                  <div className="text-2xl font-bold">
                    {value as string}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {subtitle as string}
                  </div>

                </div>
              );
            },
          )}

        </section>

        {/* =====================================================
            RISK + AGENT ACTIVITY
        ====================================================== */}

        <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">

          {/* ===================================================
              RISK INTELLIGENCE
          ==================================================== */}

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">

            <div className="flex justify-between">

              <div>

                <p className="text-xs uppercase tracking-[.2em] text-slate-500">
                  Risk intelligence
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {analysis?.risk ??
                    "READY"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {analysis
                    ? "Analysis complete"
                    : "Run investigation to correlate signals"}
                </p>

              </div>

              <div className="rounded-xl border border-white/10 px-4 py-3 text-right">

                <p className="text-xs text-slate-500">
                  Risk score
                </p>

                <p className="text-2xl font-bold">

                  {analysis?.riskScore ??
                    0}

                  <span className="text-sm text-slate-500">
                    /100
                  </span>

                </p>

              </div>

            </div>

            {/* RISK BAR */}

            <div className="mt-7 h-3 overflow-hidden rounded-full bg-slate-800">

              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                style={{
                  width: `${
                    analysis?.riskScore ??
                    0
                  }%`,
                }}
              />

            </div>

            {/* SIGNAL SUMMARY */}

            <div className="mt-7 grid gap-3 md:grid-cols-2">

              {[
                [
                  "Supplier exposure",
                  `${scenario.supplier.delayDays} days`,
                ],
                [
                  "Stock coverage",
                  `${scenario.inventory.daysRemaining} days`,
                ],
                [
                  "Demand pressure",
                  scenario.demand.level,
                ],
                [
                  "Inbound logistics",
                  scenario.logistics.status,
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between rounded-xl border border-white/10 px-4 py-3 text-sm"
                  >
                    <span className="text-slate-400">
                      {label}
                    </span>

                    <b>{value}</b>
                  </div>
                ),
              )}

            </div>

            {/* BUSINESS IMPACT */}

            {analysis && (
              <div className="mt-7 rounded-2xl border border-cyan-400/20 bg-cyan-400/[.04] p-5">

                <div className="flex gap-2 text-sm font-semibold text-cyan-300">

                  <ShieldCheck className="h-4 w-4" />

                  Business impact

                </div>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {analysis.impact}
                </p>

              </div>
            )}

          </div>

          {/* ===================================================
              AGENT ACTIVITY
          ==================================================== */}

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">

            <div className="flex justify-between">

              <div>

                <p className="text-xs uppercase tracking-[.2em] text-slate-500">
                  Agent activity
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Investigation timeline
                </h2>

              </div>

              <Clock3 />

            </div>

            <div className="mt-6 space-y-4">

              {analysis ? (
                analysis.steps.map(
                  (step, index) => (
                    <div
                      key={`${step.agent}-${index}`}
                      className="flex gap-3"
                    >

                      <div className="flex flex-col items-center">

                        <div
                          className={`rounded-full p-2 ${
                            step.status ===
                            "warning"
                              ? "bg-amber-400/10 text-amber-300"
                              : step.status ===
                                  "recommendation"
                                ? "bg-cyan-400/10 text-cyan-300"
                                : "bg-emerald-400/10 text-emerald-300"
                          }`}
                        >

                          {step.status ===
                          "warning" ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : step.status ===
                            "recommendation" ? (
                            <Sparkles className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}

                        </div>

                        {index <
                          analysis.steps
                            .length -
                            1 && (
                          <div className="mt-1 h-7 w-px bg-white/10" />
                        )}

                      </div>

                      <div>

                        <p className="text-sm font-semibold">
                          {step.agent}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {step.message}
                        </p>

                      </div>

                    </div>
                  ),
                )
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-500">

                  Run the investigation to execute the
                  multi-step agent workflow.

                </div>
              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            ALTERNATIVES + DECISION
        ====================================================== */}

        <section className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">

          {/* ===================================================
              ALTERNATIVE SUPPLIERS
          ==================================================== */}

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">

            <div className="flex items-center gap-2">

              <Route className="text-cyan-300" />

              <h2 className="text-xl font-bold">
                Alternative suppliers
              </h2>

            </div>

            <p className="mt-1 text-sm text-slate-500">
              Delivery • cost • quantity • reliability
            </p>

            <div className="mt-5 space-y-3">

              {scenario.alternatives.map(
                (alternative) => (
                  <div
                    key={alternative.name}
                    className={`rounded-xl border p-4 ${
                      analysis?.recommendedSupplier ===
                      alternative.name
                        ? "border-cyan-400/40 bg-cyan-400/[.05]"
                        : "border-white/10"
                    }`}
                  >

                    <div className="flex justify-between">

                      <div>

                        <b>
                          {alternative.name}
                        </b>

                        <p className="mt-1 text-xs text-slate-500">
                          {alternative.quantity.toLocaleString()}{" "}
                          units
                          {" • "}
                          {alternative.reliability}%
                          reliability
                        </p>

                      </div>

                      {analysis?.recommendedSupplier ===
                        alternative.name && (
                        <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-300">
                          Recommended
                        </span>
                      )}

                    </div>

                    <div className="mt-3 flex gap-4 text-xs text-slate-400">

                      <span>
                        {alternative.deliveryDays} days
                      </span>

                      <span>
                        +{alternative.costIncrease}%
                        cost
                      </span>

                    </div>

                  </div>
                ),
              )}

            </div>

          </div>

          {/* ===================================================
              DECISION CENTER
          ==================================================== */}

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">

            <div className="flex items-center gap-2">

              <Sparkles className="text-cyan-300" />

              <h2 className="text-xl font-bold">
                Decision center
              </h2>

            </div>

            {analysis ? (
              <>

                {/* RECOMMENDATION */}

                <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/[.04] p-5">

                  <p className="text-xs uppercase tracking-[.18em] text-cyan-300">
                    Next best action
                  </p>

                  <p className="mt-3 text-lg font-semibold leading-7">
                    {analysis.recommendation}
                  </p>

                </div>

                {/* REASONING */}

                <div className="mt-5">

                  <p className="font-semibold">
                    Agent reasoning
                  </p>

                  <ul className="mt-3 space-y-2">

                    {analysis.reasoning.map(
                      (reason) => (
                        <li
                          key={reason}
                          className="flex gap-2 text-sm leading-6 text-slate-400"
                        >

                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />

                          {reason}

                        </li>
                      ),
                    )}

                  </ul>

                </div>

                {/* =================================================
                    HUMAN APPROVAL GATE
                ================================================== */}

                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-5">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="text-xs uppercase tracking-[.18em] text-slate-500">
                        Human approval gate
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        High-impact mitigation requires
                        human approval before execution.
                      </p>

                    </div>

                    {analysis.risk ===
                      "HIGH" ||
                    analysis.risk ===
                      "CRITICAL" ? (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                        Approval Required
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Low Impact
                      </span>
                    )}

                  </div>

                  {/* APPROVAL BUTTONS */}

                  <div className="mt-5 flex flex-wrap gap-3">

                    <button
                      onClick={() =>
                        handleApproval(true)
                      }
                      disabled={
                        approvalStatus ===
                          "APPROVING" ||
                        approvalStatus ===
                          "APPROVED"
                      }
                      className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      <CheckCircle2 className="h-4 w-4" />

                      {approvalStatus ===
                      "APPROVING"
                        ? "Recording Approval..."
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
                        "APPROVING"
                      }
                      className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      <XCircle className="h-4 w-4" />

                      Reject

                    </button>

                  </div>

                  {/* =================================================
                      APPROVAL RESULT
                  ================================================== */}

                  {approvalStatus ===
                    "APPROVED" && (
                    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[.05] px-4 py-4">

                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">

                        <CheckCircle2 className="h-4 w-4" />

                        Human approval recorded

                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {approvalMessage}
                      </p>

                      <div className="mt-3 rounded-lg border border-emerald-400/10 bg-emerald-400/[.04] px-3 py-2">

                        <p className="text-xs text-slate-500">
                          Execution status
                        </p>

                        <p className="mt-1 text-sm font-semibold text-emerald-300">
                          {executionStatus ||
                            "READY_FOR_EXECUTION"}
                        </p>

                      </div>

                    </div>
                  )}

                  {/* REJECTED */}

                  {approvalStatus ===
                    "REJECTED" && (
                    <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.05] px-4 py-4">

                      <div className="flex items-center gap-2 text-sm font-semibold text-red-300">

                        <XCircle className="h-4 w-4" />

                        Action Rejected

                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {approvalMessage}
                      </p>

                    </div>
                  )}

                  {/* ERROR */}

                  {approvalStatus ===
                    "ERROR" && (
                    <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.05] px-4 py-4">

                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">

                        <AlertTriangle className="h-4 w-4" />

                        Approval Error

                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {approvalMessage}
                      </p>

                    </div>
                  )}

                </div>

              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-7 text-sm text-slate-500">

                Decision Agent output will appear after
                investigation.

              </div>
            )}

          </div>

        </section>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <footer className="mt-7 flex justify-between border-t border-white/10 py-6 text-xs text-slate-600">

          <span>
            AI Supply Chain Disruption Response Agent •
            Hackathon MVP
          </span>

          <span>
            Human-in-the-loop • Simulated enterprise data
          </span>

        </footer>

      </div>
    </main>
  );
}