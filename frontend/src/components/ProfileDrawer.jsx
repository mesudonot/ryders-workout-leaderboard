import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  Flame,
  Timer,
  Fire,
  PersonSimpleRun,
  Barbell,
  PersonSimpleTaiChi,
  PersonSimpleWalk,
  Sparkle,
  PencilSimple,
  Trash,
  Medal,
} from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getUserHistory, deleteWorkout } from "@/lib/api";

const typeConfig = {
  Running: { icon: PersonSimpleRun, accent: "#FF3B30", label: "Running" },
  Weights: { icon: Barbell, accent: "#CCFF00", label: "Weights" },
  Yoga: { icon: PersonSimpleTaiChi, accent: "#007AFF", label: "Yoga" },
  Walk: { icon: PersonSimpleWalk, accent: "#14B8A6", label: "Walk" },
  Other: { icon: Sparkle, accent: "#F59E0B", label: "Other" },
};

const initialFrom = (name) =>
  (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const dateLine = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function ProfileDrawer({
  userId,
  open,
  onOpenChange,
  currentUserId,
  onEdit,
  onChanged,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isMe = userId && userId === currentUserId;

  const load = useMemo(
    () => async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const res = await getUserHistory(userId);
        setData(res);
      } catch (e) {
        toast.error("Could not load profile");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!open || !userId) return;
    load();
  }, [open, userId, load]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteWorkout(pendingDelete.id);
      toast.success("Workout deleted");
      setPendingDelete(null);
      await load();
      onChanged?.();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not delete";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="profile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.aside
              key="profile-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              data-testid="profile-drawer"
              role="dialog"
              aria-modal="true"
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0A0A0A] text-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
                <div className="flex items-center gap-4">
                  {data?.user?.picture ? (
                    <img
                      src={data.user.picture}
                      alt=""
                      aria-hidden="true"
                      className="h-14 w-14 border border-white/15 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center border border-white/15 bg-[#141414] font-display text-lg font-black uppercase text-white/70">
                      {initialFrom(data?.user?.name)}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-athletic text-[#CCFF00]">
                      {isMe ? "Your Profile" : "Athlete Profile"}
                    </p>
                    <h2
                      data-testid="profile-name"
                      className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl"
                    >
                      {data?.user?.name || "…"}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="profile-close-btn"
                  onClick={() => onOpenChange(false)}
                  className="flex h-9 w-9 items-center justify-center border border-white/15 bg-transparent text-white/60 hover:border-white/30 hover:text-white transition"
                  aria-label="Close profile"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading || !data ? (
                  <div className="space-y-3 p-6" data-testid="profile-loading">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 animate-pulse border border-white/10 bg-[#141414]/60" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Stat grid */}
                    <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-4 sm:grid-cols-4">
                      <MiniStat
                        icon={<Trophy size={16} weight="fill" />}
                        label="Points"
                        value={data.stats.total_points}
                        accent
                        testId="profile-stat-points"
                      />
                      <MiniStat
                        icon={<Fire size={16} weight="fill" />}
                        label="Sessions"
                        value={data.stats.workouts_count}
                        testId="profile-stat-sessions"
                      />
                      <MiniStat
                        icon={<Timer size={16} weight="fill" />}
                        label="Minutes"
                        value={data.stats.total_minutes}
                        testId="profile-stat-minutes"
                      />
                      <MiniStat
                        icon={<Flame size={16} weight="fill" />}
                        label="Calories"
                        value={data.stats.total_calories}
                        testId="profile-stat-calories"
                      />
                    </div>

                    {/* Personal best */}
                    {data.personal_best && (
                      <div
                        data-testid="profile-personal-best"
                        className="border-b border-white/10 bg-[#CCFF00]/[0.05] px-6 py-5"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <Medal
                            size={14}
                            weight="fill"
                            className="text-[#CCFF00]"
                            aria-hidden="true"
                          />
                          <p className="text-[10px] font-bold uppercase tracking-athletic text-[#CCFF00]">
                            Personal Best
                          </p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-display text-lg font-black uppercase tracking-tight">
                              {data.personal_best.type} · {data.personal_best.duration_min} min
                            </div>
                            <div className="mt-0.5 text-xs text-white/50">
                              {data.personal_best.calories} cal · {dateLine(data.personal_best.created_at)}
                            </div>
                          </div>
                          <div className="font-display text-4xl font-black uppercase tracking-tight text-[#CCFF00]">
                            +{data.personal_best.points}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Per-type breakdown */}
                    {Object.keys(data.per_type || {}).length > 0 && (
                      <div className="border-b border-white/10 px-6 py-5">
                        <p className="mb-3 text-[10px] font-bold uppercase tracking-athletic text-white/50">
                          Breakdown
                        </p>
                        <div className="space-y-2">
                          {Object.entries(data.per_type).map(([type, s]) => {
                            const cfg = typeConfig[type] || typeConfig.Running;
                            const Icon = cfg.icon;
                            const pct = data.stats.total_points > 0
                              ? Math.round((s.points / data.stats.total_points) * 100)
                              : 0;
                            return (
                              <div
                                key={type}
                                data-testid={`profile-type-${type.toLowerCase()}`}
                                className="flex items-center gap-3"
                              >
                                <div
                                  className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10"
                                  style={{ color: cfg.accent }}
                                  aria-hidden="true"
                                >
                                  <Icon size={18} weight="fill" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline justify-between">
                                    <span className="font-display text-sm font-black uppercase tracking-athletic">
                                      {cfg.label}
                                    </span>
                                    <span className="text-xs text-white/60">
                                      {s.count} × · {s.minutes} min · +{s.points} pts
                                    </span>
                                  </div>
                                  <div className="mt-1 h-1 w-full bg-white/5">
                                    <div
                                      className="h-full bg-[#CCFF00]"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Workout history */}
                    <div className="px-6 py-5">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-athletic text-white/50">
                        History
                      </p>
                      {data.workouts.length === 0 ? (
                        <div
                          data-testid="profile-history-empty"
                          className="border border-dashed border-white/15 bg-[#141414]/40 p-6 text-center"
                        >
                          <p className="font-display text-sm font-black uppercase tracking-tight text-white/70">
                            No workouts yet
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            {isMe
                              ? "Log a session to start your history."
                              : "They haven't logged anything yet."}
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-2" data-testid="profile-history">
                          {data.workouts.map((w) => {
                            const cfg = typeConfig[w.type] || typeConfig.Running;
                            const Icon = cfg.icon;
                            const isBest = data.personal_best?.id === w.id;
                            return (
                              <li
                                key={w.id}
                                data-testid={`profile-history-${w.id}`}
                                className={`border p-3 transition ${
                                  isBest
                                    ? "border-[#CCFF00]/50 bg-[#CCFF00]/[0.04]"
                                    : "border-white/10 bg-[#141414]"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10"
                                    style={{ color: cfg.accent }}
                                    aria-hidden="true"
                                  >
                                    <Icon size={18} weight="fill" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                      <span className="font-display text-sm font-black uppercase tracking-athletic">
                                        {w.type}
                                        {isBest && (
                                          <span className="ml-2 text-[9px] tracking-athletic text-[#CCFF00]">
                                            · PR
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-display text-base font-black uppercase tracking-tight text-[#CCFF00]">
                                        +{w.points}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/50">
                                      <span>{dateLine(w.created_at)}</span>
                                      <span className="text-white/20">·</span>
                                      <span>{w.duration_min} min</span>
                                      <span className="text-white/20">·</span>
                                      <span>{w.calories} cal</span>
                                    </div>
                                    {w.note && (
                                      <p className="mt-1 text-[11px] italic text-white/40">
                                        &ldquo;{w.note}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {isMe && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <button
                                      type="button"
                                      data-testid={`profile-edit-btn-${w.id}`}
                                      onClick={() => {
                                        onEdit?.(w);
                                        onOpenChange(false);
                                      }}
                                      className="inline-flex h-7 items-center gap-1.5 border border-white/15 bg-transparent px-2.5 text-[10px] font-bold uppercase tracking-athletic text-white/70 hover:border-[#CCFF00]/60 hover:text-[#CCFF00] transition"
                                    >
                                      <PencilSimple size={11} weight="bold" aria-hidden="true" />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      data-testid={`profile-delete-btn-${w.id}`}
                                      onClick={() => setPendingDelete(w)}
                                      className="inline-flex h-7 items-center gap-1.5 border border-white/15 bg-transparent px-2.5 text-[10px] font-bold uppercase tracking-athletic text-white/70 hover:border-[#FF3B30]/70 hover:text-[#FF3B30] transition"
                                    >
                                      <Trash size={11} weight="bold" aria-hidden="true" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent className="rounded-none border-white/10 bg-[#0F0F0F] text-white sm:rounded-none">
          <AlertDialogHeader>
            <p className="text-[10px] font-bold uppercase tracking-athletic text-[#FF3B30]">
              Delete Workout
            </p>
            <AlertDialogTitle className="font-display text-2xl font-black uppercase tracking-tight">
              Wipe this from your history?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-white/60">
              {pendingDelete
                ? `${pendingDelete.type} · ${pendingDelete.duration_min} min · +${pendingDelete.points} pts. Cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-white/15 bg-transparent text-white/80 hover:bg-white/5 hover:text-white">
              <span className="font-display text-xs font-black uppercase tracking-athletic">
                Keep it
              </span>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="rounded-none bg-[#FF3B30] text-white hover:bg-[#FF3B30]/85"
            >
              <span className="font-display text-xs font-black uppercase tracking-athletic">
                {deleting ? "Deleting…" : "Delete"}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MiniStat({ icon, label, value, accent = false, testId }) {
  return (
    <div
      data-testid={testId}
      className={`border p-3 ${
        accent ? "border-[#CCFF00]/40 bg-[#CCFF00]/[0.06]" : "border-white/10 bg-[#141414]"
      }`}
    >
      <div
        className={`mb-1.5 inline-flex h-6 w-6 items-center justify-center border ${
          accent ? "border-[#CCFF00]/40 text-[#CCFF00]" : "border-white/10 text-white/70"
        }`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-athletic text-white/50">
        {label}
      </div>
      <div
        className={`mt-0.5 font-display text-2xl font-black uppercase tracking-tight ${
          accent ? "text-[#CCFF00]" : "text-white"
        }`}
      >
        {value?.toLocaleString?.() ?? value}
      </div>
    </div>
  );
}
