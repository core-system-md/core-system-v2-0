import { useState } from "react";

interface ScheduleSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  doctorId: string;
  doctorName: string;
  room: string;
  isRecurring: boolean;
}

interface ScheduleManagerProps {
  slots: ScheduleSlot[];
  onAddSlot?: (slot: Omit<ScheduleSlot, "id">) => void;
  onRemoveSlot?: (id: string) => void;
}

export function ScheduleManager({ slots, onAddSlot: _onAddSlot, onRemoveSlot }: ScheduleManagerProps) {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const daySlots = slots.filter((s) => s.day === selectedDay);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white mb-3">Schedule Manager</h2>
        <div className="flex gap-2 overflow-x-auto">
          {days.map((day) => (
            <button key={day} onClick={() => setSelectedDay(day)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedDay === day ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>{day}</button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-800">
        {daySlots.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No slots for {selectedDay}</div>}
        {daySlots.map((slot) => (
          <div key={slot.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-white">{slot.startTime} — {slot.endTime}</p>
              <p className="text-xs text-slate-500">{slot.doctorName} • Room {slot.room} {slot.isRecurring && "• Recurring"}</p>
            </div>
            {onRemoveSlot && <button onClick={() => onRemoveSlot(slot.id)} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors">Remove</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
