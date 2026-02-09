// Premium color palettes for salon/barbershop calendar cards
// Based on luxury branding research: muted tones, high contrast, sophisticated combinations

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
    id: 'velvet-rose',
    name: 'Velvet Rosé',
    description: 'Жіночий салон — пильні рожеві, бордо, шампань',
    colors: [
      { hex: '#A6445D', name: 'Бордовий оксамит' },
      { hex: '#D88B79', name: 'Димчаста троянда' },
      { hex: '#C09BAC', name: 'Пильна орхідея' },
      { hex: '#D9B6A3', name: 'Персиковий крем' },
      { hex: '#B08968', name: 'Карамельний тауп' },
      { hex: '#8B6F82', name: 'Сливовий туман' },
      { hex: '#723E31', name: 'Теракотовий бронз' },
      { hex: '#A0826D', name: 'Сідловина' },
      { hex: '#C4A57B', name: 'Античне золото' },
      { hex: '#9C7B7A', name: 'Рожеве дерево' },
    ],
  },
  {
    id: 'heritage-noir',
    name: 'Heritage Noir',
    description: 'Барбершоп — глибокі сині, сірі, шкіра і дерево',
    colors: [
      { hex: '#142F40', name: 'Midnight navy' },
      { hex: '#2E4053', name: 'Оксфордський синій' },
      { hex: '#5B6E74', name: 'Сталевий шифер' },
      { hex: '#62929E', name: 'Прибережний тіл' },
      { hex: '#8B7355', name: 'Тютюнова шкіра' },
      { hex: '#617246', name: 'Оливкове сукно' },
      { hex: '#A0826D', name: 'Кожа сідла' },
      { hex: '#404A42', name: 'Вугільна зелень' },
      { hex: '#557373', name: 'Морська сіль' },
      { hex: '#7A6F5D', name: 'Димчастий мох' },
    ],
  },
  {
    id: 'champagne-gold',
    name: 'Champagne & Gold',
    description: 'Преміум — золоті, бежеві, теплі нейтральні',
    colors: [
      { hex: '#D9B061', name: 'Шампань золото' },
      { hex: '#C0B283', name: 'Піщаний беж' },
      { hex: '#BFA6A0', name: 'Рожевий тауп' },
      { hex: '#D9C4A9', name: 'Крем-брюле' },
      { hex: '#8D6F57', name: 'Мокко' },
      { hex: '#A67564', name: 'Теракотова глина' },
      { hex: '#D9B18E', name: 'Медовий мигдаль' },
      { hex: '#9B8E7E', name: 'Теплий граніт' },
      { hex: '#BEA98E', name: 'Ваніль латте' },
      { hex: '#7A6652', name: 'Дубовий бронз' },
    ],
  },
  {
    id: 'emerald-luxe',
    name: 'Emerald Luxe',
    description: 'Унісекс — смарагдові, м\'ятні, золотисті акценти',
    colors: [
      { hex: '#2E8B57', name: 'Смарагдовий' },
      { hex: '#005B5C', name: 'Глибокий тіл' },
      { hex: '#87C2CA', name: 'Крижаний тонік' },
      { hex: '#617246', name: 'Мохова зелень' },
      { hex: '#9DF0B3', name: 'М\'ятний фреш' },
      { hex: '#C0B283', name: 'Золотий пісок' },
      { hex: '#404A42', name: 'Лісова тінь' },
      { hex: '#819FA7', name: 'Сірий шавлія' },
      { hex: '#D3E08C', name: 'Зелений чай' },
      { hex: '#557373', name: 'Евкаліпт' },
    ],
  },
  {
    id: 'classic-mono',
    name: 'Classic Mono',
    description: 'Мінімалізм — відтінки сірого, чорний, акценти',
    colors: [
      { hex: '#1A1A2E', name: 'Майже чорний' },
      { hex: '#4A4A5A', name: 'Графіт' },
      { hex: '#6B6B7B', name: 'Шиферний' },
      { hex: '#8E8E9E', name: 'Срібний туман' },
      { hex: '#A8A8B5', name: 'Платиновий' },
      { hex: '#BFAFAF', name: 'Тауп рожевий' },
      { hex: '#819FA7', name: 'Сіро-блакитний' },
      { hex: '#5B6E74', name: 'Мокрий камінь' },
      { hex: '#9B8E7E', name: 'Пісочний сірий' },
      { hex: '#707070', name: 'Бетон' },
    ],
  },
];

export const DEFAULT_PALETTE_ID = 'champagne-gold';

export function getPaletteById(id: string): ColorPalette | undefined {
  return COLOR_PALETTES.find(p => p.id === id);
}

export function getPaletteColors(paletteId: string): string[] {
  const palette = getPaletteById(paletteId);
  return palette ? palette.colors.map(c => c.hex) : COLOR_PALETTES[2].colors.map(c => c.hex);
}
