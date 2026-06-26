// CORE SYSTEM v2.1 — Barrel Exports
// Constitution §3: Folder Structure Compliance

// Core platform layer
export * from './core';

// Domain data layer
export * from './domain';

// Feature modules (UI screens)
export * from './features';

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

// Note: PatientClass type is exported from scoreDisplay.ts only
// Do NOT export * from './shared/utils' to avoid duplicate identifiers
