import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createSession } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, passGate } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;

    if (!sessionId) {
      navigate("/enter", { replace: true });
      return;
    }

    (async () => {
      try {
        const res = await createSession(sessionId);
        setUser(res.user);
        passGate();
        // Clear the hash from URL and navigate
        window.history.replaceState(null, "", "/board");
        navigate("/board", { replace: true, state: { user: res.user } });
        toast.success(`Welcome, ${res.user.name}`);
      } catch (e) {
        toast.error("Sign in failed. Please try again.");
        navigate("/enter", { replace: true });
      }
    })();
  }, [location.hash, navigate, setUser, passGate]);

  return (
    <div
      data-testid="auth-callback"
      className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#CCFF00]" />
        <p className="font-display text-sm font-black uppercase tracking-athletic text-white/60">
          Signing you in…
        </p>
      </div>
    </div>
  );
}
