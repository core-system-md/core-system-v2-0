import { classifyPatient, getClassColors } from '@/shared/utils/scoreDisplay';

interface CoreScoreMeterProps {
  backendScore: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function CoreScoreMeter({ backendScore, size = 'md', showLabel = true }: CoreScoreMeterProps) {
  if (backendScore === null || backendScore === undefined) {
    return <span className="text-white/30 text-sm">—</span>;
  }

  const displayScore = Math.round((backendScore / 10) * 10) / 10;
  const classification = classifyPatient(displayScore);
  const colors = getClassColors(classification);

  const sizeClasses = {
    sm: { score: 'text-lg', label: 'text-xs', padding: 'px-2 py-1' },
    md: { score: 'text-xl', label: 'text-sm', padding: 'px-3 py-1.5' },
    lg: { score: 'text-2xl', label: 'text-base', padding: 'px-4 py-2' }
  };
  const sizes = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg ${colors.bg} ${sizes.padding}`}>
      <span className={`font-bold ${colors.text} ${sizes.score}`}>
        {displayScore.toFixed(1)}
      </span>
      {showLabel && (
        <span className={`${colors.text} ${sizes.label} opacity-70`}>
          {classification}
        </span>
      )}
    </div>
  );
}
