const EMP_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-lime-50 text-lime-700 border-lime-200',
  'bg-violet-50 text-violet-700 border-violet-200',
];

const LEFT_BORDER_PALETTE = [
  'border-l-blue-400',
  'border-l-emerald-400',
  'border-l-amber-400',
  'border-l-purple-400',
  'border-l-rose-400',
  'border-l-cyan-400',
  'border-l-orange-400',
  'border-l-indigo-400',
  'border-l-teal-400',
  'border-l-pink-400',
  'border-l-lime-400',
  'border-l-violet-400',
];

export function getEmpColor(name: string): string {
  if (!EMP_COLORS[name]) {
    const idx = Object.keys(EMP_COLORS).length % COLOR_PALETTE.length;
    EMP_COLORS[name] = COLOR_PALETTE[idx];
  }
  return EMP_COLORS[name];
}

export function getEmpBorder(name: string): string {
  getEmpColor(name);
  const idx = Object.keys(EMP_COLORS).indexOf(name) % LEFT_BORDER_PALETTE.length;
  return LEFT_BORDER_PALETTE[idx];
}
