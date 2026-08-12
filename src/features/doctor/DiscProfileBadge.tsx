// DiscProfileBadge.tsx — P42-D: DISC personality type indicator
interface DiscProfileBadgeProps {
  profile: string | null;
}

const DISC_MAP: Record<string, { label: string; colorClass: string }> = {
  driver: { label: 'قيادي', colorClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  influencer: { label: 'مؤثر', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  analytical: { label: 'تحليلي', colorClass: 'bg-violet-50 text-violet-700 border-violet-200' },
  emotional: { label: 'عاطفي', colorClass: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function DiscProfileBadge({ profile }: DiscProfileBadgeProps) {
  if (!profile || !profile.trim()) return null;
  const mapped = DISC_MAP[profile.trim().toLowerCase()];
  if (!mapped) return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${mapped.colorClass}`} title={`نمط السلوك: ${mapped.label}`}>
      {mapped.label}
    </span>
  );
}
