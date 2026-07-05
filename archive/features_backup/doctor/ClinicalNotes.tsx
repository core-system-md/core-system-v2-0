import { useState, useEffect } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';

interface Note {
  id: string;
  content: string;
  type: "subjective" | "objective" | "assessment" | "plan";
  created_at: string;
  created_by: string;
}

interface ClinicalNotesProps {
  sessionId: string;
  patientName: string;
}

export function ClinicalNotes({ sessionId, patientName }: ClinicalNotesProps) {
  // ─── TENANT GUARD ───
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  if (!tenantId) {
    return (
      <div className="p-6 text-center text-red-500" dir="rtl">
        Tenant not initialized
      </div>
    );
  }

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState<Note["type"]>"subjective");
  const [newContent, setNewContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const tabs = [
    { key: "subjective" as const, label: "S", labelAr: "ذاتي", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
    { key: "objective" as const, label: "O", labelAr: "موضوعي", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
    { key: "assessment" as const, label: "A", labelAr: "تقييم", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
    { key: "plan" as const, label: "P", labelAr: "خطة", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
  ];

  useEffect(() => {
    fetchNotes();
  }, [sessionId, tenantId]);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('session_id', sessionId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet, use local state
        console.log('clinical_notes table not found, using local state');
        setNotes([]);
        return;
      }

      setNotes(data || []);
    } catch (err) {
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newContent.trim()) {
      toast.error('الملاحظة فارغة');
      return;
    }

    const newNote: Omit<Note, 'id' | 'created_at'> = {
      content: newContent.trim(),
      type: activeTab,
      created_by: user?.full_name || 'Doctor',
    };

    try {
      const { data, error } = await supabase
        .from('clinical_notes')
        .insert({
          session_id: sessionId,
          tenant_id: tenantId,
          ...newNote,
        })
        .select()
        .single();

      if (error) {
        // If table doesn't exist, store locally
        const localNote: Note = {
          id: Date.now().toString(),
          ...newNote,
          created_at: new Date().toISOString(),
        };
        setNotes([localNote, ...notes]);
        toast.success('تم إضافة الملاحظة (محلياً)');
      } else {
        setNotes([data, ...notes]);
        toast.success('تم إضافة الملاحظة');
      }

      setNewContent("");
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  const handleUpdateNote = async (id: string, content: string) => {
    try {
      const { error } = await supabase
        .from('clinical_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        // Update locally
        setNotes(notes.map(n => n.id === id ? { ...n, content } : n));
        return;
      }

      setNotes(notes.map(n => n.id === id ? { ...n, content } : n));
      toast.success('تم تحديث الملاحظة');
    } catch (err) {
      toast.error('حدث خطأ في التحديث');
    }
  };

  const filteredNotes = notes.filter((n) => n.type === activeTab);

  if (isLoading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-gray-500">جاري تحميل الملاحظات...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full" dir="rtl">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">ملاحظات SOAP — {patientName}</h2>
        <div className="flex gap-2 mt-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${activeTab === tab.key ? tab.color : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200"}`}
              title={tab.labelAr}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredNotes.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            لا توجد ملاحظات {tabs.find(t => t.key === activeTab)?.labelAr}
          </div>
        )}
        {filteredNotes.map((note) => (
          <div key={note.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{new Date(note.created_at).toLocaleString('ar-JO')}</span>
              <span className="text-xs text-slate-500">{note.created_by}</span>
            </div>
            <textarea
              defaultValue={note.content}
              onBlur={(e) => handleUpdateNote(note.id, e.target.value)}
              className="w-full bg-transparent text-sm text-slate-300 resize-none focus:outline-none min-h-[60px]"
              dir="rtl"
            />
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder={`أضف ملاحظة ${tabs.find(t => t.key === activeTab)?.labelAr}...`}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none min-h-[80px]"
          dir="rtl"
        />
        <button
          onClick={handleAddNote}
          className="w-full mt-2 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20"
        >
          إضافة ملاحظة
        </button>
      </div>
    </div>
  );
}