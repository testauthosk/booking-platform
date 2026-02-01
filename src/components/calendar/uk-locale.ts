export const ukLocale = {
  code: 'uk',
  week: {
    dow: 1, // Monday is the first day of the week
    doy: 4, // The week that contains Jan 4th is the first week of the year
  },
  buttonText: {
    prev: '‹',
    next: '›',
    today: 'Сьогодні',
    month: 'Місяць',
    week: 'Тиждень',
    day: 'День',
    list: 'Список',
  },
  weekText: 'Тиж',
  allDayText: 'Весь день',
  moreLinkText: (n: number) => `+ще ${n}`,
  noEventsText: 'Немає подій для відображення',
  buttonHints: {
    prev: 'Попередній $0',
    next: 'Наступний $0',
    today: 'Сьогодні',
  },
  viewHint: '$0 перегляд',
  navLinkHint: 'Перейти до $0',
};
