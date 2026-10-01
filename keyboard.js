// ==================== ЭКРАННАЯ КЛАВИАТУРА ====================
// Общий модуль для index.html (тренажёр) и, позже, key_settings.html (предпросмотр).
// Подключается обычным <script> (ES-модули не работают при открытии через file://),
// поэтому всё завёрнуто в IIFE: наружу видно только JmakKeyboard, а внутренние
// константы не конфликтуют с одноимёнными в script.js (обычные скрипты делят одну
// глобальную область видимости).
//
// Формат раскладки: { keys: [{ code, x, y, w, h }], width, height } — координаты и
// размеры в единицах клавиши (u). Клавиша задаётся KeyboardEvent.code, то есть
// физическим положением, а не символом: одна и та же клавиша печатает и латиницу,
// и кириллицу.
const JmakKeyboard = (function () {
  'use strict';

  // ---------- Символьные клавиши ----------
  // Для каждого ряда: коды клавиш и что они печатают в раскладках US и «Русская»
  // (Windows, ЙЦУКЕН) без Shift и с Shift. Длина строк равна длине codes.
  const CHAR_ROWS = [
    {
      codes: ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
      en: '`1234567890-=', enShift: '~!@#$%^&*()_+',
      ru: 'ё1234567890-=', ruShift: 'Ё!"№;%:?*()_+'
    },
    {
      codes: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
      en: 'qwertyuiop[]\\', enShift: 'QWERTYUIOP{}|',
      ru: 'йцукенгшщзхъ\\', ruShift: 'ЙЦУКЕНГШЩЗХЪ/'
    },
    {
      codes: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
      en: "asdfghjkl;'", enShift: 'ASDFGHJKL:"',
      ru: 'фывапролджэ', ruShift: 'ФЫВАПРОЛДЖЭ'
    },
    {
      codes: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
      en: 'zxcvbnm,./', enShift: 'ZXCVBNM<>?',
      ru: 'ячсмитьбю.', ruShift: 'ЯЧСМИТЬБЮ,'
    }
  ];

  // code → { en: [без Shift, с Shift], ru: [без Shift, с Shift] }
  const CHARS = new Map();
  // Поиск клавиши по символу: символ в нижнем регистре → code, отдельно для каждой раскладки
  const CHAR_TO_CODE = { en: new Map(), ru: new Map() };

  CHAR_ROWS.forEach(row => {
    row.codes.forEach((code, i) => {
      const en = [row.en[i], row.enShift[i]];
      const ru = [row.ru[i], row.ruShift[i]];
      CHARS.set(code, { en, ru });
      en.forEach(ch => CHAR_TO_CODE.en.set(ch.toLowerCase(), code));
      ru.forEach(ch => CHAR_TO_CODE.ru.set(ch.toLowerCase(), code));
    });
  });

  // ---------- Именованные клавиши ----------
  // code → короткая подпись на клавише
  const NAMED = new Map([
    ['Escape', 'Esc'],
    ['Backspace', 'Backspace'], ['Tab', 'Tab'], ['CapsLock', 'Caps'], ['Enter', 'Enter'],
    ['ShiftLeft', 'Shift'], ['ShiftRight', 'Shift'],
    ['ControlLeft', 'Ctrl'], ['ControlRight', 'Ctrl'],
    ['MetaLeft', 'Win'], ['MetaRight', 'Win'],
    ['AltLeft', 'Alt'], ['AltRight', 'Alt'],
    ['ContextMenu', 'Menu'], ['Space', ''],
    ['Insert', 'Ins'], ['Delete', 'Del'], ['Home', 'Home'], ['End', 'End'],
    ['PageUp', 'PgUp'], ['PageDown', 'PgDn'],
    ['ArrowUp', '↑'], ['ArrowDown', '↓'], ['ArrowLeft', '←'], ['ArrowRight', '→']
  ]);
  for (let i = 1; i <= 12; i++) NAMED.set('F' + i, 'F' + i);

  // Значения KeyboardEvent.key, которые не совпадают с code клавиши
  // (у остальных именованных клавиш — Escape, Tab, F1, ArrowUp… — key и code одинаковые)
  const KEY_TO_CODES = new Map([
    ['Shift', ['ShiftLeft', 'ShiftRight']],
    ['Control', ['ControlLeft', 'ControlRight']],
    ['Alt', ['AltLeft', 'AltRight']],
    ['Meta', ['MetaLeft', 'MetaRight']],
    [' ', ['Space']]
  ]);

  // Физические клавиши, которые печатают key (значение KeyboardEvent.key или символ задания).
  // preferredLayout — 'ru' или 'en': в какой раскладке искать символ в первую очередь.
  // Это важно только для " ; : ? / , . — в US и «Русской» они на разных клавишах.
  function codesFor(key, preferredLayout) {
    if (KEY_TO_CODES.has(key)) return KEY_TO_CODES.get(key).slice();
    if (NAMED.has(key)) return [key];
    if (typeof key !== 'string' || key.length !== 1) return [];
    const ch = key.toLowerCase();
    const first = preferredLayout === 'ru' ? 'ru' : 'en';
    const second = first === 'ru' ? 'en' : 'ru';
    const code = CHAR_TO_CODE[first].get(ch) || CHAR_TO_CODE[second].get(ch);
    return code ? [code] : [];
  }

  // Подпись именованной клавиши по значению KeyboardEvent.key — та же, что на экранной
  // клавиатуре: Control → Ctrl, Meta → Win, CapsLock → Caps, PageDown → PgDn, ArrowUp → ↑.
  // Для символов, пробела (на нём подписи нет) и неизвестных клавиш — null.
  function keyLabel(key) {
    const code = KEY_TO_CODES.has(key) ? KEY_TO_CODES.get(key)[0] : key;
    return NAMED.get(code) || null;
  }

  // ---------- Стандартная клавиатура (ANSI) ----------
  // Ширина клавиш, отличных от 1u
  const STD_WIDTHS = {
    Backspace: 2, Tab: 1.5, Backslash: 1.5, CapsLock: 1.75, Enter: 2.25,
    ShiftLeft: 2.25, ShiftRight: 2.75,
    ControlLeft: 1.25, MetaLeft: 1.25, AltLeft: 1.25, Space: 6.25,
    AltRight: 1.25, MetaRight: 1.25, ContextMenu: 1.25, ControlRight: 1.25
  };

  // Основной блок: 5 рядов, каждый ровно 15u
  const MAIN_ROWS = [
    CHAR_ROWS[0].codes.concat('Backspace'),
    ['Tab'].concat(CHAR_ROWS[1].codes),
    ['CapsLock'].concat(CHAR_ROWS[2].codes, 'Enter'),
    ['ShiftLeft'].concat(CHAR_ROWS[3].codes, 'ShiftRight'),
    ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight']
  ];

  // Ряд Esc + F1–F12 (тоже 15u). Число в ряду — промежуток такой ширины в u
  const F_ROW = ['Escape', 1, 'F1', 'F2', 'F3', 'F4', 0.5, 'F5', 'F6', 'F7', 'F8', 0.5, 'F9', 'F10', 'F11', 'F12'];

  // Раскладывает ряд в клавиши с координатами: строка — клавиша, число — промежуток
  function placeRow(keys, items, x, y) {
    items.forEach(item => {
      if (typeof item === 'number') {
        x += item;
        return;
      }
      const w = STD_WIDTHS[item] || 1;
      keys.push({ code: item, x, y, w, h: 1 });
      x += w;
    });
  }

  // fRow — ряд Esc + F1–F12 (с зазором 0.5u под ним),
  // nav — блок Insert…PageDown и стрелки справа (через 0.5u от основного блока)
  function buildStandardLayout(fRow, nav) {
    const keys = [];
    const top = fRow ? 1.5 : 0;
    if (fRow) placeRow(keys, F_ROW, 0, 0);
    MAIN_ROWS.forEach((row, i) => placeRow(keys, row, 0, top + i));
    if (nav) {
      const nx = 15.5;
      placeRow(keys, ['Insert', 'Home', 'PageUp'], nx, top);
      placeRow(keys, ['Delete', 'End', 'PageDown'], nx, top + 1);
      placeRow(keys, [1, 'ArrowUp'], nx, top + 3);
      placeRow(keys, ['ArrowLeft', 'ArrowDown', 'ArrowRight'], nx, top + 4);
    }
    return { keys, width: nav ? 18.5 : 15, height: top + 5 };
  }

  // config: { type, fRow, nav }. Пока есть только стандартная клавиатура;
  // сплит-раскладка (настройки с key_settings.html) добавится здесь же по type.
  function buildLayout(config) {
    const c = config || {};
    return buildStandardLayout(!!c.fRow, !!c.nav);
  }

  // ---------- Руки ----------
  // Какой рукой нажимается клавиша при слепой печати (ЙЦУКЕН и QWERTY — одни и те же
  // физические клавиши). Левый указательный — 4 5 К Е А П М И, правый — 6 7 Н Г Р О Т Ь.
  // Esc и F1–F4 — левая рука; всё остальное, кроме пробела, — правая.
  const LEFT_HAND = new Set([
    'Escape', 'F1', 'F2', 'F3', 'F4',
    'Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
    'Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT',
    'CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG',
    'ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB',
    'ControlLeft', 'MetaLeft', 'AltLeft'
  ]);

  // 'left' | 'right'; пробел (большие пальцы любой руки) — null.
  // В сплит-раскладке руку будет задавать половина клавиатуры.
  function handOf(code) {
    if (code === 'Space') return null;
    return LEFT_HAND.has(code) ? 'left' : 'right';
  }

  // ---------- Отрисовка ----------
  const isLetter = ch => ch.toLowerCase() !== ch.toUpperCase();

  // Подписи клавиши для режима 'ru' | 'en' | 'all':
  // main — основная, shift — мелко в углу (у цифр и знаков), alt — кириллица в режиме «Все»
  function labelsFor(code, mode) {
    if (NAMED.has(code)) return { main: NAMED.get(code), named: true };
    const chars = CHARS.get(code);
    if (!chars) return { main: '' };
    const [base, shifted] = mode === 'ru' ? chars.ru : chars.en;
    const labels = isLetter(base) ? { main: base.toUpperCase() } : { main: base, shift: shifted };
    if (mode === 'all' && isLetter(chars.ru[0])) labels.alt = chars.ru[0].toUpperCase();
    return labels;
  }

  function span(cls, text) {
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    return el;
  }

  // Рисует раскладку в container. Возвращает Map: code → [элементы клавиши]
  // (массив — в сплит-раскладке одна клавиша может оказаться на обеих половинах).
  function render(container, layout, labelMode) {
    container.textContent = '';
    container.style.setProperty('--kb-cols', String(layout.width));
    container.style.setProperty('--kb-rows', String(layout.height));
    const map = new Map();
    layout.keys.forEach(k => {
      const el = document.createElement('div');
      el.className = 'kb-key';
      el.dataset.code = k.code;
      el.style.setProperty('--x', String(k.x));
      el.style.setProperty('--y', String(k.y));
      el.style.setProperty('--w', String(k.w));
      el.style.setProperty('--h', String(k.h));

      const labels = labelsFor(k.code, labelMode);
      if (labels.named) el.classList.add('kb-named');
      if (labels.shift) el.appendChild(span('kb-shift', labels.shift));
      el.appendChild(span('kb-main', labels.main));
      if (labels.alt) el.appendChild(span('kb-alt', labels.alt));
      // Засечки для слепой печати (F/J — они же А/О)
      if (k.code === 'KeyF' || k.code === 'KeyJ') el.classList.add('kb-bump');
      // Зона руки; видна, только когда у контейнера есть класс kb-hands
      const hand = handOf(k.code);
      if (hand) el.classList.add('kb-hand-' + hand);

      container.appendChild(el);
      if (!map.has(k.code)) map.set(k.code, []);
      map.get(k.code).push(el);
    });
    return map;
  }

  // Включает или выключает класс на клавишах; коды, которых нет на клавиатуре, пропускаются
  function toggle(map, codes, cls, on) {
    codes.forEach(code => {
      const els = map.get(code);
      if (els) els.forEach(el => el.classList.toggle(cls, on));
    });
  }

  return { buildLayout, render, codesFor, keyLabel, toggle };
})();
