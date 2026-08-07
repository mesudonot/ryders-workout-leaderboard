import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Barbell, LockKey, ArrowRight } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { login } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function EntryGate() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error("Enter your name and invite code");
      return;
    }
    setLoading(true);
    try {
      const res = await login(name.trim(), code.trim());
      signIn(res.user);
      toast.success(`Welcome, ${res.user.name.toUpperCase()}`);
      navigate("/board");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0A] text-white">
      {/* Left column - Hero image + branding */}
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
                Every workout counts. Show up, put in the minutes, burn the
                calories — climb the leaderboard your friends can&apos;t stop
                checking.
              </p>
            </div>

            <div className="text-xs uppercase tracking-athletic text-white/40">
              Private circle · Invite only
            </div>
          </div>
        </div>

        {/* Right column - form */}
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

            <p className="mb-3 text-xs font-bold uppercase tracking-athletic text-white/50">
              Check In
            </p>
            <h2 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">
              Enter the arena
            </h2>
            <p className="mt-4 text-sm text-white/60">
              Drop your name and the invite code your friend shared. No
              passwords, no drama.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-6" data-testid="entry-form">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-athletic text-white/50">
                  Your Name
                </label>
                <Input
                  data-testid="entry-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="h-12 rounded-none border-white/15 bg-[#141414] text-base text-white placeholder:text-white/30 focus-visible:border-[#CCFF00] focus-visible:ring-0"
                  autoFocus
                />
              </div>

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
                  />
                </div>
              </div>

              <Button
                data-testid="entry-submit-btn"
                type="submit"
                disabled={loading}
                className="group h-12 w-full rounded-none bg-[#CCFF00] text-black hover:bg-[#CCFF00]/85 hover:-translate-y-0.5 transition disabled:opacity-60"
              >
                <span className="font-display text-base font-black uppercase tracking-athletic">
                  {loading ? "Checking In…" : "Step On The Board"}
                </span>
                <ArrowRight
                  size={18}
                  weight="bold"
                  className="ml-2 transition group-hover:translate-x-1"
                />
              </Button>

              <p className="text-xs leading-relaxed text-white/40">
                By checking in, your name and workouts become visible to
                everyone in your invite circle.
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
