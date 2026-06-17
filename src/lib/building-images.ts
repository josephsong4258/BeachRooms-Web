// Bundled building photos, keyed by building code. Files live in
// public/assets/buildings/{CODE}.webp and are generated from raw source images
// by scripts/optimize-building-photos.js. A building with no entry here falls
// back to the striped placeholder on its page.
const BUILDINGS_WITH_PHOTOS = new Set([
  'AS', 'CINE', 'COB', 'CPCE', 'DESN', 'ECS', 'ED2', 'EED', 'EN2', 'EN3',
  'EN4', 'ET', 'FA2', 'FA4', 'FCS', 'HC', 'HHS1', 'HSCI', 'HSD', 'KIN',
  'LA1', 'LA2', 'LA3', 'LA4', 'LA5', 'LAB', 'MHB', 'MIC', 'MLSC', 'NUR',
  'PH1', 'PSY', 'SPA', 'SSC', 'TA', 'VEC',
]);

export function buildingImage(code: string): string | null {
  return BUILDINGS_WITH_PHOTOS.has(code) ? `/assets/buildings/${code}.webp` : null;
}
