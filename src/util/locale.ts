const supportedLocales = ['en', 'lv'];

export function detectLocale(acceptLanguage: string | undefined): string {
  if (!acceptLanguage || typeof acceptLanguage !== 'string') return 'en';
  const langs = acceptLanguage.split(',').map(l => l.split(';')[0]!.trim());
  for (const lang of langs) {
    if (supportedLocales.includes(lang)) return lang;
    const base = lang.split('-')[0]!;
    if (supportedLocales.includes(base)) return base;
  }
  return 'en';
} 