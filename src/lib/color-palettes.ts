// Палитры цветов для карточек календаря

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    hex: string;
    name: string;
  }[];
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'rose-bloom',
    name: 'Rosé Bloom',
    description: 'Жіночий салон — пильні рожеві, бежеві та золоті тони',
    colors: [
      { hex: '#D88B79', name: 'Димчаста троянда' },
      { hex: '#C09BAC', name: 'Пильна орхідея' },
      { hex: '#BEA98E', name: 'Шампань золото' },
      { hex: '#A6445D', name: 'Бордовий оксамит' },
      { hex: '#9B7E82', name: 'Вечірня лаванда' },
      { hex: '#D9B6A3', name: 'Персиковий крем' },
      { hex: '#B08968', name: 'Карамельний тауп' },
      { hex: '#8B6F82', name: 'Сливовий туман' },
      { hex: '#C4A57B', name: 'Античне золото' },
      { hex: '#9C7B7A', name: 'Рожеве дерево' },
    ],
  },
  {
    id: 'heritage-vault',
    name: 'Heritage Vault',
    description: 'Барбершоп — глибокі чоловічі тони: синій, сірий, коричневий',
    colors: [
      { hex: '#2E4053', name: 'Оксфордський синій' },
      { hex: '#5B6E74', name: 'Сталевий сірий' },
      { hex: '#62929E', name: 'Прибережний шифер' },
      { hex: '#8B7355', name: 'Тютюнова шкіра' },
      { hex: '#142F40', name: 'Midnight navy' },
      { hex: '#617246', name: 'Оливкове сукно' },
      { hex: '#A0826D', name: 'Сідловина' },
      { hex: '#404A42', name: 'Вугільна зелень' },
      { hex: '#7A6F5D', name: 'Димчастий мох' },
      { hex: '#557373', name: 'Морська сіль' },
    ],
  },
  {
    id: 'earth-harmony',
    name: 'Earth Harmony',
    description: 'Унісекс — природні earth tones та пастельні відтінки',
    colors: [
      { hex: '#87C2CA', name: 'Тибетський камінь' },
      { hex: '#BAB8A8', name: 'Зелене дерево' },
      { hex: '#E6D17B', name: 'Пшеничне золото' },
      { hex: '#DF93B4', name: 'Квітка персика' },
      { hex: '#94B5FD', name: 'Каролінський синій' },
      { hex: '#C0B283', name: 'Піщаний беж' },
      { hex: '#9DF0B3', name: "М'ятний тонік" },
      { hex: '#BDB7DB', name: 'Мелроуз' },
      { hex: '#D3E08C', name: 'Зелене зачарування' },
      { hex: '#F1C764', name: 'Медовий' },
    ],
  },
];

export const DEFAULT_PALETTE_ID = 'earth-harmony';

export function getPaletteById(id: string): ColorPalette | undefined {
  return COLOR_PALETTES.find(p => p.id === id);
}

export function getPaletteColors(paletteId: string): string[] {
  const palette = getPaletteById(paletteId);
  return palette ? palette.colors.map(c => c.hex) : COLOR_PALETTES[2].colors.map(c => c.hex);
}
