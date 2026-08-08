import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Barbell, LockKey, ArrowRight, GoogleLogo } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { verifyGate } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function EntryGate() {
  const { gatePassed, passGate, resetGate } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGate = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Enter the invite code");
      return;
    }
    setLoading(true);
    try {
      await verifyGate(code.trim());
      passGate();
      toast.success("Invite accepted");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Invalid invite code";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/board";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(
      redirectUrl
    )}`;
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0A] text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-5">
        <div className="relative hidden lg:col-span-3 lg:block">
          <img
            src="https://images.unsplash.com/photo-1744060204728-f68e434a3edf"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
          <div className="absolute inset-0 bg-[#0A0A0A]/30" />

          <div className="relative z-10 flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-black/60">
                <Barbell size={22} weight="fill" className="text-[#CCFF00]" />
              </div>
              <span className="font-display text-xl font-black uppercase tracking-athletic">
                SweatBoard
              </span>
            </div>

            <div className="max-w-lg">
              <p className="mb-4 text-xs font-bold uppercase tracking-athletic text-[#CCFF00]">
                Friends Fitness · Daily Ranking
              </p>
              <h1 className="font-display text-6xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">
                Log the sweat.
                <br />
                Own the board.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/70">
                Be the ryder you were born to me. Every workout counts. Show
                up, put in the minutes, burn the calories — climb and claim
                the leaderboard.
              </p>
            </div>

            <div className="text-xs uppercase tracking-athletic text-white/40">
              Private circle · Invite only
            </div>
          </div>
        </div>

        <div className="relative col-span-1 flex items-center justify-center px-6 py-16 lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-black/60">
                <Barbell size={22} weight="fill" className="text-[#CCFF00]" />
              </div>
              <span className="font-display text-xl font-black uppercase tracking-athletic">
                SweatBoard
              </span>
            </div>

            {/* Step indicator */}
            <div className="mb-6 flex items-center gap-2">
              <StepDot active label="Step 01" done={gatePassed} testId="step-gate" />
              <div className={`h-px flex-1 ${gatePassed ? "bg-[#CCFF00]" : "bg-white/10"}`} />
              <StepDot active={gatePassed} label="Step 02" testId="step-google" />
            </div>

            <AnimatePresence mode="wait">
              {!gatePassed ? (
                <motion.div
                  key="gate"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="mb-3 text-xs font-bold uppercase tracking-athletic text-white/50">
                    Check In · Invite Code
                  </p>
                  <h2 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">
                    Enter the arena
                  </h2>
                  <p className="mt-4 text-sm text-white/60">
                    Drop the invite code your friend shared. We&apos;ll take
                    you to Google to sign in next.
                  </p>

                  <form onSubmit={handleGate} className="mt-10 space-y-6" data-testid="gate-form">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-athletic text-white/50">
                        Invite Code
                      </label>
                      <div className="relative">
                        <LockKey
                          size={18}
                          weight="bold"
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                          aria-hidden="true"
                        />
                        <Input
                          data-testid="entry-code-input"
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          placeholder="SWEAT2026"
                          className="h-12 rounded-none border-white/15 bg-[#141414] pl-10 text-base uppercase tracking-athletic text-white placeholder:text-white/30 placeholder:normal-case focus-visible:border-[#CCFF00] focus-visible:ring-0"
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      data-testid="gate-submit-btn"
                      type="submit"
                      disabled={loading}
                      className="group h-12 w-full rounded-none bg-[#CCFF00] text-black hover:bg-[#CCFF00]/85 hover:-translate-y-0.5 transition disabled:opacity-60"
                    >
                      <span className="font-display text-base font-black uppercase tracking-athletic">
                        {loading ? "Verifying…" : "Continue"}
                      </span>
                      <ArrowRight
                        size={18}
                        weight="bold"
                        className="ml-2 transition group-hover:translate-x-1"
                      />
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="google"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="mb-3 text-xs font-bold uppercase tracking-athletic text-[#CCFF00]">
                    Invite Accepted · Sign In
                  </p>
                  <h2 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">
                    One tap.
                    <br />
                    You&apos;re in.
                  </h2>
                  <p className="mt-4 text-sm text-white/60">
                    Sign in with Google so friends see your real name and
                    photo on the leaderboard.
                  </p>

                  <div className="mt-10 space-y-3" data-testid="google-panel">
                    <Button
                      data-testid="google-signin-btn"
                      onClick={handleGoogle}
                      className="group h-12 w-full rounded-none bg-white text-black hover:bg-white/90 hover:-translate-y-0.5 transition"
                    >
                      <GoogleLogo size={20} weight="bold" className="mr-2" />
                      <span className="font-display text-base font-black uppercase tracking-athletic">
                        Continue with Google
                      </span>
                    </Button>

                    <button
                      type="button"
                      data-testid="wrong-code-btn"
                      onClick={() => resetGate()}
                      className="w-full text-center text-xs uppercase tracking-athletic text-white/40 hover:text-white/70 transition"
                    >
                      Use a different invite code
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-8 text-xs leading-relaxed text-white/40">
              Your Google name and photo become visible to everyone in your
              invite circle.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label, testId }) {
  return (
    <div
      data-testid={testId}
      className={`flex items-center gap-2 border px-3 py-1.5 ${
        done
          ? "border-[#CCFF00] bg-[#CCFF00]/10 text-[#CCFF00]"
          : active
          ? "border-white/30 bg-white/[0.04] text-white/80"
          : "border-white/10 text-white/30"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          done ? "bg-[#CCFF00]" : active ? "bg-white" : "bg-white/30"
        }`}
      />
      <span className="text-[10px] font-bold uppercase tracking-athletic">
        {label}
      </span>
    </div>
  );
}
