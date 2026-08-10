import { LineChart } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/ui";

import type { PerformanceTrendViewModel } from "../model/types";

type PerformanceTrendSectionProps = {
  trend: PerformanceTrendViewModel;
};

const axisDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const tooltipDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function formatAxisDate(value: string) {
  return axisDateFormatter.format(parseDate(value));
}

function formatTooltipDate(value: string) {
  return tooltipDateFormatter.format(parseDate(value));
}

export function PerformanceTrendSection({
  trend,
}: PerformanceTrendSectionProps) {
  if (trend.points.length === 0) {
    return (
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-center gap-2">
            <LineChart className="text-accent size-4" />
            <CardTitle>Performance trend</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-foreground text-sm leading-7">
            Trend data is not available yet for this scenario.
          </p>
          <p className="text-muted-foreground text-sm">{trend.metricLabel}</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = trend.points.map((point) => ({
    date: point.date,
    value: point.value,
  }));
  const values = trend.points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(Math.round(Math.max(max - min, 1) * 0.12), 12);
  const domain: [number, number] = [Math.max(0, min - padding), max + padding];
  const chartConfig = {
    value: {
      color: "var(--accent)",
      label: trend.metricLabel,
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LineChart className="text-accent size-4" />
              <CardTitle>Performance trend</CardTitle>
            </div>
            <p className="text-muted-foreground text-sm">
              {trend.metricLabel} · {trend.rangeLabel}
            </p>
          </div>
          <span className="bg-success-soft text-success rounded-full px-3 py-1 text-xs font-semibold">
            {trend.directionLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer config={chartConfig} className="w-full">
          <div className="h-72 min-w-0 w-full sm:h-64">
            <ResponsiveContainer
              height="100%"
              initialDimension={{ height: 256, width: 560 }}
              width="100%"
            >
              <RechartsLineChart
                accessibilityLayer
                data={chartData}
                margin={{ bottom: 4, left: 0, right: 8, top: 12 }}
              >
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="date"
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tickFormatter={formatAxisDate}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  dataKey="value"
                  domain={domain}
                  tickLine={false}
                  tickMargin={12}
                  tickCount={4}
                  width={52}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(label) =>
                        formatTooltipDate(String(label))
                      }
                    />
                  }
                  cursor={{ stroke: "var(--divider)", strokeDasharray: "4 4" }}
                />
                <Line
                  activeDot={{
                    fill: "var(--color-value)",
                    r: 6,
                    stroke: "var(--surface)",
                    strokeWidth: 3,
                  }}
                  dataKey="value"
                  dot={{
                    fill: "var(--color-value)",
                    r: 4,
                    stroke: "var(--surface)",
                    strokeWidth: 3,
                  }}
                  stroke="var(--color-value)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  type="linear"
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
