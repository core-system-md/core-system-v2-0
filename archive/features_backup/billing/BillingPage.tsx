import { useState } from "react";

interface BillingPageProps {
  tenantId: string;
  currentTier: string;
  nextBillingDate: string;
  currentBalance: number;
}

export function BillingPage({ currentTier, nextBillingDate, currentBalance }: BillingPageProps) {
  const [selectedPlan, setSelectedPlan] = useState(currentTier);

  const plans = [
    { name: "Starter", price: 49, features: ["Up to 3 staff", "Basic analytics", "Email support"] },
    { name: "Professional", price: 149, features: ["Up to 15 staff", "Advanced analytics", "Priority support", "Custom branding"] },
    { name: "Enterprise", price: 499, features: ["Unlimited staff", "Full analytics", "24/7 support", "Custom integrations", "SLA guarantee"] },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-white capitalize">{currentTier}</p>
            <p className="text-sm text-slate-500">Next billing: {new Date(nextBillingDate).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">${currentBalance.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Current balance</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.name} className={`bg-slate-900 border rounded-2xl p-6 transition-colors ${selectedPlan === plan.name.toLowerCase() ? "border-emerald-500/50 bg-emerald-950/10" : "border-slate-800 hover:border-slate-700"}`}>
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <p className="text-3xl font-bold text-white mt-2">${plan.price}<span className="text-sm text-slate-500 font-normal">/mo</span></p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-slate-400">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {feature}
                </li>
              ))}
            </ul>
            <button onClick={() => setSelectedPlan(plan.name.toLowerCase())} className={`w-full mt-6 py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedPlan === plan.name.toLowerCase() ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              {selectedPlan === plan.name.toLowerCase() ? "Current Plan" : "Select Plan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
