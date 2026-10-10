// ==================== ЭКРАННАЯ КЛАВИАТУРА ====================
// Общий модуль для index.html (тренажёр) и, позже, key_settings.html (предпросмотр).
// Подключается обычным <script> (ES-модули не работают при открытии через file://),
// поэтому всё завёрнуто в IIFE: наружу видно только JmakKeyboard, а внутренние
// константы не конфликтуют с одноимёнными в script.js (обычные скрипты делят одну
// глобальную область видимости).
//
// Модель клавиатуры — три независимые части:
//  • форма (layout): { keys: [{ pos, x, y, w, h, hand, finger, bump, defaultCode }],
//    width, height } — где клавиша на схеме; pos — её идентификатор, координаты и
//    размеры в единицах клавиши (u), hand/finger — какой рукой и пальцем её нажимать,
//    defaultCode — что она отправляет по умолчанию (до «запоминания» своей раскладки);
//  • раскладка (keymap): { layers: [{ name, keys: { [pos]: { code, shift } } }] } —
//    что позиция отправляет на каждом слое: KeyboardEvent.code и нужен ли Shift.
//    Нет записи на слое — клавиша как на основном (прозрачная);
//  • подписи — выводятся из кода по таблицам раскладок US и «Русская», поэтому одна
//    и та же позиция показывает и латиницу, и кириллицу.
// У стандартной клавиатуры позиция и есть code, слой один. Сплит-клавиатура задаст
// свою форму и раскладку, а тренажёр работает с обеими через createModel одинаково.
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
  // Поиск клавиши по символу: символ в нижнем регистре → { code, shift } отдельно для
  // каждой раскладки; shift — набирается ли символ с Shift («!» — да, «1» — нет).
  // Для букв запоминается вариант без Shift (регистр не учитывается).
  const CHAR_TO_CODE = { en: new Map(), ru: new Map() };

  CHAR_ROWS.forEach(row => {
    row.codes.forEach((code, i) => {
      const en = [row.en[i], row.enShift[i]];
      const ru = [row.ru[i], row.ruShift[i]];
      CHARS.set(code, { en, ru });
      const add = (map, ch, shift) => {
        const lower = ch.toLowerCase();
        if (!map.has(lower)) map.set(lower, { code, shift });
      };
      en.forEach((ch, s) => add(CHAR_TO_CODE.en, ch, s === 1));
      ru.forEach((ch, s) => add(CHAR_TO_CODE.ru, ch, s === 1));
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

  // Подписи для узких клавиш (1u): на сплите Backspace и пробел — обычные клавиши
  const NARROW_NAMED = { Backspace: 'Bksp', Space: 'Space' };

  // Значения KeyboardEvent.key, которые не совпадают с code клавиши
  // (у остальных именованных клавиш — Escape, Tab, F1, ArrowUp… — key и code одинаковые)
  const KEY_TO_CODES = new Map([
    ['Shift', ['ShiftLeft', 'ShiftRight']],
    ['Control', ['ControlLeft', 'ControlRight']],
    ['Alt', ['AltLeft', 'AltRight']],
    ['Meta', ['MetaLeft', 'MetaRight']],
    [' ', ['Space']]
  ]);

  // Какие коды дают key (значение KeyboardEvent.key или символ задания):
  // [{ code, shift }], shift: true/false — нужен ли Shift, null — неважно (именованные).
  // preferredLayout — 'ru' или 'en': в какой раскладке искать символ в первую очередь.
  // Это важно только для " ; : ? / , . — в US и «Русской» они на разных клавишах.
  function targetsFor(key, preferredLayout) {
    if (KEY_TO_CODES.has(key)) return KEY_TO_CODES.get(key).map(code => ({ code, shift: null }));
    if (NAMED.has(key)) return [{ code: key, shift: null }];
    if (typeof key !== 'string' || key.length !== 1) return [];
    const ch = key.toLowerCase();
    const first = preferredLayout === 'ru' ? 'ru' : 'en';
    const second = first === 'ru' ? 'en' : 'ru';
    const target = CHAR_TO_CODE[first].get(ch) || CHAR_TO_CODE[second].get(ch);
    return target ? [target] : [];
  }

  // Подпись именованной клавиши по значению KeyboardEvent.key — та же, что на экранной
  // клавиатуре: Control → Ctrl, Meta → Win, CapsLock → Caps, PageDown → PgDn, ArrowUp → ↑.
  // Для символов, пробела (на нём подписи нет) и неизвестных клавиш — null.
  function keyLabel(key) {
    const code = KEY_TO_CODES.has(key) ? KEY_TO_CODES.get(key)[0] : key;
    return NAMED.get(code) || null;
  }

  // ---------- Руки и пальцы ----------
  // Каким пальцем нажимается клавиша стандартной клавиатуры при слепой печати (ЙЦУКЕН
  // и QWERTY — одни и те же физические клавиши). Левый указательный — 4 5 К Е А П М И,
  // правый — 6 7 Н Г Р О Т Ь. Для F-ряда строгой схемы нет — палец по ближайшему столбцу;
  // блок навигации — указательный на Ins/Del/←, средний на Home/End/↑↓, безымянный
  // на PgUp/PgDn/→.
  const FINGER_ZONES = {
    'left-pinky': ['Escape', 'Backquote', 'Digit1', 'Tab', 'KeyQ', 'CapsLock', 'KeyA',
      'ShiftLeft', 'KeyZ', 'ControlLeft', 'MetaLeft'],
    'left-ring': ['F1', 'Digit2', 'KeyW', 'KeyS', 'KeyX'],
    'left-middle': ['F2', 'Digit3', 'KeyE', 'KeyD', 'KeyC'],
    'left-index': ['F3', 'F4', 'Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB'],
    'left-thumb': ['AltLeft'],
    'thumb': ['Space'], // большие пальцы любой руки
    'right-thumb': ['AltRight'],
    'right-index': ['F5', 'F6', 'Digit6', 'Digit7', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM',
      'Insert', 'Delete', 'ArrowLeft'],
    'right-middle': ['F7', 'Digit8', 'KeyI', 'KeyK', 'Comma', 'Home', 'End', 'ArrowUp', 'ArrowDown'],
    'right-ring': ['F8', 'Digit9', 'KeyO', 'KeyL', 'Period', 'PageUp', 'PageDown', 'ArrowRight'],
    'right-pinky': ['F9', 'F10', 'F11', 'F12', 'Digit0', 'Minus', 'Equal', 'Backspace',
      'KeyP', 'BracketLeft', 'BracketRight', 'Backslash', 'Semicolon', 'Quote', 'Enter',
      'Slash', 'ShiftRight', 'MetaRight', 'ContextMenu', 'ControlRight']
  };

  // code → { hand: 'left' | 'right' | null, finger: 'left-index' | … | 'thumb' }.
  // Большие пальцы раскрашиваются одним цветом, но Alt относится к своей руке
  // (для режима «половины»), а у пробела руки нет.
  const ZONES = new Map();
  Object.keys(FINGER_ZONES).forEach(zone => {
    const hand = zone.startsWith('left') ? 'left' : zone.startsWith('right') ? 'right' : null;
    const finger = zone.endsWith('thumb') ? 'thumb' : zone;
    FINGER_ZONES[zone].forEach(code => ZONES.set(code, { hand, finger }));
  });

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

  // Раскладывает ряд в клавиши с координатами: строка — клавиша (её позиция — это code),
  // число — промежуток
  function placeRow(keys, items, x, y) {
    items.forEach(item => {
      if (typeof item === 'number') {
        x += item;
        return;
      }
      const w = STD_WIDTHS[item] || 1;
      keys.push({ pos: item, x, y, w, h: 1, defaultCode: item });
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
    keys.forEach(k => {
      const zone = ZONES.get(k.pos);
      if (zone) {
        k.hand = zone.hand;
        k.finger = zone.finger;
      }
      // Засечки для слепой печати (F/J — они же А/О)
      if (k.pos === 'KeyF' || k.pos === 'KeyJ') k.bump = true;
    });
    return { keys, width: nav ? 18.5 : 15, height: top + 5 };
  }

  // ---------- Сплит-клавиатура ----------
  // Смещение столбцов вниз (в u) для пяти основных столбцов половины, от внешнего края:
  // мизинец, безымянный, средний, указательный, второй указательный (внутренний)
  const STAGGER = {
    none: [0, 0, 0, 0, 0],
    moderate: [0.25, 0.125, 0, 0.125, 0.25],
    strong: [0.5, 0.25, 0, 0.25, 0.375]
  };

  // Основные столбцы половины от внешнего края к внутреннему: роль (входит в pos),
  // палец и номер смещения в STAGGER
  const CORE_COLUMNS = [
    { role: 'pinky', finger: 'pinky', s: 0 },
    { role: 'ring', finger: 'ring', s: 1 },
    { role: 'middle', finger: 'middle', s: 2 },
    { role: 'index', finger: 'index', s: 3 },
    { role: 'index2', finger: 'index', s: 4 }
  ];

  // 5 столбцов — только буквенный блок, 6 — плюс внешний (Tab/Shift), 7 — плюс внутренний
  function splitColumns(cols) {
    const list = CORE_COLUMNS.slice();
    if (cols >= 6) list.unshift({ role: 'outer', finger: 'pinky', s: 0 });
    if (cols >= 7) list.push({ role: 'inner', finger: 'index', s: 4 });
    return list;
  }

  // Что клавиши сплита отправляют по умолчанию — как на обычной QWERTY: буквенный блок
  // на своих местах, во внешнем столбце соседи с обычной клавиатуры. Внутренний столбец
  // и лишние клавиши под большой палец пустые — их задаст «запоминание» раскладки.
  // thumb — от внутренней клавиши к внешней.
  const SPLIT_DEFAULTS = {
    left: {
      num: { outer: 'Backquote', pinky: 'Digit1', ring: 'Digit2', middle: 'Digit3', index: 'Digit4', index2: 'Digit5' },
      top: { outer: 'Tab', pinky: 'KeyQ', ring: 'KeyW', middle: 'KeyE', index: 'KeyR', index2: 'KeyT' },
      home: { outer: 'CapsLock', pinky: 'KeyA', ring: 'KeyS', middle: 'KeyD', index: 'KeyF', index2: 'KeyG' },
      bot: { outer: 'ShiftLeft', pinky: 'KeyZ', ring: 'KeyX', middle: 'KeyC', index: 'KeyV', index2: 'KeyB' },
      thumb: ['Space', 'AltLeft', 'MetaLeft']
    },
    right: {
      num: { outer: 'Minus', pinky: 'Digit0', ring: 'Digit9', middle: 'Digit8', index: 'Digit7', index2: 'Digit6' },
      top: { outer: 'BracketLeft', pinky: 'KeyP', ring: 'KeyO', middle: 'KeyI', index: 'KeyU', index2: 'KeyY' },
      home: { outer: 'Quote', pinky: 'Semicolon', ring: 'KeyL', middle: 'KeyK', index: 'KeyJ', index2: 'KeyH' },
      bot: { outer: 'ShiftRight', pinky: 'Slash', ring: 'Period', middle: 'Comma', index: 'KeyM', index2: 'KeyN' },
      thumb: ['Enter', 'Backspace', 'AltRight']
    }
  };

  // Половина в «своих» координатах: x растёт от внешнего края к внутреннему.
  // half: { cols: 5–7, rows: 3–4 (4 — с рядом цифр), thumbs: 0–6 }
  function buildHalf(side, half, stagger) {
    const cols = splitColumns(half.cols);
    const rows = half.rows >= 4 ? ['num', 'top', 'home', 'bot'] : ['top', 'home', 'bot'];
    const offsets = STAGGER[stagger] || STAGGER.none;
    const defaults = SPLIT_DEFAULTS[side];
    const prefix = side === 'left' ? 'L' : 'R';
    const keys = [];

    cols.forEach((col, x) => {
      rows.forEach((row, y) => {
        keys.push({
          pos: `${prefix}-${row}-${col.role}`,
          x, y: y + offsets[col.s], w: 1, h: 1,
          row,
          hand: side,
          finger: side + '-' + col.finger,
          bump: row === 'home' && col.role === 'index', // засечки на F/J (А/О)
          defaultCode: defaults[row][col.role] || null
        });
      });
    });

    // Клавиши под большой палец — ряд под внутренними столбцами, сдвинутый на полклавиши
    // внутрь (так у большинства сплитов). i = 0 — самая внутренняя клавиша.
    const n = cols.length;
    const under = cols.slice(Math.max(0, n - half.thumbs));
    const thumbY = rows.length + 0.25 + Math.max(0, ...under.map(c => offsets[c.s]));
    for (let i = 0; i < half.thumbs; i++) {
      keys.push({
        pos: `${prefix}-thumb-${i}`,
        x: n - 0.5 - i, y: thumbY, w: 1, h: 1,
        row: 'thumb',
        hand: side,
        finger: 'thumb',
        defaultCode: defaults.thumb[i] || null
      });
    }

    // Если клавиш под палец больше, чем столбцов, ряд вылезает за внешний край — сдвигаем
    const minX = Math.min(...keys.map(k => k.x));
    if (minX < 0) keys.forEach(k => { k.x -= minX; });
    const width = Math.max(...keys.map(k => k.x + k.w));
    const height = Math.max(...keys.map(k => k.y + k.h));
    return { keys, width, height };
  }

  const SPLIT_GAP = 1; // промежуток между половинами, u

  // split: { stagger, left: { cols, rows, thumbs }, right: { … } } (см. normalizeConfig)
  function buildSplitLayout(split) {
    const left = buildHalf('left', split.left, split.stagger);
    const right = buildHalf('right', split.right, split.stagger);
    // Правая половина — зеркально: её внешний край справа
    const x0 = left.width + SPLIT_GAP;
    right.keys.forEach(k => { k.x = x0 + right.width - k.x - k.w; });
    return {
      keys: left.keys.concat(right.keys),
      width: x0 + right.width,
      height: Math.max(left.height, right.height)
    };
  }

  // Порядок обхода клавиш сплита при «запоминании» раскладки: левая половина по рядам
  // слева направо, затем правая, затем клавиши под большой палец — левые, правые
  const ROW_ORDER = ['num', 'top', 'home', 'bot', 'thumb'];
  function learningOrder(layout) {
    const group = k => (k.row === 'thumb' ? 2 : 0) + (k.hand === 'right' ? 1 : 0);
    return layout.keys.slice()
      .sort((a, b) => group(a) - group(b) ||
        ROW_ORDER.indexOf(a.row) - ROW_ORDER.indexOf(b.row) || a.x - b.x)
      .map(k => k.pos);
  }

  // config: { type: 'standard', fRow, nav } или { type: 'split', split }
  function buildLayout(config) {
    const c = config || {};
    if (c.type === 'split') return buildSplitLayout(c.split);
    return buildStandardLayout(!!c.fRow, !!c.nav);
  }

  // ---------- Настройки вида клавиатуры (страница key_settings.html) ----------
  // localStorage 'jmak-keyboard':
  //   { type: 'standard' | 'split',
  //     split: { same, stagger: 'none' | 'moderate' | 'strong',
  //              left: { cols, rows, thumbs }, right: { cols, rows, thumbs } },
  //     keymap: null | { layers: [{ name, keys: { [pos]: запись } }] },
  //     separateSymbols }
  // same — половины одинаковые (правая повторяет левую). name слоя — своё название;
  // пустая строка — стандартное («Слой 1» на текущем языке, см. layerName).
  // separateSymbols — цифры и спецсимволы на разных клавишах: Shift + цифра не даёт символ
  // (см. createModel).
  // keymap — записанная раскладка сплита («запоминание»): на основном слое это поправки
  // к раскладке по умолчанию (незаписанные позиции остаются как на QWERTY), на остальных
  // слоях — их содержимое (нет записи — клавиша как на основном). Запись:
  //   { code, shift, key } — клавиша отправляет code (с Shift или без), key — что пришло
  //   в KeyboardEvent.key при записи; { empty: true } — клавиша ничего не отправляет
  //   (на слое — ничем не занята, а не «как на основном»); { layer: n } — клавиша
  //   включает слой n, вместе с code — tap-hold: при нажатии символ, при удержании слой.
  const CONFIG_KEY = 'jmak-keyboard';
  const MAX_LAYERS = 6; // основной + 5

  function normalizeEntry(e) {
    if (!e || typeof e !== 'object') return null;
    const out = {};
    if (typeof e.code === 'string' && /^[A-Za-z0-9]{1,24}$/.test(e.code)) {
      out.code = e.code;
      out.shift = e.shift === true;
      if (typeof e.key === 'string' && e.key.length <= 24) out.key = e.key;
    }
    if (Number.isInteger(e.layer) && e.layer >= 1 && e.layer < MAX_LAYERS) out.layer = e.layer;
    if (!out.code && !out.layer) return e.empty === true ? { empty: true } : null;
    return out;
  }

  function normalizeKeymap(km) {
    if (!km || typeof km !== 'object' || !Array.isArray(km.layers) || km.layers.length === 0) return null;
    return {
      layers: km.layers.slice(0, MAX_LAYERS).map((l, i) => {
        const src = l && l.keys && typeof l.keys === 'object' ? l.keys : {};
        const keys = {};
        Object.keys(src).forEach(pos => {
          if (!/^[LR]-[a-z]+-[a-z0-9]+$/.test(pos)) return;
          const e = normalizeEntry(src[pos]);
          if (e) keys[pos] = e;
        });
        const name = l && typeof l.name === 'string' ? l.name.slice(0, 20) : '';
        return { name: isDefaultLayerName(name, i) ? '' : name, keys };
      })
    };
  }

  // Стандартное название слоя — на текущем языке интерфейса
  function layerName(i) {
    return i === 0 ? JmakI18n.t('keyboard.baseLayer') : JmakI18n.t('keyboard.layer', { n: i });
  }

  // Стандартное название не храним (пустая строка): оно показывается на текущем языке.
  // Узнаём его на любом языке — так переводятся и старые сохранения, где стандартное
  // название записано по-русски («Слой 1»)
  function isDefaultLayerName(name, i) {
    const variants = i === 0
      ? JmakI18n.variants('keyboard.baseLayer')
      : JmakI18n.variants('keyboard.layer', { n: i });
    return variants.includes(name);
  }

  const clampInt = (v, min, max, fallback) =>
    Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

  function normalizeHalf(h) {
    const d = h && typeof h === 'object' ? h : {};
    return {
      cols: clampInt(d.cols, 5, 7, 6),
      rows: clampInt(d.rows, 3, 4, 3),
      thumbs: clampInt(d.thumbs, 0, 6, 3)
    };
  }

  // Приводит любые данные (повреждённые, старые, отсутствующие) к корректным настройкам
  function normalizeConfig(data) {
    const d = data && typeof data === 'object' ? data : {};
    const s = d.split && typeof d.split === 'object' ? d.split : {};
    const same = typeof s.same === 'boolean' ? s.same : true;
    const left = normalizeHalf(s.left);
    return {
      type: d.type === 'split' ? 'split' : 'standard',
      split: {
        same,
        stagger: Object.prototype.hasOwnProperty.call(STAGGER, s.stagger) ? s.stagger : 'moderate',
        left,
        right: same ? Object.assign({}, left) : normalizeHalf(s.right)
      },
      keymap: normalizeKeymap(d.keymap),
      separateSymbols: d.separateSymbols === true
    };
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return normalizeConfig(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return normalizeConfig(null); // localStorage недоступен или повреждённый JSON
    }
  }

  function saveConfig(config) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(normalizeConfig(config)));
      return true;
    } catch (e) {
      return false; // localStorage недоступен — настройки не сохранятся
    }
  }

  // Можно ли сохранять данные. Браузер может запретить сайту хранилище (тогда обращение
  // к localStorage бросает исключение), или оно переполнено. Проверяем пробной записью:
  // чтение может работать, а запись — нет
  function storageAvailable() {
    const key = 'jmak-storage-test';
    try {
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- Раскладка и модель ----------
  // Раскладка для формы: по умолчанию каждая позиция отправляет свой defaultCode
  // (у стандартной клавиатуры — свой же код), поверх — записанная раскладка recorded
  // (keymap из настроек, см. выше): поправки основного слоя и остальные слои.
  // Пустые позиции основного слоя и позиции, которых нет в форме, в раскладку не
  // попадают. На остальных слоях запись { empty: true } остаётся: она перекрывает
  // клавишу основного слоя — на этом слое клавиша ничем не занята.
  function buildKeymap(layout, recorded) {
    const present = new Set(layout.keys.map(k => k.pos));
    const recLayers = recorded && recorded.layers ? recorded.layers : [];
    const rec0 = recLayers[0] ? recLayers[0].keys : {};
    const base = {};
    layout.keys.forEach(k => {
      const r = rec0[k.pos];
      if (r) {
        if (!r.empty) base[k.pos] = r;
      } else if (k.defaultCode) {
        base[k.pos] = { code: k.defaultCode, shift: false };
      }
    });
    const layers = [{ name: layerName(0), keys: base }];
    recLayers.slice(1).forEach((l, i) => {
      const keys = {};
      Object.keys(l.keys).forEach(pos => { if (present.has(pos)) keys[pos] = l.keys[pos]; });
      layers.push({ name: l.name || layerName(i + 1), keys });
    });
    return { layers };
  }

  // Раскладка по умолчанию, без записанной
  function defaultKeymap(layout) {
    return buildKeymap(layout, null);
  }

  // Модель клавиатуры: форма + раскладка + обратные индексы для поиска позиций по слоям.
  // options.separateSymbols — цифры и спецсимволы на разных клавишах (сплит): символ
  // с Shift («)») не считается клавишей цифры («0») + Shift, а ищется только там, где
  // клавиша сама его отправляет; на клавишах цифр нет угловых Shift-символов.
  function createModel(layout, keymap, options) {
    const separateSymbols = !!(options && options.separateSymbols);
    const layers = keymap.layers;
    const base = layers[0].keys;
    // Для каждого слоя: code → [{ pos, shift }] — где этот код отправляется на этом слое.
    // Клавиша, которой нет на слое, работает как на основном (прозрачная)
    const byCode = layers.map((layer, index) => {
      const map = new Map();
      layout.keys.forEach(k => {
        const out = layer.keys[k.pos] || (index > 0 ? base[k.pos] : undefined);
        if (!out || !out.code) return;
        if (!map.has(out.code)) map.set(out.code, []);
        map.get(out.code).push({ pos: k.pos, shift: !!out.shift });
      });
      return map;
    });

    // Позиции на слое layer, где символ (или именованная клавиша) получается ровно так —
    // с Shift или без. exactOnly = false: если таких нет, любые позиции с тем же кодом —
    // на обычной клавиатуре «!» — это клавиша «1», а Shift жмут отдельно.
    function find(layer, symbol, preferredLayout, exactOnly) {
      const index = byCode[layer];
      if (!index) return [];
      const result = [];
      targetsFor(symbol, preferredLayout).forEach(t => {
        const entries = index.get(t.code) || [];
        const exact = t.shift === null ? entries : entries.filter(e => e.shift === t.shift);
        (exact.length || exactOnly ? exact : entries).forEach(e => result.push(e.pos));
      });
      return result;
    }

    // Позиции на слое layer, на которых набирается символ
    function positionsOn(layer, symbol, preferredLayout) {
      return find(layer, symbol, preferredLayout, separateSymbols);
    }

    // Где набирается символ: { layer, positions } — на основном слое, если он там есть,
    // иначе на первом слое, где есть. Сначала ищем клавишу, которая даёт символ ровно так
    // (например, «)» на слое символов), и только потом — «клавиша цифры + Shift».
    // null — символа нет на клавиатуре
    function locate(symbol, preferredLayout) {
      const passes = separateSymbols ? [true] : [true, false];
      for (const exactOnly of passes) {
        for (let layer = 0; layer < byCode.length; layer++) {
          const positions = find(layer, symbol, preferredLayout, exactOnly);
          if (positions.length) return { layer, positions };
        }
      }
      return null;
    }

    // Позиция, которая отправляет code (с Shift или без), — чтобы подсветить нажатую
    // клавишу. Ищем сначала на слое preferLayer (показанном), потом на основном и
    // остальных; сначала точное совпадение по Shift, потом (если цифры и символы не
    // разделены) любое. null — такой клавиши на схеме нет (например, цифровой блок).
    function positionOf(code, shift, preferLayer) {
      const order = [preferLayer || 0].concat(byCode.map((_, i) => i));
      const passes = separateSymbols ? [true] : [true, false];
      for (const exactOnly of passes) {
        for (const layer of order) {
          const entries = byCode[layer] && byCode[layer].get(code);
          if (!entries) continue;
          const match = exactOnly ? entries.find(e => e.shift === !!shift) : entries[0];
          if (match) return match.pos;
        }
      }
      return null;
    }

    // Клавиши основного слоя, которые включают слой n
    function layerSwitches(n) {
      return Object.keys(base).filter(pos => base[pos].layer === n);
    }

    return {
      layout, keymap, separateSymbols, layerCount: layers.length,
      positionsOn, locate, positionOf, layerSwitches
    };
  }

  // ---------- Отрисовка ----------
  const isLetter = ch => ch.toLowerCase() !== ch.toUpperCase();

  // Подписи клавиши, которая отправляет code, для режима 'ru' | 'en' | 'all':
  // main — основная, shift — мелко в углу (у цифр и знаков), alt — кириллица в режиме «Все».
  // shift: клавиша сама отправляет символ с Shift (так бывает в раскладке сплита) —
  // тогда этот символ и есть основная подпись.
  function labelsFor(code, mode, shift) {
    if (NAMED.has(code)) return { main: NAMED.get(code), named: true };
    const chars = CHARS.get(code);
    if (!chars) return { main: '' };
    const [base, shifted] = mode === 'ru' ? chars.ru : chars.en;
    let labels;
    if (shift) labels = { main: shifted };
    else labels = isLetter(base) ? { main: base.toUpperCase() } : { main: base, shift: shifted };
    if (mode === 'all' && isLetter(chars.ru[0])) labels.alt = chars.ru[0].toUpperCase();
    return labels;
  }

  function span(cls, text) {
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    return el;
  }

  // Рисует модель в container. options.layer — какой слой показать (по умолчанию
  // основной): клавиши, которых на этом слое нет, показываются с подписью основного слоя,
  // но бледно (прозрачные). Клавиша слоя подписана «L1», «L2»…; у tap-hold клавиши
  // (символ + слой) номер слоя мелко в левом нижнем углу. На основном слое в углах
  // клавиш мелко видно, что на них на слоях 1 и 2.
  // Возвращает Map: pos → [элементы клавиши] (массив — на случай, если позиция
  // нарисована дважды).
  function render(container, model, labelMode, options) {
    const layout = model.layout;
    const layers = model.keymap.layers;
    const layerIndex = options && layers[options.layer] ? options.layer : 0;
    const base = layers[0].keys;
    const shown = layers[layerIndex].keys;
    container.textContent = '';
    container.style.setProperty('--kb-cols', String(layout.width));
    container.style.setProperty('--kb-rows', String(layout.height));
    const map = new Map();
    layout.keys.forEach(k => {
      const el = document.createElement('div');
      el.className = 'kb-key';
      el.dataset.pos = k.pos;
      el.style.setProperty('--x', String(k.x));
      el.style.setProperty('--y', String(k.y));
      el.style.setProperty('--w', String(k.w));
      el.style.setProperty('--h', String(k.h));

      let out = shown[k.pos];
      if (!out && layerIndex > 0 && base[k.pos]) {
        out = base[k.pos];
        el.classList.add('kb-transparent');
      }
      // Позиции ничего не назначено, или на этом слое она ничем не занята
      const empty = !out || out.empty;
      if (empty) el.classList.add('kb-empty');
      if (out && out.code) el.dataset.code = out.code;

      let labels;
      if (empty) labels = { main: '' };
      else if (!out.code) labels = { main: 'L' + out.layer, named: true }; // только переключатель слоя
      else labels = labelsFor(out.code, labelMode, out.shift);
      // На узкой клавише (у сплита все клавиши 1u) длинная подпись не помещается,
      // а пустой пробел не отличить от неназначенной клавиши
      if (labels.named && out && out.code && k.w < 1.5 && NARROW_NAMED[out.code]) labels.main = NARROW_NAMED[out.code];
      if (labels.named) el.classList.add('kb-named');
      if (out && out.layer) {
        el.classList.add(out.code ? 'kb-layer-hold' : 'kb-layer-only');
        el.classList.add('kb-lc-' + out.layer); // цвет своего слоя
      }
      // Угловой Shift-символ («(» над «9») — только если Shift + эта клавиша его даёт
      if (labels.shift && !model.separateSymbols) el.appendChild(span('kb-shift', labels.shift));
      el.appendChild(span('kb-main', labels.main));
      if (labels.alt) el.appendChild(span('kb-alt', labels.alt));
      const badge = out && out.code && out.layer;
      if (badge) el.appendChild(span('kb-layer-badge', 'L' + out.layer));

      // На основном слое — мелкие подписи той же клавиши на слоях 1 (справа вверху)
      // и 2 (слева внизу, если там нет номера слоя tap-hold клавиши), цветом слоя
      if (layerIndex === 0) {
        [1, 2].forEach(n => {
          const own = layers[n] && layers[n].keys[k.pos];
          if (!own || !own.code || (n === 2 && badge)) return;
          const text = labelsFor(own.code, labelMode, own.shift).main;
          if (text && text.length <= 3) el.appendChild(span('kb-legend kb-legend-' + n, text));
        });
      }
      if (k.bump) el.classList.add('kb-bump');
      // Зоны руки и пальца (kb-hand-left, kb-hand-left-index, kb-hand-thumb…). Видны,
      // только когда у контейнера есть класс режима kb-hands-halves / kb-hands-fingers.
      if (k.hand) el.classList.add('kb-hand-' + k.hand);
      if (k.finger) el.classList.add('kb-hand-' + k.finger);

      container.appendChild(el);
      if (!map.has(k.pos)) map.set(k.pos, []);
      map.get(k.pos).push(el);
    });
    return map;
  }

  // Включает или выключает класс на клавишах; позиции, которых нет на схеме, пропускаются
  function toggle(map, positions, cls, on) {
    positions.forEach(pos => {
      const els = map.get(pos);
      if (els) els.forEach(el => el.classList.toggle(cls, on));
    });
  }

  return {
    buildLayout, learningOrder, buildKeymap, defaultKeymap, createModel, render, keyLabel, toggle,
    CONFIG_KEY, MAX_LAYERS, layerName, loadConfig, saveConfig, normalizeConfig, storageAvailable
  };
})();
