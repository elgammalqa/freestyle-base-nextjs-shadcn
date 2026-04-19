"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useListDeals } from "@/lib/api-client/generated/api";

const STAGE_ORDER: Array<{ key: string; label: string }> = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "closed_won", label: "Won" },
  { key: "closed_lost", label: "Lost" },
];

export function DashboardCharts() {
  const { data: deals } = useListDeals();

  const stageData = useMemo(() => {
    if (!deals) return [];
    const totals = new Map<string, { count: number; value: number }>();
    for (const d of deals) {
      const prev = totals.get(d.stage) ?? { count: 0, value: 0 };
      totals.set(d.stage, {
        count: prev.count + 1,
        value: prev.value + Number(d.value ?? 0),
      });
    }
    return STAGE_ORDER.map((s) => ({
      stage: s.label,
      count: totals.get(s.key)?.count ?? 0,
      value: totals.get(s.key)?.value ?? 0,
    }));
  }, [deals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>
        <CardDescription>Deal value distribution across stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="stage" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} />
              <Tooltip
                formatter={(v: number) =>
                  new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(v)
                }
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
