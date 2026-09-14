export const gamePlayUrls: Record<string, string> = {
  'golden-dragon': 'https://www.playgd.mobi',
  'magic-city': 'https://www.magiccity777.com/',
  river: 'https://river777.net/',
  'fire-phoenix': 'https://fpc-mob.com/?skey=242C9DDAA16145213F0EB03767D9FBBD',
};

export function getGamePlayUrl(slug: string) {
  return gamePlayUrls[slug] ?? null;
}
