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
import { PersonSimpleRun, Barbell, PersonSimpleTaiChi } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createWorkout, updateWorkout } from "@/lib/api";

const WORKOUT_TYPES = [
  { value: "Running", Icon: PersonSimpleRun, color: "#FF3B30" },
  { value: "Weights", Icon: Barbell, color: "#CCFF00" },
  { value: "Yoga", Icon: PersonSimpleTaiChi, color: "#007AFF" },
];

const calcPoints = (duration, calories) => {
  const d = Number(duration) || 0;
  const c = Number(calories) || 0;
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
  const [calories, setCalories] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (workoutToEdit) {
      setType(workoutToEdit.type);
      setDuration(String(workoutToEdit.duration_min));
      setCalories(String(workoutToEdit.calories));
      setNote(workoutToEdit.note || "");
    } else {
      setType("Running");
      setDuration("");
      setCalories("");
      setNote("");
    }
  }, [open, workoutToEdit]);

  const projectedPoints = useMemo(
    () => calcPoints(duration, calories),
    [duration, calories]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const d = Number(duration);
    const c = Number(calories);
    if (!d || d <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }
    if (c < 0 || Number.isNaN(c)) {
      toast.error("Calories can't be negative");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        duration_min: d,
        calories: c,
        note: note.trim(),
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
        className="max-w-lg rounded-none border-white/10 bg-[#0F0F0F] p-0 text-white sm:rounded-none"
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
            <div className="grid grid-cols-3 gap-2">
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
              <label className="mb-2 block text-xs font-bold uppercase tracking-athletic text-white/50">
                Calories
              </label>
              <Input
                data-testid="calories-input"
                type="number"
                min="0"
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="250"
                className="h-12 rounded-none border-white/15 bg-[#141414] text-base text-white placeholder:text-white/30 focus-visible:border-[#CCFF00] focus-visible:ring-0"
              />
            </div>
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
