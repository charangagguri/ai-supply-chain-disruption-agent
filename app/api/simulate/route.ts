import { NextResponse } from "next/server";

export async function GET() {
  const suppliers = [
    {
      name: "Supplier A",
      status: "Delayed",
      delayDays: 5,
      reliability: 71,
    },
    {
      name: "Supplier B",
      status: "On Time",
      delayDays: 0,
      reliability: 94,
    },
    {
      name: "Supplier C",
      status: "Delayed",
      delayDays: 2,
      reliability: 89,
    },
  ];

  const products = [
    {
      product: "EV Battery Cells",
      units: 2400,
      daysRemaining: 2,
    },
    {
      product: "Power Modules",
      units: 5600,
      daysRemaining: 5,
    },
    {
      product: "Control Units",
      units: 7200,
      daysRemaining: 8,
    },
  ];

  const demands = [
    {
      level: "High",
      dailyUnits: 1200,
    },
    {
      level: "Medium",
      dailyUnits: 700,
    },
    {
      level: "Low",
      dailyUnits: 350,
    },
  ];

  const logistics = [
    {
      status: "Delayed",
      delayDays: 2,
    },
    {
      status: "Delayed",
      delayDays: 3,
    },
    {
      status: "Normal",
      delayDays: 0,
    },
  ];

  const supplier =
    suppliers[
      Math.floor(
        Math.random() *
          suppliers.length,
      )
    ];

  const inventory =
    products[
      Math.floor(
        Math.random() *
          products.length,
      )
    ];

  const demand =
    demands[
      Math.floor(
        Math.random() *
          demands.length,
      )
    ];

  const logistic =
    logistics[
      Math.floor(
        Math.random() *
          logistics.length,
      )
    ];

  return NextResponse.json({
    success: true,

    timestamp:
      new Date().toISOString(),

    data: {
      supplier,
      inventory,
      demand,
      logistics: logistic,
    },
  });
}