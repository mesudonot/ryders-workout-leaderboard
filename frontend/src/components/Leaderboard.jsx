import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, CaretUp } from "@phosphor-icons/react";
import { getLeaderboard } from "@/lib/api";

const initialFrom = (name) =>
  (name || "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function Leaderboard({ timeframe, currentUserId, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLeaderboard(timeframe)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [timeframe, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-2" data-testid="leaderboard-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse border border-white/10 bg-[#141414]/60"
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        data-testid="leaderboard-empty"
        className="border border-dashed border-white/15 bg-[#141414]/40 p-10 text-center"
      >
        <Trophy
          size={28}
          weight="fill"
          className="mx-auto mb-3 text-white/30"
          aria-hidden="true"
        />
        <p className="font-display text-xl font-black uppercase tracking-tight">
          No workouts yet
        </p>
        <p className="mt-2 text-sm text-white/50">
          Be the first to log a session and claim the top spot.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-[#0F0F0F]" data-testid="leaderboard">
      {/* Header */}
      <div className="grid grid-cols-[48px_1fr_auto_auto] items-center gap-4 border-b border-white/10 bg-[#141414] px-4 py-3 text-[10px] font-bold uppercase tracking-athletic text-white/40 sm:grid-cols-[48px_1fr_80px_100px_120px] sm:px-6">
        <span>Rank</span>
        <span>Athlete</span>
        <span className="hidden text-right sm:block">Sessions</span>
        <span className="hidden text-right sm:block">Minutes</span>
        <span className="text-right">Points</span>
      </div>

      {rows.map((row, idx) => {
        const rank = idx + 1;
        const isMe = row.user_id === currentUserId;
        const isTop = rank === 1;

        return (
          <motion.div
            key={row.user_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04, ease: "easeOut" }}
            data-testid={`leaderboard-row-${rank}`}
            className={`grid grid-cols-[48px_1fr_auto_auto] items-center gap-4 border-b border-white/10 px-4 py-4 transition sm:grid-cols-[48px_1fr_80px_100px_120px] sm:px-6 ${
              isMe
                ? "border-l-2 border-l-[#CCFF00] bg-[#CCFF00]/[0.06]"
                : "hover:bg-white/[0.02]"
            }`}
          >
            {/* Rank */}
            <div className="flex items-center">
              {isTop ? (
                <div className="flex h-9 w-9 items-center justify-center border border-[#CCFF00]/40 bg-[#CCFF00]/10 text-[#CCFF00]">
                  <Trophy size={16} weight="fill" aria-hidden="true" />
                </div>
              ) : rank <= 3 ? (
                <div className="flex h-9 w-9 items-center justify-center border border-white/15 bg-[#141414] text-white/70">
                  <Medal size={16} weight="fill" aria-hidden="true" />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center font-display text-lg font-black uppercase text-white/40">
                  {rank}
                </div>
              )}
            </div>

            {/* Athlete */}
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center border font-display text-xs font-black uppercase ${
                  isMe
                    ? "border-[#CCFF00]/50 bg-[#CCFF00]/10 text-[#CCFF00]"
                    : "border-white/15 bg-[#141414] text-white/80"
                }`}
              >
                {initialFrom(row.name)}
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-base font-bold uppercase tracking-wide sm:text-lg">
                  {row.name}{" "}
                  {isMe && (
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-athletic text-[#CCFF00]">
                      · You
                    </span>
                  )}
                </div>
                <div className="text-[11px] uppercase tracking-athletic text-white/40 sm:hidden">
                  {row.workouts_count} sessions · {row.total_minutes} min
                </div>
              </div>
            </div>

            {/* Sessions */}
            <div className="hidden text-right font-display text-base font-bold uppercase text-white/70 sm:block">
              {row.workouts_count}
            </div>
            {/* Minutes */}
            <div className="hidden text-right font-display text-base font-bold uppercase text-white/70 sm:block">
              {row.total_minutes}
            </div>
            {/* Points */}
            <div className="flex items-center justify-end gap-1">
              {isTop && (
                <CaretUp
                  size={14}
                  weight="bold"
                  className="text-[#CCFF00]"
                  aria-hidden="true"
                />
              )}
              <div
                className={`font-display text-2xl font-black uppercase tracking-tight ${
                  isTop ? "text-[#CCFF00]" : "text-white"
                }`}
              >
                {row.total_points}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
