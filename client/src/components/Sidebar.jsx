import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { logoutUser } from "../services/authService";
import {
  RiDashboardLine,
  RiHeartPulseLine,
  RiHistoryLine,
  RiUser3Line,
  RiLogoutBoxRLine,
  RiCalendarEventLine,
} from "react-icons/ri";
import "./Sidebar.css";

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Backend logout sync failed:", err);
    }
    dispatch(logout());
    navigate("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    return `/${user.role}/dashboard`;
  };

  const getUserRoleLabel = () => {
    if (!user) return "User";
    if (user.role === "doctor") return "Medical Officer";
    if (user.role === "consultant") return "Specialist Consultant";
    return "Patient Profile";
  };

  return (
    <div className="sidebar glass-panel">
      <div className="sidebar-brand">
        <span className="brand-icon">🏥</span>
        <h2>MediCare AI</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to={getDashboardLink()}
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <RiDashboardLine className="nav-icon" />
          <span>Dashboard</span>
        </NavLink>

        {user?.role === "doctor" && (
          <>
            <NavLink
              to="/assessment"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <RiHeartPulseLine className="nav-icon" />
              <span>Assessment</span>
            </NavLink>

            <NavLink
              to="/doctor/appointments"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <RiCalendarEventLine className="nav-icon" />
              <span>Appointments</span>
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <RiHistoryLine className="nav-icon" />
              <span>History</span>
            </NavLink>
          </>
        )}

        {user?.role === "patient" && (
          <NavLink
            to="/patient/appointments"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <RiCalendarEventLine className="nav-icon" />
            <span>Appointments</span>
          </NavLink>
        )}

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
        >
          <RiUser3Line className="nav-icon" />
          <span>Profile</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="doctor-info">
          <div className="doctor-avatar">
            {user?.fullName ? user.fullName[0].toUpperCase() : "U"}
          </div>
          <div className="doctor-details">
            <p className="doctor-name">
              {user?.role === "doctor" ? "Dr. " : ""}{user?.fullName || "User"}
            </p>
            <p className="doctor-role">{getUserRoleLabel()}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <RiLogoutBoxRLine className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}