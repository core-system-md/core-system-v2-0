import { ReactNode } from 'react';
import { useFeatureFlag } from '@/shared/hooks/useFeatureFlag';

interface FeatureGateProps {
  flagKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

/**
 * FeatureGate — Constitution §8 Compliance
 * 
 * Wraps UI components with feature flag check.
 * If flag is disabled or tier not allowed, renders fallback (default: null)
 * 
 * Usage:
 * <FeatureGate flagKey="AI_REPORTS">
 *   <AIReportPanel />
 * </FeatureGate>
 */
export default function FeatureGate({ 
  flagKey, 
  children, 
  fallback = null,
  loadingComponent = null 
}: FeatureGateProps) {
  const { isEnabled, isLoading } = useFeatureFlag(flagKey);

  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * FeatureGate for multiple flags (ALL must be enabled)
 * Constitution §8.2: Tier validation for each flag
 */
import { useFeatureFlags } from '@/shared/hooks/useFeatureFlag';

interface FeatureGateAllProps {
  flagKeys: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGateAll({ 
  flagKeys, 
  children, 
  fallback = null 
}: FeatureGateAllProps) {
  const { flags, isLoading } = useFeatureFlags(flagKeys);

  if (isLoading) {
    return null;
  }

  const allEnabled = flagKeys.every(key => flags[key]);

  if (!allEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * FeatureGate for multiple flags (ANY must be enabled)
 */
export function FeatureGateAny({ 
  flagKeys, 
  children, 
  fallback = null 
}: FeatureGateAllProps) {
  const { flags, isLoading } = useFeatureFlags(flagKeys);

  if (isLoading) {
    return null;
  }

  const anyEnabled = flagKeys.some(key => flags[key]);

  if (!anyEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}