import "@/App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import EntryGate from "@/pages/EntryGate";
import Dashboard from "@/pages/Dashboard";
import AuthCallback from "@/pages/AuthCallback";
import { Toaster } from "sonner";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/enter" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#CCFF00]" />
    </div>
  );
}

function EntryOrDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/board" replace /> : <EntryGate />;
}

function AppRoutes() {
  const location = useLocation();
  // Detect OAuth callback fragment synchronously during render
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/board" replace />} />
      <Route path="/enter" element={<EntryOrDashboard />} />
      <Route
        path="/board"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              style: {
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
