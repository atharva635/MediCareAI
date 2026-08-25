import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RiSunLine, RiMoonLine } from "react-icons/ri";
import "./Navbar.css";

export default function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const getGreeting = () => {
    if (!user) return "Welcome to MediCare AI";
    const firstName = user.fullName.split(" ")[0];
    if (user.role === "doctor") return `Welcome back, Dr. ${firstName}`;
    if (user.role === "consultant") return `Welcome back, Consultant ${firstName}`;
    return `Welcome back, ${firstName}`;
  };

  const getBadge = () => {
    if (!user) return "System Guest";
    if (user.role === "doctor") return "👨‍⚕️ Medical Specialist";
    if (user.role === "consultant") return "💼 Clinical Consultant";
    return "👤 Patient Portal";
  };

  return (
    <div className="navbar glass-panel">
      <div className="nav-left">
        <p className="nav-greeting">{getGreeting()}</p>
        <p className="nav-date">{formattedDate}</p>
      </div>

      <div className="nav-right">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === "light" ? <RiMoonLine /> : <RiSunLine />}
        </button>
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span className="status-text">System Active</span>
        </div>
        <div className="nav-divider"></div>
        <div className="doctor-badge">
          {getBadge()}
        </div>
      </div>
    </div>
  );
}