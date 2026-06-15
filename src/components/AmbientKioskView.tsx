import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/shared/hooks/useTenant";
import { useQueue } from "@/shared/hooks/useQueue";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { Wifi, WifiOff, Clock, User, Phone, Calendar, ArrowRight, CheckCircle2, X } from "lucide-react";

interface AmbientKioskViewProps {
  tenantId?: string;
}

export default function AmbientKioskView({ tenantId }: AmbientKioskViewProps) {
  const { data: tenant, isLoading: tenantLoading } = useTenant(tenantId || "");
  const { data: queue, isLoading: queueLoading } = useQueue();
  const { isOnline } = useNetworkStatus();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInStep, setCheckInStep] = useState<"input" | "success">("input");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [appointmentNumber, setAppointmentNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const handleCheckIn = useCallback(async () => {
    if (!phoneNumber && !appointmentNumber) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setCheckInStep("success");
    setIsSubmitting(false);
    setTimeout(() => {
      setShowCheckIn(false);
      setCheckInStep("input");
      setPhoneNumber("");
      setAppointmentNumber("");
    }, 5000);
  }, [phoneNumber, appointmentNumber]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "waiting": return "bg-amber-500";
      case "in-progress": return "bg-emerald-500";
      case "completed": return "bg-slate-400";
      default: return "bg-slate-400";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "waiting": return "Waiting";
      case "in-progress": return "In Progress";
      case "completed": return "Completed";
      default: return status;
    }
  };

  const displayQueue: any[] = queue && queue.length > 0 ? queue : [
    { id: "1", patientName: "Ahmad M.", status: "in-progress", queueNumber: "A001", estimatedWait: 0 },
    { id: "2", patientName: "Sarah K.", status: "waiting", queueNumber: "A002", estimatedWait: 15 },
    { id: "3", patientName: "Mohammed R.", status: "waiting", queueNumber: "A003", estimatedWait: 30 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B2A4A] via-[#243656] to-[#1B2A4A] text-white flex flex-col">
      <header className="px-6 py-4 md:px-12 md:py-6 flex items-center justify-between border-b border-white/10 bg-[#1B2A4A]/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-white/10 flex items-center justify-center">
            <User className="w-6 h-6 md:w-8 md:h-8 text-white/90" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">
              {tenantLoading ? "Loading..." : tenant?.name || "CORE CLINIC"}
            </h1>
            <p className="text-sm md:text-base text-white/60 hidden sm:block">Patient Self Check-In Kiosk</p>
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" /> : <WifiOff className="w-5 h-5 md:w-6 md:h-6 text-red-400" />}
            <span className={`text-xs md:text-sm px-2 py-1 rounded-full border ${isOnline ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-2xl font-bold tabular-nums">{formatTime(currentTime)}</div>
            <div className="text-sm text-white/60">{formatDate(currentTime)}</div>
          </div>
          <div className="md:hidden text-xl font-bold tabular-nums">{formatTime(currentTime)}</div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-8 lg:p-12 overflow-hidden">
        <section className="lg:w-1/2 flex flex-col gap-6">
          <div className="flex-1 bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl">
            <div className="p-6 md:p-12 flex flex-col items-center justify-center text-center h-full gap-8">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#1B2A4A] border-4 border-white/20 flex items-center justify-center shadow-2xl">
                <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-white/90" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight">Welcome</h2>
                <p className="text-lg md:text-2xl text-white/70 max-w-md">Check in here to join the queue and receive your appointment number</p>
              </div>
              <button
                onClick={() => setShowCheckIn(true)}
                className="w-full max-w-md h-20 md:h-24 text-xl md:text-3xl font-bold bg-white text-[#1B2A4A] hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-2xl rounded-2xl flex items-center justify-center gap-3"
              >
                <span>Check In Now</span>
                <ArrowRight className="w-8 h-8 md:w-10 md:h-10" />
              </button>
              <div className="flex items-center gap-3 text-white/50 text-sm md:text-base">
                <Clock className="w-5 h-5" />
                <span>Average wait time today: <strong className="text-white/80">12 minutes</strong></span>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:w-1/2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              Live Queue
            </h3>
            <span className="bg-white/10 text-white border border-white/20 text-sm md:text-base px-3 py-1 rounded-full">{displayQueue.length} Patients</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-2">
            {queueLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              displayQueue.map((item) => (
                <div key={item.id} className={`bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 rounded-xl p-4 md:p-6 flex items-center justify-between ${item.status === "in-progress" ? "ring-2 ring-emerald-400/50 bg-emerald-500/10" : ""}`}>
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-lg md:text-2xl font-bold ${item.status === "in-progress" ? "bg-emerald-500 text-white" : "bg-white/10 text-white/80"}`}>
                      {item.queueNumber}
                    </div>
                    <div>
                      <h4 className="text-lg md:text-2xl font-semibold">{item.patientName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                        <span className="text-sm md:text-base text-white/60">{getStatusLabel(item.status)}</span>
                      </div>
                    </div>
                  </div>
                  {item.status === "waiting" && (
                    <div className="text-right">
                      <div className="text-sm md:text-base text-white/50">Est. wait</div>
                      <div className="text-xl md:text-2xl font-bold text-amber-400">{item.estimatedWait}m</div>
                    </div>
                  )}
                  {item.status === "in-progress" && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm md:text-base px-3 py-1 rounded-full">Now Serving</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {showCheckIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1B2A4A] border border-white/10 text-white max-w-lg w-full rounded-xl overflow-hidden shadow-2xl">
            {checkInStep === "input" && (
              <div className="p-6 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl md:text-4xl font-bold text-center flex-1">Patient Check-In</h2>
                  <button onClick={() => setShowCheckIn(false)} className="p-2 hover:bg-white/10 rounded-lg">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <p className="text-center text-white/60 text-base md:text-lg mb-6">Enter your phone number or appointment ID</p>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm md:text-base font-medium text-white/80 flex items-center gap-2">
                      <Phone className="w-5 h-5" /> Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="05X XXX XXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full h-14 md:h-16 text-lg md:text-xl bg-white/5 border border-white/20 text-white placeholder:text-white/30 rounded-lg px-4 focus:outline-none focus:border-white/40"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                    <div className="relative flex justify-center text-xs md:text-sm uppercase"><span className="bg-[#1B2A4A] px-3 text-white/40">or</span></div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm md:text-base font-medium text-white/80 flex items-center gap-2">
                      <Calendar className="w-5 h-5" /> Appointment Number
                    </label>
                    <input
                      type="text"
                      placeholder="APT-XXXXX"
                      value={appointmentNumber}
                      onChange={(e) => setAppointmentNumber(e.target.value)}
                      className="w-full h-14 md:h-16 text-lg md:text-xl bg-white/5 border border-white/20 text-white placeholder:text-white/30 rounded-lg px-4 focus:outline-none focus:border-white/40"
                    />
                  </div>
                  <button
                    onClick={handleCheckIn}
                    disabled={(!phoneNumber && !appointmentNumber) || isSubmitting}
                    className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold bg-white text-[#1B2A4A] hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <div className="w-8 h-8 border-4 border-[#1B2A4A]/20 border-t-[#1B2A4A] rounded-full animate-spin" /> : <><span>Confirm Check-In</span><ArrowRight className="w-6 h-6" /></>}
                  </button>
                </div>
              </div>
            )}
            {checkInStep === "success" && (
              <div className="p-6 md:p-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-emerald-400" />
                </div>
                <h3 className="text-2xl md:text-4xl font-bold mb-3">Check-In Successful!</h3>
                <p className="text-lg md:text-xl text-white/70 mb-2">Your queue number is</p>
                <div className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">A004</div>
                <p className="text-base md:text-lg text-white/50">Please wait for your number to be called</p>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="px-6 py-4 md:px-12 md:py-6 border-t border-white/10 bg-[#1B2A4A]/80 text-center">
        <p className="text-sm md:text-base text-white/40">CORE SYSTEM v2.0 • {tenant?.name || "Clinic Management System"}</p>
      </footer>
    </div>
  );
}