const translitMap: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ye','ж':'zh',
  'з':'z','и':'y','і':'i','ї':'yi','й':'y','к':'k','л':'l','м':'m','н':'n',
  'о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
  'ч':'ch','ш':'sh','щ':'shch','ь':'','ю':'yu','я':'ya','ё':'yo','ы':'y','э':'e',
};

/**
 * Generate a URL-safe slug from any string (supports Cyrillic transliteration).
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map(c => translitMap[c] ?? c)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}
