import { useParams } from 'react-router-dom'

export function SurveyRouter() {
  const { sessionId } = useParams<{ sessionId: string }>()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <h1 className="text-xl font-bold text-[#1B2A4A] mb-4">Patient Survey</h1>
        <p className="text-slate-500 text-sm mb-4">استبيان المريض</p>
        <p className="text-slate-400 text-sm">Session: {sessionId}</p>
      </div>
    </div>
  )
}
