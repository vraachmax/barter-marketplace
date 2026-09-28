/** Small, explicitly curated starter set. No claim to a complete vehicle catalog. */
export const AUTO_ATTRIBUTE_OPTIONS = {
  fuel: [
    ['petrol', 'Бензин'], ['diesel', 'Дизель'], ['hybrid', 'Гибрид'],
    ['electric', 'Электро'], ['gas', 'Газ'],
  ],
  transmission: [
    ['manual', 'Механика'], ['automatic', 'Автомат'],
    ['robot', 'Робот'], ['variator', 'Вариатор'],
  ],
  body_type: [
    ['sedan', 'Седан'], ['hatch', 'Хэтчбек'], ['wagon', 'Универсал'],
    ['suv', 'Кроссовер / SUV'], ['coupe', 'Купе'], ['van', 'Минивэн'],
    ['pickup', 'Пикап'],
  ],
  drive: [['fwd', 'Передний'], ['rwd', 'Задний'], ['awd', 'Полный']],
} as const;

/** Published v1 field keys and values are stable; new catalog releases add keys. */
export const AUTO_ATTRIBUTE_FIELDS = [
  { key: 'fuel', label: 'Топливо' },
  { key: 'transmission', label: 'Коробка передач' },
  { key: 'body_type', label: 'Кузов' },
  { key: 'drive', label: 'Привод' },
] as const;

export function invalidCatalogOption(
  attributes: Record<string, unknown>,
  options: ReadonlyArray<{ fieldKey: string; value: string; parentFieldKey?: string; parentValue?: string }>,
): string | null {
  const allowed = new Map<string, typeof options>();
  for (const option of options) {
    allowed.set(option.fieldKey, [...(allowed.get(option.fieldKey) ?? []), option]);
  }
  for (const [key, choices] of allowed) {
    const value = attributes[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' || !choices.some((choice) =>
      choice.value === value && (!choice.parentFieldKey || attributes[choice.parentFieldKey] === choice.parentValue))) return key;
  }
  return null;
}
