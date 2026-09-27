// Горячие клавиши не должны зависеть от раскладки клавиатуры.
// Основной источник истины — физическая клавиша (event.code),
// а кириллический маппинг остаётся запасным вариантом для браузеров,
// которые не отдают code (например, часть экранных клавиатур).

const RU_TO_EN: Record<string, string> = {
  'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p',
  'х': '[', 'ъ': ']', 'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k',
  'д': 'l', 'ж': ';', 'э': "'", 'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm',
  'б': ',', 'ю': '.', 'ё': '`'
};

/**
 * Возвращает нормализованную клавишу: латинская буква/цифра в нижнем регистре
 * для символьных клавиш и обычный event.key («ArrowLeft», «Escape», « ») для остальных.
 */
export function hotkeyChar(event: KeyboardEvent): string {
  const code = event.code;
  if (code) {
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  }
  const key = event.key;
  if (key.length !== 1) return key;
  const lower = key.toLowerCase();
  return RU_TO_EN[lower] ?? lower;
}

/** Не перехватываем клавиши, пока пользователь печатает в поле ввода. */
export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}
