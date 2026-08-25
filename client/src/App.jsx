import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getCurrentUser } from "./services/authService";
import { setUser, logout, setLoading } from "./redux/slices/authSlice";
import AppRoutes from "./routes/AppRoutes";
import Loader from "./components/Loader";
import { Toaster } from "react-hot-toast";

function App() {
  const dispatch = useDispatch();
  const { loading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          dispatch(setLoading(true));
          const res = await getCurrentUser();
          dispatch(setUser({ user: res.data.user }));
        } catch (err) {
          console.error("Auth initialization failed:", err);
          dispatch(logout());
        }
      } else {
        dispatch(setLoading(false));
      }
    };
    initAuth();
  }, [dispatch, token]);

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#f3f4f6",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          },
        }}
      />
      <AppRoutes />
    </>
  );
}

export default App;