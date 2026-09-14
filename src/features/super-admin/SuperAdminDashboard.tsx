import { useTranslation } from 'react-i18next';
import { useAuth } from "@/core/auth/AuthProvider";
import { Building2, CreditCard, Shield, Globe } from "lucide-react";

export default function SuperAdminDashboard() {
  const { t } = useTranslation('super-admin');
  const { fullName } = useAuth();
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">{t('title', 'لوحة تحكم النظام')}</h1>
      <p className="text-white/60 mb-8">{t('welcome', 'مرحباً {{name}}', { name: fullName || t('systemAdmin', 'مدير النظام') })}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <Building2 className="w-5 h-5 text-blue-400 mb-2" />
          <span className="text-white/70 text-sm">{t('tenants', 'العيادات')}</span>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <CreditCard className="w-5 h-5 text-green-400 mb-2" />
          <span className="text-white/70 text-sm">{t('subscriptions', 'الاشتراكات')}</span>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <Shield className="w-5 h-5 text-yellow-400 mb-2" />
          <span className="text-white/70 text-sm">{t('security', 'الأمان')}</span>
          <p className="text-2xl font-bold text-white">—</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <Globe className="w-5 h-5 text-purple-400 mb-2" />
          <span className="text-white/70 text-sm">{t('systemHealth', 'الصحة العامة')}</span>
          <p className="text-2xl font-bold text-white">100%</p>
        </div>
      </div>
      <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-4">{t('tenantRegistry', 'Tenant Registry')}</h2>
        <p className="text-white/50">{t('inDevelopment', 'قيد التطوير')}</p>
      </div>
    </div>
  );
}
