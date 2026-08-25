import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import "./RiskChart.css";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function RiskChart({ stats }) {
  const data = {
    labels: ["Critical", "High", "Medium", "Low"],
    datasets: [
      {
        data: [
          stats.critical,
          stats.high,
          stats.medium,
          stats.low,
        ],
        backgroundColor: [
          "#f43f5e", // Rose
          "#f59e0b", // Amber
          "#06b6d4", // Cyan
          "#10b981", // Emerald
        ],
        borderColor: "rgba(10, 15, 29, 0.8)",
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#9ca3af",
          font: {
            family: "Inter",
            size: 12,
            weight: "600",
          },
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="chart-card glass-panel">
      <h3 className="chart-title">Patient Risk Distribution</h3>
      <div className="chart-wrapper">
        <Pie data={data} options={options} />
      </div>
    </div>
  );
}