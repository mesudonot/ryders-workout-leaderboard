import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Barbell,
  Plus,
  SignOut,
  Trophy,
  Flame,
  Timer,
  Fire,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import Leaderboard from "@/components/Leaderboard";
import ActivityFeed from "@/components/ActivityFeed";
import RecordWorkoutDialog from "@/components/RecordWorkoutDialog";
import { getMyStats } from "@/lib/api";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [timeframe, setTimeframe] = useState("week");
  const [openRecord, setOpenRecord] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    total_points: 0,
    workouts_count: 0,
    total_minutes: 0,
    total_calories: 0,
  });

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!user) return;
    getMyStats()
      .then((r) => setStats(r.stats))
      .catch(() => {});
  }, [user, refreshKey]);

  const handleWorkoutLogged = () => {
    setOpenRecord(false);
    setEditingWorkout(null);
    refresh();
  };

  const handleEditWorkout = (workout) => {
    setEditingWorkout(workout);
    setOpenRecord(true);
  };

  const handleDialogOpenChange = (open) => {
    setOpenRecord(open);
    if (!open) setEditingWorkout(null);
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-white pb-32">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-white/15 bg-[#141414]">
              <Barbell size={20} weight="fill" className="text-[#CCFF00]" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-black uppercase tracking-athletic">
                SweatBoard
              </div>
              <div className="text-[10px] uppercase tracking-athletic text-white/40">
                Invite Circle
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="hidden text-right sm:block pointer-events-none">
              <div className="text-[10px] uppercase tracking-athletic text-white/40">
                Athlete
              </div>
              <div className="font-display text-sm font-bold uppercase tracking-wide">
                {user?.name}
              </div>
            </div>
            {user?.picture ? (
              <img
                src={user.picture}
                alt=""
                aria-hidden="true"
                className="h-9 w-9 border border-[#CCFF00]/40 object-cover pointer-events-none"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center border border-[#CCFF00]/40 bg-[#CCFF00]/10 font-display text-sm font-black uppercase text-[#CCFF00] pointer-events-none">
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <Button
              data-testid="signout-btn"
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="relative z-10 text-white/50 hover:bg-white/5 hover:text-white"
              aria-label="Sign out"
            >
              <SignOut size={18} weight="bold" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero / Stats */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="grain absolute inset-0 pointer-events-none" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-athletic text-[#CCFF00]">
                Welcome Back, Athlete
              </p>
              <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl">
                {user?.name || "You"}
                <br />
                <span className="text-white/40">on the board.</span>
              </h1>
            </div>
            <Button
              data-testid="open-record-btn"
              onClick={() => setOpenRecord(true)}
              className="hidden h-12 rounded-none bg-[#CCFF00] px-6 text-black hover:bg-[#CCFF00]/85 hover:-translate-y-0.5 transition lg:inline-flex"
            >
              <Plus size={18} weight="bold" className="mr-2" />
              <span className="font-display text-base font-black uppercase tracking-athletic">
                Log Workout
              </span>
            </Button>
          </div>

          {/* Stat grid */}
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard
              testId="stat-points"
              icon={<Trophy size={20} weight="fill" />}
              label="Total Points"
              value={stats.total_points}
              accent
            />
            <StatCard
              testId="stat-workouts"
              icon={<Fire size={20} weight="fill" />}
              label="Sessions"
              value={stats.workouts_count}
            />
            <StatCard
              testId="stat-minutes"
              icon={<Timer size={20} weight="fill" />}
              label="Minutes"
              value={stats.total_minutes}
            />
            <StatCard
              testId="stat-calories"
              icon={<Flame size={20} weight="fill" />}
              label="Calories"
              value={stats.total_calories}
            />
          </div>
        </div>
      </section>

      {/* Main grid: Leaderboard + Feed */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-athletic text-white/40">
                  The Ranking
                </p>
                <h2 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                  Leaderboard
                </h2>
              </div>
              <Tabs value={timeframe} onValueChange={setTimeframe}>
                <TabsList
                  data-testid="timeframe-tabs"
                  className="h-auto rounded-none border border-white/10 bg-[#141414] p-0"
                >
                  <TabsTrigger
                    data-testid="tab-week"
                    value="week"
                    className="rounded-none border-r border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-athletic text-white/60 data-[state=active]:bg-[#CCFF00] data-[state=active]:text-black"
                  >
                    Week
                  </TabsTrigger>
                  <TabsTrigger
                    data-testid="tab-month"
                    value="month"
                    className="rounded-none border-r border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-athletic text-white/60 data-[state=active]:bg-[#CCFF00] data-[state=active]:text-black"
                  >
                    Month
                  </TabsTrigger>
                  <TabsTrigger
                    data-testid="tab-all"
                    value="all"
                    className="rounded-none px-4 py-2 text-xs font-bold uppercase tracking-athletic text-white/60 data-[state=active]:bg-[#CCFF00] data-[state=active]:text-black"
                  >
                    All Time
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Leaderboard
              timeframe={timeframe}
              currentUserId={user?.user_id}
              refreshKey={refreshKey}
            />
          </section>

          <section>
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-athletic text-white/40">
                Live
              </p>
              <h2 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                Activity
              </h2>
            </div>
            <ActivityFeed
              refreshKey={refreshKey}
              currentUserId={user?.user_id}
              onEdit={handleEditWorkout}
              onChanged={refresh}
            />
          </section>
        </div>
      </main>

      {/* Mobile FAB */}
      <motion.button
        data-testid="fab-record-btn"
        onClick={() => setOpenRecord(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 border-2 border-black bg-[#CCFF00] px-5 text-black shadow-[0_10px_30px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 transition lg:hidden"
        aria-label="Log a workout"
      >
        <Plus size={20} weight="bold" />
        <span className="font-display text-sm font-black uppercase tracking-athletic">
          Log Workout
        </span>
      </motion.button>

      <RecordWorkoutDialog
        open={openRecord}
        onOpenChange={handleDialogOpenChange}
        onLogged={handleWorkoutLogged}
        workoutToEdit={editingWorkout}
      />
    </div>
  );
}

function StatCard({ icon, label, value, accent = false, testId }) {
  return (
    <div
      data-testid={testId}
      className={`relative border p-5 ${
        accent
          ? "border-[#CCFF00]/40 bg-[#CCFF00]/[0.06]"
          : "border-white/10 bg-[#141414]"
      }`}
    >
      <div
        className={`mb-3 inline-flex h-8 w-8 items-center justify-center border ${
          accent
            ? "border-[#CCFF00]/40 text-[#CCFF00]"
            : "border-white/10 text-white/70"
        }`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-athletic text-white/50">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl ${
          accent ? "text-[#CCFF00]" : "text-white"
        }`}
      >
        {value?.toLocaleString?.() ?? value}
      </div>
    </div>
  );
}
