"use client";
import { Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  Legend,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";

interface EnergyChartProps {
  chartData: any;
}

interface EnergyChartData {
  time: string;
  managedElectricPower: string;
  unmanagedElectricPower: string;
}

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
    icon: Activity,
  },
} satisfies ChartConfig;

function renderBlackLegendText(value: string) {
  return <span style={{ color: "black" }}>{value}</span>;
}

export function EnergyChart({ chartData }: EnergyChartProps) {

  const [data, setData] = useState<EnergyChartData[] | null>(null);

  useEffect(() => {
    if (chartData && Object.keys(chartData).length !== 0) {
      let dataSet: EnergyChartData[] = [];
      const managedDataArray: any[] =
        chartData["simulation_results_with_management.csv"];
      const unmanagedDataArray: any[] =
        chartData["simulation_results_without_management.csv"];

      const first24hDataLength = 48;
      for (let i = 0; i < first24hDataLength; i++) {
        const dataItem: EnergyChartData = {
          time: managedDataArray[i].TimeOfDay,
          managedElectricPower: managedDataArray[i].Total_Demand_kW,
          unmanagedElectricPower: unmanagedDataArray[i].Total_Demand_kW,
        };
        dataSet.push(dataItem);
      }

      setData(dataSet);
    }
  }, [chartData]);

  return (
    <ChartContainer
      className="min-h-[200px] w-full font-semibold"
      config={chartConfig}>
      <AreaChart
        accessibilityLayer
        data={data || []}
        margin={{
          left: 12,
          right: 12,
          bottom: 50,
        }}>
        <CartesianGrid vertical={false} />
        <Legend
          verticalAlign="top"
          iconType="square"
          wrapperStyle={{ top: -40 }}
          formatter={renderBlackLegendText}
        />
        <XAxis
          interval={1}
          type="category"
          dataKey="time"
          tickLine={false}
          tickMargin={12}
          angle={-45}
          stroke="black">
          <Label position="bottom" value="Time" dy={10} />
        </XAxis>
        <YAxis axisLine={false} tickLine={false} type="number">
          <Label
            position="insideLeft"
            dx={-10}
            angle={-90}
            value="Electric Power (kW)"
          />
        </YAxis>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Area
          name="With Energy Management"
          dataKey="managedElectricPower"
          type="step"
          fill="#4285F4"
          fillOpacity={0.4}
          stroke="#4285F4"
        />
        <Area
          name="Without Energy Management"
          dataKey="unmanagedElectricPower"
          type="step"
          fill="#DB4437"
          fillOpacity={0.4}
          stroke="#DB4437"
        />
      </AreaChart>
    </ChartContainer>
  );
}
