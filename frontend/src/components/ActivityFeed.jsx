import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PersonSimpleRun, Barbell, PersonSimpleTaiChi, Clock } from "@phosphor-icons/react";
import { listWorkouts } from "@/lib/api";

const typeConfig = {
  Running: {
    icon: PersonSimpleRun,
    accent: "#FF3B30",
    label: "Run",
  },
  Weights: {
    icon: Barbell,
    accent: "#CCFF00",
    label: "Lift",
  },
  Yoga: {
    icon: PersonSimpleTaiChi,
    accent: "#007AFF",
    label: "Yoga",
  },
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

export default function ActivityFeed({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-3" data-testid="feed">
      {items.map((w, idx) => {
        const cfg = typeConfig[w.type] || typeConfig.Running;
        const Icon = cfg.icon;
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
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
