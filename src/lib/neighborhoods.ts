// Which part of campus each building sits in, keyed by building code. Shown as
// the subtitle on the building page (e.g. "AS · Upper Campus"). Buildings are
// added to Supabase manually, so a new code simply has no neighborhood until
// it's added here — the subtitle falls back to the code alone.
const BUILDING_NEIGHBORHOODS: Record<string, string> = {
  // Upper campus
  AS: 'Upper Campus', // Academic Services
  ED2: 'Upper Campus', // Education 2
  EED: 'Upper Campus', // Ellis Education Building
  FA2: 'Upper Campus', // Fine Arts 2
  HSCI: 'Upper Campus', // Hall of Science
  LA1: 'Upper Campus', // Liberal Arts 1
  LA2: 'Upper Campus', // Liberal Arts 2
  LA3: 'Upper Campus', // Liberal Arts 3
  LA4: 'Upper Campus', // Liberal Arts 4
  LA5: 'Upper Campus', // Liberal Arts 5
  LAB: 'Upper Campus', // Language Arts
  MIC: 'Upper Campus', // Microbiology
  MLSC: 'Upper Campus', // Molecular & Life Sciences Center
  PH1: 'Upper Campus', // Peterson Hall 1
  PSY: 'Upper Campus', // Psychology
  SSC: 'Upper Campus', // Shakarian Student Success Center

  // Lower campus
  COB: 'Lower Campus', // Business
  CPCE: 'Lower Campus', // Professional/Continuing Education
  ECS: 'Lower Campus', // Engineering/Computer Science
  EN2: 'Lower Campus', // Engineering 2
  ET: 'Lower Campus', // Engineering Technology
  VEC: 'Lower Campus', // Vivian Engineering Center
  HC: 'Lower Campus', // Horn Center
  HSD: 'Lower Campus', // Human Services & Design
  KIN: 'Lower Campus', // Kinesiology
  SPA: 'Lower Campus', // Social Science/Public Affairs

  // Central campus
  FCS: 'Central Campus', // Family and Consumer Sciences
  NUR: 'Central Campus', // Nursing
};

export function buildingNeighborhood(code: string): string | null {
  return BUILDING_NEIGHBORHOODS[code] ?? null;
}
