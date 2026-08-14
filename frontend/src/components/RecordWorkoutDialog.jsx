import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PersonSimpleRun, Barbell, PersonSimpleTaiChi, PersonSimpleWalk, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createWorkout, updateWorkout } from "@/lib/api";

const WORKOUT_TYPES = [
  { value: "Running", Icon: PersonSimpleRun, color: "#FF3B30" },
  { value: "Weights", Icon: Barbell, color: "#CCFF00" },
  { value: "Yoga", Icon: PersonSimpleTaiChi, color: "#007AFF" },
  { value: "Walk", Icon: PersonSimpleWalk, color: "#14B8A6" },
  { value: "Other", Icon: Sparkle, color: "#F59E0B" },
];

const KJ_PER_CAL = 4.184;
const UNIT_STORAGE_KEY = "sweatboard.energyUnit";

const toCalories = (value, unit) => {
  const n = Number(value);
  if (!n || Number.isNaN(n)) return 0;
  return unit === "kj" ? n / KJ_PER_CAL : n;
};

// Format a Date into the value expected by <input type="datetime-local"> (local time, no offset)
const toDateTimeLocal = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
};

const calcPoints = (duration, energyValue, unit) => {
  const d = Number(duration) || 0;
  const c = toCalories(energyValue, unit);
  if (d <= 0) return 0;
  return 10 + d + (d >= 45 ? 5 : 0) + Math.floor(c / 10);
};

export default function RecordWorkoutDialog({
  open,
  onOpenChange,
  onLogged,
  workoutToEdit = null,
}) {
  const isEdit = Boolean(workoutToEdit);
  const [type, setType] = useState("Running");
  const [duration, setDuration] = useState("");
  const [energyValue, setEnergyValue] = useState("");
  const [energyUnit, setEnergyUnit] = useState(
    () => localStorage.getItem(UNIT_STORAGE_KEY) || "cal"
  );
  const [when, setWhen] = useState(() => toDateTimeLocal(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (workoutToEdit) {
      setType(workoutToEdit.type);
      setDuration(String(workoutToEdit.duration_min));
      // Stored value is always calories — show it in the user's preferred unit
      const preferred = localStorage.getItem(UNIT_STORAGE_KEY) || "cal";
      setEnergyUnit(preferred);
      const displayed =
        preferred === "kj"
          ? Math.round(workoutToEdit.calories * KJ_PER_CAL)
          : workoutToEdit.calories;
      setEnergyValue(String(displayed));
      setNote(workoutToEdit.note || "");
      setWhen(toDateTimeLocal(new Date(workoutToEdit.created_at)));
    } else {
      setType("Running");
      setDuration("");
      setEnergyValue("");
      setNote("");
      setWhen(toDateTimeLocal(new Date()));
    }
  }, [open, workoutToEdit]);

  const projectedPoints = useMemo(
    () => calcPoints(duration, energyValue, energyUnit),
    [duration, energyValue, energyUnit]
  );

  const handleUnitChange = (nextUnit) => {
    if (nextUnit === energyUnit) return;
    // Convert the current input value so the displayed energy stays equivalent
    const n = Number(energyValue);
    if (!Number.isNaN(n) && n > 0) {
      const converted =
        nextUnit === "kj" ? Math.round(n * KJ_PER_CAL) : Math.round(n / KJ_PER_CAL);
      setEnergyValue(String(converted));
    }
    setEnergyUnit(nextUnit);
    localStorage.setItem(UNIT_STORAGE_KEY, nextUnit);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const d = Number(duration);
    const rawEnergy = Number(energyValue);
    if (!d || d <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }
    if (rawEnergy < 0 || Number.isNaN(rawEnergy)) {
      toast.error(`${energyUnit === "kj" ? "Kilojoules" : "Calories"} can't be negative`);
      return;
    }

    const calories = Math.round(toCalories(rawEnergy, energyUnit));

    // Convert local datetime-local string to ISO UTC
    let createdAtISO = null;
    if (when) {
      const parsed = new Date(when);
      if (Number.isNaN(parsed.getTime())) {
        toast.error("Enter a valid date and time");
        return;
      }
      if (parsed.getTime() > Date.now() + 5 * 60 * 1000) {
        toast.error("Date can't be in the future");
        return;
      }
      createdAtISO = parsed.toISOString();
    }

    setSaving(true);
    try {
      const payload = {
        type,
        duration_min: d,
        calories,
        note: note.trim(),
        created_at: createdAtISO,
      };
      if (isEdit) {
        await updateWorkout(workoutToEdit.id, payload);
        toast.success(`Workout updated · ${projectedPoints} pts`);
      } else {
        await createWorkout(payload);
        toast.success(`+${projectedPoints} points logged`);
      }
      onLogged?.();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not save workout";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="record-dialog"
        className="max-h-[92dvh] max-w-lg overflow-y-auto rounded-none border-white/10 bg-[#0F0F0F] p-0 text-white sm:rounded-none"
      >
        <DialogHeader className="border-b border-white/10 px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-athletic text-[#CCFF00]">
            {isEdit ? "Editing" : "New Session"}
          </p>
          <DialogTitle className="font-display text-3xl font-black uppercase tracking-tight">
            {isEdit ? "Fix Workout" : "Log Workout"}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            {isEdit
              ? "Update details — points recalculate instantly."
              : "Pick a type, punch in minutes and calories. Points calculate live."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6" data-testid="record-form">
          {/* Type picker */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-athletic text-white/50">
              Workout Type
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {WORKOUT_TYPES.map(({ value, Icon, color }) => {
                const active = type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    data-testid={`type-${value.toLowerCase()}`}
                    onClick={() => setType(value)}
                    className={`flex flex-col items-center gap-2 border p-4 transition ${
                      active
                        ? "border-[#CCFF00] bg-[#CCFF00]/10"
                        : "border-white/10 bg-[#141414] hover:border-white/25"
                    }`}
                  >
                    <Icon
                      size={26}
                      weight="fill"
                      style={{ color: active ? "#CCFF00" : color }}
                      aria-hidden="true"
                    />
                    <span className="font-display text-xs font-black uppercase tracking-athletic">
                      {value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration + Calories */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-athletic text-white/50">
                Duration (min)
              </label>
              <Input
                data-testid="duration-input"
                type="number"
                min="1"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                className="h-12 rounded-none border-white/15 bg-[#141414] text-base text-white placeholder:text-white/30 focus-visible:border-[#CCFF00] focus-visible:ring-0"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="block text-xs font-bold uppercase tracking-athletic text-white/50">
                  Energy Burned
                </label>
                <div
                  role="tablist"
                  aria-label="Energy unit"
                  data-testid="energy-unit-toggle"
                  className="flex border border-white/15 bg-[#141414]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={energyUnit === "cal"}
                    data-testid="unit-cal-btn"
                    onClick={() => handleUnitChange("cal")}
                    className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-athletic transition ${
                      energyUnit === "cal"
                        ? "bg-[#CCFF00] text-black"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Cal
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={energyUnit === "kj"}
                    data-testid="unit-kj-btn"
                    onClick={() => handleUnitChange("kj")}
                    className={`border-l border-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-athletic transition ${
                      energyUnit === "kj"
                        ? "bg-[#CCFF00] text-black"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    KJ
                  </button>
                </div>
              </div>
              <div className="relative">
                <Input
                  data-testid="calories-input"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={energyValue}
                  onChange={(e) => setEnergyValue(e.target.value)}
                  placeholder={energyUnit === "kj" ? "1050" : "250"}
                  className="h-12 rounded-none border-white/15 bg-[#141414] pr-14 text-base text-white placeholder:text-white/30 focus-visible:border-[#CCFF00] focus-visible:ring-0"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-athletic text-white/40"
                >
                  {energyUnit === "kj" ? "kJ" : "cal"}
                </span>
              </div>
              {energyUnit === "kj" && Number(energyValue) > 0 && (
                <p
                  data-testid="kj-conversion-hint"
                  className="mt-1 text-[10px] uppercase tracking-athletic text-white/40"
                >
                  ≈ {Math.round(toCalories(energyValue, "kj"))} cal
                </p>
              )}
            </div>
          </div>

          {/* When */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-athletic text-white/50">
                When
              </label>
              <button
                type="button"
                data-testid="when-now-btn"
                onClick={() => setWhen(toDateTimeLocal(new Date()))}
                className="text-[10px] font-bold uppercase tracking-athletic text-white/40 hover:text-[#CCFF00] transition"
              >
                Set to now
              </button>
            </div>
            <Input
              data-testid="when-input"
              type="datetime-local"
              value={when}
              max={toDateTimeLocal(new Date(Date.now() + 5 * 60 * 1000))}
              onChange={(e) => setWhen(e.target.value)}
              className="h-12 rounded-none border-white/15 bg-[#141414] text-base text-white placeholder:text-white/30 focus-visible:border-[#CCFF00] focus-visible:ring-0 [color-scheme:dark]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-athletic text-white/50">
              Note (optional)
            </label>
            <Textarea
              data-testid="note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did it feel?"
              rows={2}
              className="rounded-none border-white/15 bg-[#141414] text-sm text-white placeholder:text-white/30 focus-visible:border-[#CCFF00] focus-visible:ring-0"
            />
          </div>

          {/* Projected points */}
          <div
            data-testid="projected-points"
            className="flex items-center justify-between border border-[#CCFF00]/30 bg-[#CCFF00]/[0.06] px-4 py-3"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-athletic text-white/50">
                {isEdit ? "Updated Points" : "Projected Points"}
              </div>
              <div className="mt-0.5 text-[11px] text-white/40">
                10 base · 1/min · +5 if 45+ min · 1/10 cal
              </div>
            </div>
            <div className="font-display text-4xl font-black uppercase tracking-tight text-[#CCFF00]">
              {isEdit ? "" : "+"}
              {projectedPoints}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-12 flex-1 rounded-none border border-white/15 bg-transparent text-white/80 hover:bg-white/5"
              data-testid="cancel-record-btn"
            >
              <span className="font-display text-sm font-black uppercase tracking-athletic">
                Cancel
              </span>
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-testid="submit-record-btn"
              className="h-12 flex-1 rounded-none bg-[#CCFF00] text-black hover:bg-[#CCFF00]/85 disabled:opacity-60"
            >
              <span className="font-display text-sm font-black uppercase tracking-athletic">
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Log It"}
              </span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
