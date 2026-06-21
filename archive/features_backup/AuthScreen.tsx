export function AuthScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1B2A4A]">CORE SYSTEM</h1>
          <p className="text-slate-500 mt-2">تسجيل الدخول</p>
        </div>
        <div className="space-y-4">
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-10 bg-[#1B2A4A] rounded-lg flex items-center justify-center text-white">
            دخول
          </div>
        </div>
      </div>
    </div>
  )
}
