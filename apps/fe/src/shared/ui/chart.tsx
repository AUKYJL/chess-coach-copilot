import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/shared/lib/cn";

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | {
        color?: string;
        theme?: never;
      }
    | {
        color?: never;
        theme: Record<string, string>;
      }
  );
};

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />.");
  }

  return context;
}

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ReactNode;
};

function getColorToken(item: ChartConfig[string]): string | undefined {
  if ("color" in item) {
    return item.color;
  }

  if ("theme" in item && item.theme) {
    return item.theme.light ?? Object.values(item.theme)[0];
  }

  return undefined;
}

function getChartStyle(config: ChartConfig) {
  const style: Record<string, string> = {};

  for (const [key, item] of Object.entries(config)) {
    const color = getColorToken(item);

    if (color) {
      style[`--color-${key}`] = color;
    }
  }

  return style as React.CSSProperties;
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ children, className, config, style, ...props }, ref) => (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-slot="chart"
        className={cn(
          "relative text-xs",
          "[&_.recharts-cartesian-axis-line]:stroke-transparent",
          "[&_.recharts-cartesian-axis-tick-line]:stroke-transparent",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid-horizontal_line]:stroke-divider",
          "[&_.recharts-cartesian-grid-vertical_line]:stroke-divider",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-responsive-container]:!h-full",
          "[&_.recharts-responsive-container]:!min-w-0",
          "[&_.recharts-responsive-container]:!w-full",
          className,
        )}
        style={{ ...getChartStyle(config), ...style }}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  ),
);

ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsPrimitive.Tooltip;

type ChartTooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  fill?: string;
  name?: string | number;
  payload?: Record<string, unknown>;
  value?: React.ReactNode;
};

type TooltipFormatter = (
  value: React.ReactNode,
  name: string,
  item: ChartTooltipPayloadItem,
  index: number,
) => React.ReactNode | [React.ReactNode, React.ReactNode];

type TooltipLabelFormatter = (
  label: React.ReactNode,
  payload: ChartTooltipPayloadItem[],
) => React.ReactNode;

type ChartTooltipContentProps = React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: React.ReactNode;
  color?: string;
  formatter?: TooltipFormatter;
  hideIndicator?: boolean;
  hideLabel?: boolean;
  indicator?: "dashed" | "dot" | "line";
  labelClassName?: string;
  labelFormatter?: TooltipLabelFormatter;
  labelKey?: string;
  nameKey?: string;
};

function getConfigEntry(
  config: ChartConfig,
  item: ChartTooltipPayloadItem,
  nameKey?: string,
) {
  const payloadName =
    nameKey && typeof item.payload?.[nameKey] === "string"
      ? item.payload[nameKey]
      : undefined;
  const dataKey = typeof item.dataKey === "string" ? item.dataKey : undefined;
  const name = typeof item.name === "string" ? item.name : undefined;

  const key = payloadName ?? dataKey ?? name;

  return key ? config[key] : undefined;
}

function renderIndicator(
  indicator: "dashed" | "dot" | "line",
  indicatorColor: string | undefined,
) {
  const style = indicatorColor
    ? { backgroundColor: indicatorColor, borderColor: indicatorColor }
    : undefined;

  if (indicator === "line") {
    return (
      <span
        aria-hidden="true"
        className="mt-1 h-3 w-0.5 rounded-full"
        style={style}
      />
    );
  }

  if (indicator === "dashed") {
    return (
      <span
        aria-hidden="true"
        className="mt-1 h-0.5 w-3 border-t border-dashed"
        style={style}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="mt-1 size-2 shrink-0 rounded-full"
      style={style}
    />
  );
}

function toRenderableNode(value: unknown): React.ReactNode {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (React.isValidElement(value) || Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return null;
}

function toTooltipFormatterName(value: React.ReactNode) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }

  return "";
}

function toLegendItemKey(value: React.ReactNode, index: number) {
  if (typeof value === "string" || typeof value === "number") {
    return `${value}-${index}`;
  }

  return `legend-item-${index}`;
}

function ChartTooltipContent({
  active,
  className,
  color,
  formatter,
  hideIndicator = false,
  hideLabel = false,
  indicator = "dot",
  label,
  labelClassName,
  labelFormatter,
  labelKey,
  nameKey,
  payload,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  const rawLabel =
    labelKey && payload[0]?.payload?.[labelKey] !== undefined
      ? payload[0].payload[labelKey]
      : label;
  const normalizedLabel = toRenderableNode(rawLabel);
  const resolvedLabel = hideLabel
    ? null
    : labelFormatter
      ? labelFormatter(normalizedLabel, payload)
      : normalizedLabel;

  return (
    <div
      className={cn(
        "border-border bg-surface grid min-w-40 gap-2 rounded-2xl border px-3 py-2 text-xs shadow-[0_16px_40px_-28px_rgba(32,33,36,0.38)]",
        className,
      )}
    >
      {resolvedLabel ? (
        <p className={cn("text-foreground font-medium", labelClassName)}>
          {resolvedLabel}
        </p>
      ) : null}

      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.value !== null && item.value !== undefined)
          .map((item, index) => {
            const configEntry = getConfigEntry(config, item, nameKey);
            const indicatorColor =
              color ??
              item.color ??
              item.fill ??
              (configEntry ? getColorToken(configEntry) : undefined);
            const defaultName =
              configEntry?.label ??
              (typeof item.name === "string" ? item.name : item.dataKey);

            let resolvedName: React.ReactNode = defaultName;
            let resolvedValue: React.ReactNode = item.value;

            if (formatter) {
              const formatted = formatter(
                item.value,
                toTooltipFormatterName(defaultName),
                item,
                index,
              );

              if (Array.isArray(formatted)) {
                [resolvedValue, resolvedName] = formatted;
              } else if (formatted !== undefined) {
                resolvedValue = formatted;
              }
            }

            return (
              <div
                key={`${item.dataKey ?? item.name ?? index}`}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex min-w-0 items-start gap-2">
                  {hideIndicator
                    ? null
                    : renderIndicator(indicator, indicatorColor)}
                  <span className="text-muted-foreground truncate">
                    {resolvedName}
                  </span>
                </div>
                <span className="text-foreground shrink-0 font-semibold tabular-nums">
                  {resolvedValue}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

type ChartLegendContentProps = React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  payload?: Array<{
    color?: string;
    value?: React.ReactNode;
  }>;
};

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
}: ChartLegendContentProps) {
  if (!payload?.length) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      {payload.map((item, index) => (
        <div
          key={toLegendItemKey(item.value, index)}
          className="flex items-center gap-1.5"
        >
          {hideIcon ? null : (
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span className="text-muted-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
};
