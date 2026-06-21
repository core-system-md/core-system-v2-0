import { useEffect, useState } from "react";
import { supabase } from "../../infrastructure/supabase/client";

interface QueueItem {
  id: string;
  session_status: string;
  clinic_patients: { full_name: string }[] | null;
  clinic_procedures: { name: string }[] | null;
  estimated_wait_minutes: number;
}

export function AmbientKioskView({ tenantId }: { tenantId: string }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAd, setCurrentAd] = useState(0);

  const ads = [
    "Welcome to our clinic",
    "Please silence your phone",
    "Your health is our priority",
    "Free WiFi: Clinic-Guest",
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const adTimer = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % ads.length);
    }, 8000);
    return () => clearInterval(adTimer);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const fetchQueue = async () => {
      const { data } = await supabase
        .from("clinic_visit_sessions")
        .select("id, session_status, estimated_wait_minutes, clinic_patients(full_name), clinic_procedures(name)")
        .eq("tenant_id", tenantId)
        .in("session_status", ["waiting", "checked_in", "in_consultation"])
        .order("created_at", { ascending: true })
        .limit(5);
      setQueue(data || []);
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_consultation": return "text-emerald-400";
      case "checked_in": return "text-amber-400";
      default: return "text-slate-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_consultation": return "In Room";
      case "checked_in": return "Checked In";
      default: return "Waiting";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 select-none">
      <div className="text-center mb-12">
        <h1 className="text-7xl font-light text-white mb-4 tracking-widest uppercase">Welcome</h1>
        <p className="text-3xl text-slate-400 font-mono">{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</p>
        <p className="text-xl text-slate-500 mt-2">{currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <div className="w-full max-w-5xl mb-12">
        <h2 className="text-2xl text-slate-400 mb-6 text-center uppercase tracking-wider">Now Serving</h2>
        {queue.length === 0 ? (
          <div className="text-center text-slate-500 text-xl py-12">No patients in queue</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map((item, index) => (
              <div key={item.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold text-white mb-1">#{index + 1}</div>
                  <div className="text-lg text-slate-300">{item.clinic_patients?.[0]?.full_name || "Anonymous"}</div>
                  <div className="text-sm text-slate-500">{item.clinic_procedures?.[0]?.name || "General"}</div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-semibold ${getStatusColor(item.session_status)}`}>{getStatusLabel(item.session_status)}</div>
                  {item.estimated_wait_minutes > 0 && <div className="text-sm text-slate-500 mt-1">~{item.estimated_wait_minutes} min</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-md py-6">
        <p className="text-center text-2xl text-slate-300 animate-pulse">{ads[currentAd]}</p>
      </div>
    </div>
  );
}
