// ============================================================
// CORE SYSTEM v2.1 — CoreRulesConfigManager
// P28: Super Admin Rules Configuration
// Constitution §4.1: scoring/weights and scoring/pqs_thresholds are READ-ONLY
// All other rules: editable if is_overridable = true
// FIXED: 2026-07-23 — TypeScript errors: Json cast, undefined checks, export default
// ============================================================

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/infrastructure/supabase/client";
import { Settings, Lock, Save, RefreshCw, AlertTriangle } from "lucide-react";

interface CoreRule {
  id: string;
  tenant_id: string | null;
  rule_category: string;
  rule_key: string;
  rule_name: string;
  rule_value: Record<string, unknown>;
  is_overridable: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  scoring: "التقييم",
  sla: "اتفاقية مستوى الخدمة",
  automation: "التشغيل الآلي",
  billing: "الفوترة",
  permissions: "الصلاحيات",
};

const CATEGORY_ICONS: Record<string, string> = {
  scoring: "📊",
  sla: "⏱️",
  automation: "⚙️",
  billing: "💰",
  permissions: "🔐",
};

const LOCKED_RULES = ["weights", "pqs_thresholds"];

function CoreRulesConfigManager() {
  const [rules, setRules] = useState<CoreRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("core_rules_config")
        .select("id, tenant_id, rule_category, rule_key, rule_name, rule_value, is_overridable, created_at, updated_at")
        .order("rule_category")
        .order("rule_key");

      if (error) throw error;

      const rows = (data || []) as CoreRule[];
      setRules(rows);

      const initialEdits: Record<string, string> = {};
      rows.forEach((r) => {
        initialEdits[r.id] = JSON.stringify(r.rule_value, null, 2);
      });
      setEditingValues(initialEdits);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل في تحميل القواعد");
    } finally {
      setLoading(false);
    }
  }

  async function updateRule(ruleId: string) {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;

    if (LOCKED_RULES.includes(rule.rule_key)) {
      toast.error("هذه القاعدة محمية بموجب الدستور §4.1 ولا يمكن تعديلها");
      return;
    }

    if (!rule.is_overridable) {
      toast.error("هذه القاعدة غير قابلة للتجاوز");
      return;
    }

    setSaving(ruleId);
    try {
      let parsedValue: Record<string, unknown>;
      try {
        parsedValue = JSON.parse(editingValues[ruleId] || "{}");
      } catch {
        toast.error("صيغة JSON غير صالحة");
        setSaving(null);
        return;
      }

      const { error } = await supabase
        .from("core_rules_config")
        .update({
          rule_value: parsedValue as unknown as import("@/infrastructure/supabase/database.types").Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ruleId);

      if (error) throw error;

      setRules((prev) =>
        prev.map((r) =>
          r.id === ruleId ? { ...r, rule_value: parsedValue, updated_at: new Date().toISOString() } : r
        )
      );

      toast.success(`تم تحديث القاعدة: ${rule.rule_name}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل في التحديث");
    } finally {
      setSaving(null);
    }
  }

  function handleValueChange(ruleId: string, newValue: string) {
    setEditingValues((prev) => ({ ...prev, [ruleId]: newValue }));
  }

  function isLocked(rule: CoreRule): boolean {
    return LOCKED_RULES.includes(rule.rule_key);
  }

  const groupedRules = rules.reduce<Record<string, CoreRule[]>>((acc, rule) => {
    if (!acc[rule.rule_category]) {
      acc[rule.rule_category] = [];
    }
    acc[rule.rule_category]!.push(rule);
    return acc;
  }, {});

  const categories = Object.keys(groupedRules).sort(
    (a, b) => (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b)
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#1B2A4A]" />
            قواعد CORE
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            إدارة قواعد النظام — القواعد المحمية بالدستور غير قابلة للتعديل
          </p>
        </div>
        <button
          onClick={fetchRules}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">تنبيه دستوري</p>
          <p className="text-xs text-amber-700 mt-1">
            قواعد التقييم (weights, pqs_thresholds) محمية بموجب Constitution §4.1 ولا يمكن تعديلها.
            أي تعديل على هذه القواعد يُبطل التحليل السلوكي.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((category) => (
          <div
            key={category}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-bold text-[#1B2A4A]">
                {CATEGORY_ICONS[category] || "📋"} {CATEGORY_LABELS[category] || category}
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              {groupedRules[category]?.map((rule) => {
                const locked = isLocked(rule);
                const editable = rule.is_overridable && !locked;

                return (
                  <div key={rule.id} className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {rule.rule_name}
                          </span>
                          {locked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <Lock className="w-3 h-3" />
                              محمي
                            </span>
                          )}
                          {!locked && rule.is_overridable && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              قابل للتعديل
                            </span>
                          )}
                          {!locked && !rule.is_overridable && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              مقفل
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{rule.rule_key}</p>
                      </div>
                      {editable && (
                        <button
                          onClick={() => updateRule(rule.id)}
                          disabled={saving === rule.id}
                          className="px-3 py-1.5 bg-[#1B2A4A] text-white text-xs font-medium rounded-lg hover:bg-[#2a3d66] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {saving === rule.id ? "جاري الحفظ..." : "حفظ"}
                        </button>
                      )}
                    </div>

                    <div className="mt-2">
                      <textarea
                        value={editingValues[rule.id] || ""}
                        onChange={(e) => handleValueChange(rule.id, e.target.value)}
                        disabled={!editable}
                        rows={3}
                        className={`w-full text-xs font-mono p-3 rounded-lg border transition-colors resize-none ${
                          editable
                            ? "bg-white border-gray-300 text-gray-800 focus:border-[#1B2A4A] focus:ring-1 focus:ring-[#1B2A4A]/20"
                            : "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                        dir="ltr"
                      />
                      {locked && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          محمي بموجب Constitution §4.1 — عرض فقط
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد قواعد مسجلة في النظام</p>
        </div>
      )}
    </div>
  );
}

export default CoreRulesConfigManager;
