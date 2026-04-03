import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Welcome from "./pages/Welcome";
import UserAvailability from "./pages/UserAvailability";
import MentorAvailability from "./pages/MentorAvailability";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";

const WELCOME_PATH = "/welcome";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const welcomeTo = location.search ? `${WELCOME_PATH}${location.search}` : WELCOME_PATH;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={welcomeTo} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const welcomeTo = location.search ? `${WELCOME_PATH}${location.search}` : WELCOME_PATH;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to={welcomeTo} replace />;
  if (user.role === "MENTOR") return <Navigate to="/mentor" replace />;
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  return <Navigate to="/availability" replace />;
}

function NormalizePathname({ children }) {
  const location = useLocation();
  const pathname = location.pathname;
  if (pathname.startsWith("//")) {
    const fixed = pathname.replace(/\/+/g, "/") + location.search;
    return <Navigate to={fixed} replace />;
  }
  return children;
}

export default function App() {
  return (
    <NormalizePathname>
      <Routes>
        <Route path={WELCOME_PATH} element={<Welcome />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultRedirect />} />
        <Route
          path="availability"
          element={
            <ProtectedRoute allowedRoles={["USER", "ADMIN"]}>
              <UserAvailability />
            </ProtectedRoute>
          }
        />
        <Route
          path="mentor"
          element={
            <ProtectedRoute allowedRoles={["MENTOR"]}>
              <MentorAvailability />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </NormalizePathname>
  );
}
