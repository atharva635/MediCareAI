import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "./Loader";

export default function DashboardRedirect() {
  const { user, token, loading } = useSelector((state) => state.auth);

  if (loading) {
    return <Loader />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "patient") {
    return <Navigate to="/patient/dashboard" replace />;
  } else if (user.role === "doctor") {
    return <Navigate to="/doctor/dashboard" replace />;
  } else if (user.role === "consultant") {
    return <Navigate to="/consultant/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}
