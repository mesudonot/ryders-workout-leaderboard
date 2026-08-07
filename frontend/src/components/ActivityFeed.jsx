import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PersonSimpleRun,
  Barbell,
  PersonSimpleTaiChi,
  Clock,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
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
import { listWorkouts, deleteWorkout } from "@/lib/api";

const typeConfig = {
  Running: { icon: PersonSimpleRun, accent: "#FF3B30", label: "Run" },
  Weights: { icon: Barbell, accent: "#CCFF00", label: "Lift" },
  Yoga: { icon: PersonSimpleTaiChi, accent: "#007AFF", label: "Yoga" },
};

const timeAgo = (iso) => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function ActivityFeed({ refreshKey, currentUserId, onEdit, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listWorkouts({ limit: 15 })
      .then((data) => !cancelled && setItems(data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteWorkout(pendingDelete.id, currentUserId);
      toast.success("Workout deleted");
      setPendingDelete(null);
      onChanged?.();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not delete workout";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2" data-testid="feed-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse border border-white/10 bg-[#141414]/60"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="feed-empty"
        className="border border-dashed border-white/15 bg-[#141414]/40 p-8 text-center"
      >
        <Clock
          size={24}
          weight="fill"
          className="mx-auto mb-3 text-white/30"
          aria-hidden="true"
        />
        <p className="font-display text-lg font-black uppercase tracking-tight">
          Nothing here yet
        </p>
        <p className="mt-1 text-xs text-white/50">
          Recent workouts will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3" data-testid="feed">
        {items.map((w, idx) => {
          const cfg = typeConfig[w.type] || typeConfig.Running;
          const Icon = cfg.icon;
          const isMine = w.user_id === currentUserId;
          return (
            <motion.article
              key={w.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
              data-testid={`feed-item-${w.id}`}
              className="group border border-white/10 bg-[#141414] p-4 hover:border-white/25 transition"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/10"
                  style={{ color: cfg.accent }}
                  aria-hidden="true"
                >
                  <Icon size={22} weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-display text-base font-bold uppercase tracking-wide">
                        {w.user_name}
                      </span>
                      <span className="ml-2 text-xs font-bold uppercase tracking-athletic text-white/40">
                        · {cfg.label}
                      </span>
                      {isMine && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-athletic text-[#CCFF00]">
                          · You
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-athletic text-white/40">
                      {timeAgo(w.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
                    <span>
                      <span className="text-white/80">{w.duration_min}</span> min
                    </span>
                    <span className="text-white/20">·</span>
                    <span>
                      <span className="text-white/80">{w.calories}</span> cal
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="font-display text-sm font-black uppercase tracking-athletic text-[#CCFF00]">
                      +{w.points} pts
                    </span>
                  </div>
                  {w.note ? (
                    <p className="mt-2 text-xs italic leading-relaxed text-white/50">
                      &ldquo;{w.note}&rdquo;
                    </p>
                  ) : null}

                  {isMine && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`edit-btn-${w.id}`}
                        onClick={() => onEdit?.(w)}
                        className="inline-flex h-8 items-center gap-1.5 border border-white/15 bg-transparent px-3 text-[11px] font-bold uppercase tracking-athletic text-white/70 hover:border-[#CCFF00]/60 hover:text-[#CCFF00] transition"
                      >
                        <PencilSimple size={12} weight="bold" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        data-testid={`delete-btn-${w.id}`}
                        onClick={() => setPendingDelete(w)}
                        className="inline-flex h-8 items-center gap-1.5 border border-white/15 bg-transparent px-3 text-[11px] font-bold uppercase tracking-athletic text-white/70 hover:border-[#FF3B30]/70 hover:text-[#FF3B30] transition"
                      >
                        <Trash size={12} weight="bold" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent
          data-testid="delete-confirm-dialog"
          className="rounded-none border-white/10 bg-[#0F0F0F] text-white sm:rounded-none"
        >
          <AlertDialogHeader>
            <p className="text-[10px] font-bold uppercase tracking-athletic text-[#FF3B30]">
              Delete Workout
            </p>
            <AlertDialogTitle className="font-display text-2xl font-black uppercase tracking-tight">
              Wipe this from the board?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-white/60">
              {pendingDelete
                ? `You're about to remove your ${pendingDelete.type} session (${pendingDelete.duration_min} min · +${pendingDelete.points} pts). This can't be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="delete-cancel-btn"
              className="rounded-none border-white/15 bg-transparent text-white/80 hover:bg-white/5 hover:text-white"
            >
              <span className="font-display text-xs font-black uppercase tracking-athletic">
                Keep it
              </span>
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-confirm-btn"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
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
