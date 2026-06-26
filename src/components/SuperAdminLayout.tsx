import { Outlet } from 'react-router-dom';

export default function SuperAdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-[#1B2A4A] mb-4">لوحة تحكم النظام</h1>
        <Outlet />
      </div>
    </div>
  );
}