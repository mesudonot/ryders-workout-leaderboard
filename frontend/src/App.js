import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import EntryGate from "@/pages/EntryGate";
import Dashboard from "@/pages/Dashboard";
import { Toaster } from "sonner";

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/enter" replace />;
  return children;
}

function EntryOrDashboard() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? <Navigate to="/board" replace /> : <EntryGate />;
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>
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
    </div>
  );
}
