import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthScreen from "@/components/AuthScreen";
import AmbientKioskView from "@/components/AmbientKioskView";
import PinPad from "@/components/PinPad";
import { ReceptionLayout } from "@/components/ReceptionLayout";
import { DoctorLayout } from "@/components/DoctorLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import { SurveyRouter } from "@/components/SurveyRouter";
import { LiveQueueBoard } from "@/components/LiveQueueBoard";
import CoreScoreWidget from "@/components/CoreScoreWidget";
import { DoctorPatientList } from "@/components/doctor/DoctorPatientList";
import { DoctorSessionView } from "@/components/doctor/DoctorSessionView";

function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-white/60">
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      <p className="text-lg">Page under construction</p>
      <p className="text-sm mt-2">سيتم إضافة هذه الصفحة قريباً</p>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <AuthScreen /> },
  { path: "/kiosk", element: <AmbientKioskView /> },
  {
    path: "/kiosk-pin",
    element: (
      <PinPad
        onSuccess={(userId, role) => {
          console.log("PIN login:", userId, role);
          window.location.href = "/reception";
        }}
        onCancel={() => window.location.href = "/kiosk"}
      />
    ),
  },
  {
    path: "/reception",
    element: <ReceptionLayout />,
    children: [
      {
        index: true,
        element: (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Reception Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CoreScoreWidget score={85} label="Queue Efficiency" trend="up" />
              <CoreScoreWidget score={92} label="Patient Satisfaction" trend="up" />
              <CoreScoreWidget score={78} label="Staff Performance" trend="neutral" />
            </div>
            <LiveQueueBoard />
          </div>
        ),
      },
      { path: "patients", element: <PagePlaceholder title="Patients" /> },
      { path: "appointments", element: <PagePlaceholder title="Appointments" /> },
      { path: "invoices", element: <PagePlaceholder title="Invoices" /> },
    ],
  },
  {
    path: "/doctor",
    element: <DoctorLayout />,
    children: [
      {
        index: true,
        element: <DoctorPatientList />,
      },
      { path: "session/:id", element: <DoctorSessionView /> },
      { path: "patients", element: <PagePlaceholder title="Doctor - Patients" /> },
      { path: "procedures", element: <PagePlaceholder title="Procedures" /> },
      { path: "prescriptions", element: <PagePlaceholder title="Prescriptions" /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <CoreScoreWidget score={88} label="System Uptime" trend="up" size="sm" />
              <CoreScoreWidget score={72} label="Revenue" trend="up" size="sm" />
              <CoreScoreWidget score={95} label="Staff Attendance" trend="up" size="sm" />
              <CoreScoreWidget score={65} label="Patient Retention" trend="down" size="sm" />
            </div>
          </div>
        ),
      },
      { path: "staff", element: <PagePlaceholder title="Staff Management" /> },
      { path: "clinics", element: <PagePlaceholder title="Clinics" /> },
      { path: "analytics", element: <PagePlaceholder title="Analytics" /> },
      { path: "settings", element: <PagePlaceholder title="Settings" /> },
    ],
  },
  {
    path: "/super-admin",
    element: <SuperAdminLayout />,
    children: [
      {
        index: true,
        element: (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CoreScoreWidget score={98} label="Global Uptime" trend="up" size="lg" />
              <CoreScoreWidget score={87} label="Tenant Health" trend="up" size="lg" />
              <CoreScoreWidget score={91} label="Billing Status" trend="neutral" size="lg" />
            </div>
          </div>
        ),
      },
      { path: "billing", element: <PagePlaceholder title="Billing" /> },
      { path: "health", element: <PagePlaceholder title="System Health" /> },
      { path: "audit", element: <PagePlaceholder title="Audit Logs" /> },
    ],
  },
  { path: "/survey/:sessionId", element: <SurveyRouter /> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);