import {
  RiGroupLine,
  RiHeartPulseLine,
  RiAlertLine,
  RiInformationLine,
  RiCheckboxCircleLine,
} from "react-icons/ri";
import "./DashboardCards.css";

export default function DashboardCards({ stats }) {
  const cardsData = [
    {
      title: "Total Patients",
      value: stats.totalPatients,
      icon: <RiGroupLine className="card-icon" />,
      type: "total",
    },
    {
      title: "Critical Risk",
      value: stats.critical,
      icon: <RiHeartPulseLine className="card-icon" />,
      type: "critical",
    },
    {
      title: "High Risk",
      value: stats.high,
      icon: <RiAlertLine className="card-icon" />,
      type: "high",
    },
    {
      title: "Medium Risk",
      value: stats.medium,
      icon: <RiInformationLine className="card-icon" />,
      type: "medium",
    },
    {
      title: "Low Risk",
      value: stats.low,
      icon: <RiCheckboxCircleLine className="card-icon" />,
      type: "low",
    },
  ];

  return (
    <div className="dashboard-cards-container">
      {cardsData.map((card, index) => (
        <div key={index} className={`stat-card glass-panel glass-panel-hover ${card.type}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">{card.title}</span>
            <div className="stat-icon-wrapper">{card.icon}</div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-value">{card.value}</span>
            <span className="stat-card-trend">Live Sync</span>
          </div>
        </div>
      ))}
    </div>
  );
}