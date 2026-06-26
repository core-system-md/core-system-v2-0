import { useParams } from 'react-router-dom';

export default function SimpleInvoice() {
  const { sessionId } = useParams();

  return (
    <div className="p-4" dir="rtl">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-4">فاتورة الجلسة</h1>
      <p className="text-gray-600">رقم الجلسة: {sessionId}</p>
      <p className="text-gray-500 mt-4">قيد التطوير...</p>
    </div>
  );
}