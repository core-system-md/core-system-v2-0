const FILS_PER_JOD = 1000

export function subunitsToJOD(fils: number): string {
  const jod = fils / FILS_PER_JOD
  return `${jod.toFixed(3)} JOD`
}

export function jodToSubunits(jod: number): number {
  return Math.round(jod * FILS_PER_JOD)
}
