import { useNavigate } from 'react-router-dom';

export default function AuthScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1B2A4A]" dir="rtl">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-center mb-6 text-[#1B2A4A]">CORE SYSTEM</h1>
        <button onClick={() => navigate('/doctor')} className="w-full bg-[#1B2A4A] text-white py-3 rounded-lg">دخول كطبيب</button>
      </div>
    </div>
  );
}
