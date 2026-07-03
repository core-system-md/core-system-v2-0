// CORE SYSTEM v2.1 — Barrel Exports
// Constitution §3: Folder Structure Compliance

// Core platform layer
export * from './core';

// Shared utilities — Explicit exports to avoid ambiguity
export { 
  backendToDisplay, 
  displayToBackend, 
  classifyPatient, 
  getClassLabel, 
  getClassColors 
} from './shared/utils/scoreDisplay';

export { 
  subunitsToDisplay, 
  displayToSubunits, 
  addSubunits, 
  subtractSubunits,
  CURRENCY,
  SUBUNIT_RATIO 
} from './shared/utils/currency';

// Infrastructure
export * from './infrastructure';

// Types
// export * from './shared/types'; // UserRole re-exported from core/auth/types.ts
