// ==================== СОСТОЯНИЕ ====================
let state = 'IDLE'; // IDLE | COUNTDOWN | TASK | FINISHED
let appliedSettings = {
  letters: true,
  letterSet: 'ru',
  special: false,
  digits: false,
  fkeys: false,
  control: false,
  fullSet: false, // «Весь набор»: все символы выбранных наборов вместо «Количества циклов»
  showSequence: false,
  blind: false,  // «Скрыть подписи клавиш»
  hands: 'off', // зоны рук на клавиатуре: 'off' | 'halves' | 'fingers'
  hint: 'never', // «Подсказка, где нажимать»: 'never' | 'delay' (через 2 с) | 'instant'
  cycles: 5,
  repeats: 1
};
let runSettings = appliedSettings; // снимок настроек на время текущего задания
let currentStartKey = ' ';
let countdownInterval = null;
const COUNTDOWN_SECONDS = 3; // отсчёт перед началом задания
let countdownValue = COUNTDOWN_SECONDS;
let nextTimeout = null;
let promptTimeout = null;
let inputLocked = false;
let sequence = [];
let currentIndex = 0;
let currentSymbol = '';
let startTime = 0;
let taskEvents = [];
// Экранная клавиатура: вид (стандартная или сплит, страница «Вид клавиатуры»),
// модель (форма + раскладка, см. keyboard.js), позиция → [элементы клавиш]
// последней отрисовки и текущая вспышка
let kbConfig = JmakKeyboard.loadConfig();
let kbModel = null;
let shownLayer = 0; // показанный слой сплита (0 — основной)
let keyMap = new Map();
let flash = { positions: [], cls: '', timer: null };
const ADVANCE_DELAY_MS = 200; // пауза после верного нажатия = длительность зелёной вспышки
const WRONG_FLASH_MS = 350;   // длительность красной вспышки
// «Подсказка, где нажимать»: целевая клавиша подсвечивается сразу или если пользователь
// не нажал её за HINT_DELAY_MS
const HINT_DELAY_MS = 2000;
let hintTimeout = null;
let hintPositions = [];
// «Повторить ошибки»: символы следующего задания (null — обычное задание по настройкам)
let pendingSymbols = null;
const RETRY_ROUNDS = 3; // сколько раз каждая клавиша с ошибкой встречается при повторе

// ==================== DOM ====================
const statusTextEl = document.getElementById('statusText');
const statusKeyEl = document.getElementById('statusKey');
const keyboardEl = document.getElementById('keyboard');
const layerTabsEl = document.getElementById('layerTabs');
const pressTimeEl = document.getElementById('pressTime');
const progressEl = document.getElementById('progress');
const resultsEl = document.getElementById('results');
const jmyakPanel = document.getElementById('jmyakPanel');

const letterSetSelect = document.getElementById('letterSet');
const cbSpecial = document.getElementById('cbSpecial');
const cbDigits = document.getElementById('cbDigits');
const cbFkeys = document.getElementById('cbFkeys');
const cbControl = document.getElementById('cbControl');
const cbFullSet = document.getElementById('cbFullSet');
const cbShowSeq = document.getElementById('cbShowSeq');
const cbBlind = document.getElementById('cbBlind');
const handsSelect = document.getElementById('handsMode');
const hintSelect = document.getElementById('hintMode');
const cyclesSlider = document.getElementById('cycles');
const cyclesVal = document.getElementById('cyclesVal');
const repeatsSlider = document.getElementById('repeats');
const repeatsVal = document.getElementById('repeatsVal');
const applyBtn = document.getElementById('applyBtn');
const abortBtn = document.getElementById('abortBtn');
const themeToggle = document.getElementById('themeToggle');
const langSelect = document.getElementById('langSelect');

// Строка интерфейса на выбранном языке (js/i18n.js, переводы — в папке localization)
const t = JmakI18n.t;

// ==================== ТЕМА ====================
// Инлайн-скрипт в <head> уже применил сохранённую тему до отрисовки страницы
// (устраняет мигание тёмной темой по умолчанию); здесь только синхронизируем
// переключатель и обрабатываем его переключение.
function getStoredTheme() {
  try {
    return localStorage.getItem('jmak-theme');
  } catch (e) {
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem('jmak-theme', theme);
  } catch (e) {
    // localStorage недоступен (приватный режим и т.п.) — тема просто не сохранится
  }
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  themeToggle.checked = theme !== 'light';
}

themeToggle.addEventListener('change', () => {
  const theme = themeToggle.checked ? 'dark' : 'light';
  applyTheme(theme);
  storeTheme(theme);
});

applyTheme(getStoredTheme() === 'light' ? 'light' : 'dark');

// ==================== ИНДИКАЦИЯ ИЗМЕНЕНИЙ ====================
function markSettingsChanged() {
  applyBtn.classList.add('changed');
}
function clearSettingsChanged() {
  applyBtn.classList.remove('changed');
}

// ==================== ПУЛЫ ПО КАТЕГОРИЯМ ====================
// Все спец. символы (набираются в английской раскладке)
const SPECIAL_POOL = '!@#$%^&*()_+-=[]{};:"\\|,.<>/?`~'.split('');
// Спец. символы, которые набираются в русской раскладке (Windows, ЙЦУКЕН) без переключения:
// Shift+1..0 → ! " № ; % : ? * ( ), Shift+- → _, Shift+= → +, а также - = \ / , .
const SPECIAL_POOL_RU = '!";%:?*()_+-=\\/,.'.split('');
const DIGITS_POOL = '0123456789'.split('');
const CONTROL_POOL = ['Shift', 'Control', 'Alt', 'Tab', 'CapsLock', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Meta'];

// Клавиши-модификаторы. Их нажатие засчитывается только при отпускании и только
// если это было одиночное нажатие: в комбинациях (Alt+Shift для смены раскладки,
// Shift+1 для «!», Ctrl+Shift и т.п.) они пропускаются.
const MODIFIER_FLAGS = { Shift: 'shiftKey', Control: 'ctrlKey', Alt: 'altKey', Meta: 'metaKey' };
// Служебные события, которые никогда не считаются нажатием (AltGr, мёртвые клавиши, IME)
const IGNORED_KEYS = ['AltGraph', 'Dead', 'Process', 'Unidentified'];
// Удерживаемые сейчас модификаторы: key → { time, combo, code }
const heldModifiers = new Map();

// Набор букв по умолчанию — по языку интерфейса: при русском «Рус», при остальных «Eng»
function defaultLetterSet() {
  return JmakI18n.locale() === 'ru' ? 'ru' : 'en';
}

function getLetterPool(letterSet) {
  const ru = 'йцукенгшщзхъфывапролджэячсмитьбюё'.split('');
  const en = 'qwertyuiopasdfghjklzxcvbnm'.split('');
  if (letterSet === 'ru') return ru;
  if (letterSet === 'en') return en;
  if (letterSet === 'all') return ru.concat(en);
  return [];
}

function getFkeysPool() {
  const fk = [];
  for (let i = 1; i <= 12; i++) fk.push('F' + i);
  return fk;
}

// Буквы набираются в русской раскладке — от этого зависят и пул спец. символов,
// и то, на какой клавише экранной клавиатуры искать символ.
function usesRuLayout(settings) {
  return settings.letters && settings.letterSet === 'ru';
}

// Пул спец. символов зависит от выбранного набора букв:
// «Рус» — только символы русской раскладки, «Eng» / «Все» / «Откл» — все символы.
// (Английская раскладка содержит все символы пула, поэтому для «Eng» переключать ничего не нужно.)
function getSpecialPool(settings) {
  if (usesRuLayout(settings)) return SPECIAL_POOL_RU.slice();
  return SPECIAL_POOL.slice();
}

// Возвращает массив пулов для каждой включённой категории
function getCategoryPools(settings) {
  const pools = [];
  if (settings.letters) pools.push(getLetterPool(settings.letterSet));
  if (settings.special) pools.push(getSpecialPool(settings));
  if (settings.digits) pools.push(DIGITS_POOL.slice());
  if (settings.fkeys) pools.push(getFkeysPool());
  if (settings.control) pools.push(CONTROL_POOL.slice());
  return pools.filter(p => p.length > 0);
}

// ==================== ВСПОМОГАТЕЛЬНОЕ ====================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Читаемое имя клавиши для подсказки, строки под клавиатурой и таблицы результатов —
// как на экранной клавиатуре (Ctrl, Win, Caps, PgDn, ↑…). У пробела на клавише
// подписи нет, поэтому «Пробел».
function displayKey(key) {
  if (key === ' ') return t('common.space');
  return JmakKeyboard.keyLabel(key) || key;
}

// Буквы сравниваем без учёта регистра (CapsLock / Shift не должны давать ошибку)
function normalizeKey(key) {
  return key.length === 1 ? key.toLowerCase() : key;
}

// Блок статуса: первая строка — текст, вторая — символ задания ('target')
// или цифра отсчёта ('countdown'). Пустая вторая строка сохраняет высоту блока,
// поэтому клавиатура под ним не сдвигается.
function setStatus(text, key = '', kind = '') {
  statusTextEl.textContent = text;
  statusKeyEl.textContent = key;
  statusKeyEl.className = 'status-key' + (kind ? ' ' + kind : '');
}

// В режиме «Все» буква может быть кириллической или латинской, а «с»/«c», «а»/«a»
// выглядят одинаково — подсказываем раскладку. У цифр, знаков и клавиш подсказки нет.
function layoutTag(sym, settings) {
  if (!settings.letters || settings.letterSet !== 'all') return '';
  if (/^[а-яё]$/i.test(sym)) return t('trainer.layoutTag.ru');
  if (/^[a-z]$/i.test(sym)) return t('trainer.layoutTag.en');
  return '';
}

// Подсказки к символу в скобках: раскладка («Все») и слой сплита, на котором он
// набирается (если не на основном) — « (Eng · Символы)» или ''
function symbolHints(sym, settings) {
  const tags = [layoutTag(sym, settings)];
  const loc = kbModel ? kbModel.locate(sym, symbolLayout(settings)) : null;
  if (loc && loc.layer > 0) tags.push(kbModel.keymap.layers[loc.layer].name);
  const text = tags.filter(Boolean).join(' · ');
  return text ? ` (${text})` : '';
}

// Строка под клавиатурой: время нажатия ('ok') или ошибка ('bad')
function setFeedback(text, kind) {
  pressTimeEl.textContent = text;
  pressTimeEl.className = 'press-feedback' + (kind ? ' ' + kind : '');
}

// Имя нажатой клавиши для строки под клавиатурой
function feedbackKey(key) {
  const name = displayKey(key);
  return name.length === 1 ? name.toUpperCase() : name;
}

// ==================== ЭКРАННАЯ КЛАВИАТУРА ====================
// Подписи на клавишах: кириллица, латиница или обе («Все»)
function labelMode(settings) {
  return settings.letters ? settings.letterSet : 'en';
}

// В какой раскладке искать символ на клавишах: для " ; : ? / , . это разные клавиши
function symbolLayout(settings) {
  return usesRuLayout(settings) ? 'ru' : 'en';
}

// Позиции клавиш на показанном слое, которыми набирается символ при этих настройках
function symbolPositions(sym, settings) {
  return kbModel.positionsOn(shownLayer, sym, symbolLayout(settings));
}

// Вспышка одна на всю клавиатуру: новая гасит предыдущую
function clearFlash() {
  if (flash.timer) clearTimeout(flash.timer);
  JmakKeyboard.toggle(keyMap, flash.positions, flash.cls, false);
  flash = { positions: [], cls: '', timer: null };
}

function flashKeys(positions, cls, ms) {
  clearFlash();
  JmakKeyboard.toggle(keyMap, positions, cls, true);
  flash = { positions, cls, timer: setTimeout(clearFlash, ms) };
}

// Перерисовывает клавиатуру по настройкам: набор блоков, подписи, синие клавиши из наборов
function renderKeyboard(settings) {
  clearFlash();
  // Сплит — форма со страницы «Вид клавиатуры». У стандартной клавиатуры ряд F-клавиш
  // и блок навигации появляются по наборам; на сплите их нет (там они на слоях)
  const layout = kbConfig.type === 'split'
    ? JmakKeyboard.buildLayout({ type: 'split', split: kbConfig.split })
    : JmakKeyboard.buildLayout({
      type: 'standard',
      fRow: settings.fkeys || settings.control, // Esc и F1–F12
      nav: settings.control                     // Insert…PageDown и стрелки
    });
  // У стандартной клавиатуры каждая клавиша отправляет свой код, слой один. У сплита —
  // раскладка со слоями, записанная на странице «Вид клавиатуры» (незаписанные клавиши
  // основного слоя — как на обычной QWERTY)
  const keymap = kbConfig.type === 'split'
    ? JmakKeyboard.buildKeymap(layout, kbConfig.keymap)
    : JmakKeyboard.defaultKeymap(layout);
  // На сплите цифры и спецсимволы могут быть на разных клавишах (флажок на странице
  // «Вид клавиатуры») — тогда «)» ищется только на своей клавише, а не как «0» + Shift
  kbModel = JmakKeyboard.createModel(layout, keymap, {
    separateSymbols: kbConfig.type === 'split' && kbConfig.separateSymbols
  });
  if (shownLayer >= kbModel.layerCount) shownLayer = 0;
  keyMap = JmakKeyboard.render(keyboardEl, kbModel, labelMode(settings), { layer: shownLayer });
  // Черты зон: по половинам (рука) или по пальцам; при «Откл» классов режима нет
  keyboardEl.classList.toggle('kb-hands-halves', settings.hands === 'halves');
  keyboardEl.classList.toggle('kb-hands-fingers', settings.hands === 'fingers');
  // «Скрыть подписи клавиш» — пустые кейкапы
  keyboardEl.classList.toggle('kb-blind', !!settings.blind);
  // Синие — клавиши показанного слоя, которые входят в наборы
  const active = getCategoryPools(settings).flat().flatMap(sym => symbolPositions(sym, settings));
  JmakKeyboard.toggle(keyMap, active, 'kb-active', true);
  // На другом слое обводим клавишу основного слоя, которая его включает
  if (shownLayer > 0) JmakKeyboard.toggle(keyMap, kbModel.layerSwitches(shownLayer), 'kb-layer-target', true);
  renderLayerTabs();
}

// Вкладки слоёв над клавиатурой (если у сплита записаны слои). В покое по ним можно
// листать слои; во время задания слой переключается сам — на тот, где символ задания
function renderLayerTabs() {
  const count = kbModel.layerCount;
  layerTabsEl.hidden = count < 2;
  layerTabsEl.textContent = '';
  if (count < 2) return;
  kbModel.keymap.layers.forEach((layer, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'layer-tab' + (i === shownLayer ? ' active' : '');
    tab.textContent = layer.name;
    tab.disabled = state === 'COUNTDOWN' || state === 'TASK';
    tab.addEventListener('click', () => {
      shownLayer = i;
      refreshKeyboard();
      // Фокус с вкладки снимаем, чтобы Пробел/Enter запускали задание
      tab.blur();
    });
    layerTabsEl.appendChild(tab);
  });
}

// Жёлтые клавиши задания («Отображение списка букв») — на показанном слое
function highlightTaskKeys() {
  if (!runSettings.showSequence) return;
  const taskPositions = taskEvents.flatMap(t => symbolPositions(t.target, runSettings));
  JmakKeyboard.toggle(keyMap, taskPositions, 'kb-task', true);
}

// «Подсказка, где нажимать»: подсветить клавишу текущего символа (и черту её пальца)
function showHint() {
  hintTimeout = null;
  if (state !== 'TASK') return;
  hintPositions = symbolPositions(currentSymbol, runSettings);
  JmakKeyboard.toggle(keyMap, hintPositions, 'kb-hint', true);
}

function clearHint() {
  if (hintTimeout) { clearTimeout(hintTimeout); hintTimeout = null; }
  JmakKeyboard.toggle(keyMap, hintPositions, 'kb-hint', false);
  hintPositions = [];
}

// Подсказка для нового символа: сразу или через HINT_DELAY_MS, если ещё не нажат
function scheduleHint() {
  clearHint();
  if (runSettings.hint === 'instant') showHint();
  else if (runSettings.hint === 'delay') hintTimeout = setTimeout(showHint, HINT_DELAY_MS);
}

// В задании показываем слой, на котором набирается символ, — с его жёлтыми клавишами
// и обведённой клавишей слоя
function showLayerFor(sym) {
  const loc = kbModel.locate(sym, symbolLayout(runSettings));
  const layer = loc ? loc.layer : 0;
  if (layer === shownLayer) return;
  shownLayer = layer;
  renderKeyboard(runSettings);
  highlightTaskKeys();
}

// В покое клавиатура — предпросмотр текущих флажков (ещё до «Применить»),
// во время отсчёта — применённые настройки. Во время задания не трогаем:
// там жёлтые клавиши задания и вспышки, а задание идёт по снимку runSettings.
function refreshKeyboard() {
  if (state === 'TASK') return;
  renderKeyboard(state === 'COUNTDOWN' ? appliedSettings : readSettingsFromDom());
}

// Вид клавиатуры меняется на другой странице. Ссылка «← К тренажёру» перезагружает эту
// страницу, но кнопка «Назад» может показать её из кэша без перезагрузки, а настройки
// могут поменять и в соседней вкладке — тогда перечитываем их и перерисовываем
function reloadKeyboardConfig() {
  kbConfig = JmakKeyboard.loadConfig();
  if (state === 'TASK') return; // задание доигрывается со старой клавиатурой
  shownLayer = 0;
  refreshKeyboard();
}
window.addEventListener('pageshow', e => {
  if (!e.persisted) return;
  // На странице «Вид клавиатуры» могли загрузить настройки из файла — вместе с ними
  // поменялись настройки тренажёра, тема и язык; тогда проще перезагрузить страницу целиком
  const themeChanged = (getStoredTheme() === 'light') !==
    (document.documentElement.getAttribute('data-theme') === 'light');
  const languageChanged = JmakI18n.preferredLanguage() !== JmakI18n.language();
  if (readStoredSettingsRaw() !== lastSettingsRaw || themeChanged || languageChanged) location.reload();
  else reloadKeyboardConfig();
});
window.addEventListener('storage', e => { if (e.key === JmakKeyboard.CONFIG_KEY) reloadKeyboardConfig(); });

// ==================== НАСТРОЙКИ ====================
function updateSettingsDisplay() {
  updateCyclesControl();
  repeatsVal.textContent = repeatsSlider.value;
}

// При «Весь набор» количество циклов не настраивается: ползунок неактивен, а вместо
// его значения показано, сколько символов войдёт в задание при текущих флажках
function updateCyclesControl() {
  const full = cbFullSet.checked;
  cyclesSlider.disabled = full;
  cyclesSlider.closest('.slider').classList.toggle('disabled', full);
  cyclesVal.textContent = full
    ? String(getCategoryPools(readSettingsFromDom()).flat().length)
    : cyclesSlider.value;
}

// Хотя бы один набор должен быть включён: если буквы «Откл» и ни один флажок
// наборов не стоит, возвращаем набор по умолчанию («Рус» или «Eng» — по языку)
function validateCheckboxes() {
  const anyChecked = cbSpecial.checked || cbDigits.checked || cbFkeys.checked || cbControl.checked;
  if (letterSetSelect.value === 'off' && !anyChecked) {
    letterSetSelect.value = defaultLetterSet();
  }
}

// Список «Набор букв» хранится в настройках как два поля: letters (выключен ли
// набор — пункт «Откл») и letterSet ('ru' | 'en' | 'all'). При «Откл» letterSet
// не используется.
function readSettingsFromDom() {
  const letterChoice = letterSetSelect.value;
  return {
    letters: letterChoice !== 'off',
    letterSet: letterChoice === 'off' ? 'ru' : letterChoice,
    special: cbSpecial.checked,
    digits: cbDigits.checked,
    fkeys: cbFkeys.checked,
    control: cbControl.checked,
    fullSet: cbFullSet.checked,
    showSequence: cbShowSeq.checked,
    blind: cbBlind.checked,
    hands: handsSelect.value,
    hint: hintSelect.value,
    cycles: parseInt(cyclesSlider.value, 10),
    repeats: parseInt(repeatsSlider.value, 10)
  };
}

// Переносит объект настроек в элементы формы — обратная операция к readSettingsFromDom.
function applySettingsToDom(settings) {
  letterSetSelect.value = settings.letters ? settings.letterSet : 'off';
  cbSpecial.checked = settings.special;
  cbDigits.checked = settings.digits;
  cbFkeys.checked = settings.fkeys;
  cbControl.checked = settings.control;
  cbFullSet.checked = settings.fullSet;
  cbShowSeq.checked = settings.showSequence;
  cbBlind.checked = settings.blind;
  handsSelect.value = settings.hands;
  hintSelect.value = settings.hint;
  cyclesSlider.value = String(settings.cycles);
  repeatsSlider.value = String(settings.repeats);
}

// ==================== СОХРАНЕНИЕ НАСТРОЕК (localStorage) ====================
const SETTINGS_STORAGE_KEY = 'jmak-settings';
// Сохранённые настройки в том виде, с которым работает страница: если в хранилище
// окажется другое (загрузили из файла на странице «Вид клавиатуры»), страницу нужно
// перезагрузить — см. обработчик pageshow
let lastSettingsRaw = null;

function readStoredSettingsRaw() {
  try {
    return localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch (e) {
    return null; // localStorage недоступен (приватный режим и т.п.)
  }
}

// Читает настройки из localStorage и проверяет каждое поле — на случай
// повреждённых данных или старой версии формата. Некорректные/отсутствующие
// поля заменяются значением по умолчанию, а не роняют загрузку целиком.
function loadStoredSettings() {
  const raw = readStoredSettingsRaw();
  lastSettingsRaw = raw;
  if (!raw) return null;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return null; // повреждённый JSON
  }
  if (!data || typeof data !== 'object') return null;

  const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);
  const clampInt = (v, min, max, fallback) =>
    Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;

  return {
    letters: bool(data.letters, true),
    letterSet: ['ru', 'en', 'all'].includes(data.letterSet) ? data.letterSet : 'ru',
    special: bool(data.special, false),
    digits: bool(data.digits, false),
    fkeys: bool(data.fkeys, false),
    control: bool(data.control, false),
    fullSet: bool(data.fullSet, false),
    showSequence: bool(data.showSequence, false),
    blind: bool(data.blind, false),
    // Раньше это был флажок «Отображать для двух рук»: true — то же, что «половины»
    hands: data.hands === true ? 'halves'
      : ['off', 'halves', 'fingers'].includes(data.hands) ? data.hands : 'off',
    hint: ['never', 'delay', 'instant'].includes(data.hint) ? data.hint : 'never',
    cycles: clampInt(data.cycles, 5, 100, 5),
    repeats: clampInt(data.repeats, 1, 10, 1)
  };
}

function saveSettings(settings) {
  try {
    const raw = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, raw);
    lastSettingsRaw = raw;
  } catch (e) {
    // localStorage недоступен — настройки просто не сохранятся для следующего раза
  }
}

// ==================== ОБРАБОТЧИКИ НАСТРОЕК ====================
// Флажки наборов и выбор букв сразу меняют предпросмотр на клавиатуре и число
// символов у «Весь набор» (validateCheckboxes может вернуть набор букв «Рус»,
// поэтому она первая)
[letterSetSelect, cbSpecial, cbDigits, cbFkeys, cbControl].forEach(el => {
  el.addEventListener('change', () => {
    validateCheckboxes();
    markSettingsChanged();
    refreshKeyboard();
    updateCyclesControl();
  });
});
cbFullSet.addEventListener('change', () => { markSettingsChanged(); updateCyclesControl(); });
cbShowSeq.addEventListener('change', markSettingsChanged);
// Зоны рук и скрытые подписи — тоже сразу в предпросмотре
[handsSelect, cbBlind].forEach(el => {
  el.addEventListener('change', () => { markSettingsChanged(); refreshKeyboard(); });
});
// Подсказка работает только в задании
hintSelect.addEventListener('change', markSettingsChanged);

cyclesSlider.addEventListener('input', () => {
  cyclesVal.textContent = cyclesSlider.value;
  markSettingsChanged();
});

repeatsSlider.addEventListener('input', () => {
  repeatsVal.textContent = repeatsSlider.value;
  markSettingsChanged();
});

applyBtn.addEventListener('click', () => {
  // Во время задания настройки менять нельзя (кнопка в это время disabled)
  if (state === 'TASK') return;
  appliedSettings = readSettingsFromDom();
  saveSettings(appliedSettings);
  // «Применить» доступно и во время отсчёта — тогда клавиатура покажет новые настройки
  refreshKeyboard();
  clearSettingsChanged();
  // Снимаем фокус, чтобы Пробел/Enter запускали задание, а не нажимали кнопку повторно
  applyBtn.blur();
});

// ==================== ПОСТРОЕНИЕ ПОСЛЕДОВАТЕЛЬНОСТИ ====================
// Перемешивает массив на месте (Fisher–Yates) и возвращает его
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// «Весь набор»: каждый символ выбранных наборов по одному разу в случайном порядке
// (пулы не пересекаются, поэтому повторов и одинаковых соседей нет).
// Иначе — settings.cycles символов: гарантирует по одному символу из каждой
// включённой категории и отсутствие двух одинаковых символов подряд между циклами.
// Пулы категорий не пересекаются, поэтому «обязательные» символы
// не могут совпасть друг с другом; остальные позиции заполняются
// с проверкой обоих соседей.
function buildCycleSequence(settings) {
  const pools = getCategoryPools(settings);

  if (pools.length === 0) return [];
  if (settings.fullSet) return shuffle(pools.flat());

  const N = settings.cycles;
  const result = new Array(N).fill(null);

  // Случайные позиции для «обязательных» символов — по одной на категорию
  const positions = [];
  for (let i = 0; i < N; i++) positions.push(i);
  shuffle(positions);

  const placed = Math.min(pools.length, N);
  for (let c = 0; c < placed; c++) {
    const pool = pools[c];
    const sym = pool[Math.floor(Math.random() * pool.length)];
    result[positions[c]] = sym;
  }

  // Общий пул для заполнения оставшихся позиций
  const allPool = pools.flat();

  // Заполняем пустые позиции, избегая одинаковых соседей
  for (let i = 0; i < N; i++) {
    if (result[i] !== null) continue;
    let sym;
    let attempts = 0;
    do {
      sym = allPool[Math.floor(Math.random() * allPool.length)];
      attempts++;
    } while (attempts < 300 && (
      (i > 0 && result[i - 1] === sym) ||
      (i < N - 1 && result[i + 1] === sym)
    ));
    result[i] = sym;
  }

  return result;
}

// ==================== ЛОГИКА ИГРЫ ====================
function getStartKeyName(key) {
  return key === ' ' ? t('common.space') : 'Enter';
}

function updateStartPrompt() {
  setStatus(t('trainer.status.start', { key: getStartKeyName(currentStartKey) }));
}

function clearTimers() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  if (nextTimeout) { clearTimeout(nextTimeout); nextTimeout = null; }
  if (promptTimeout) { clearTimeout(promptTimeout); promptTimeout = null; }
  clearHint();
}

// symbols — готовый набор символов задания («Повторить ошибки»); без него задание
// строится по настройкам
function beginCountdown(symbols = null) {
  clearTimers();
  pendingSymbols = symbols;
  resultsEl.innerHTML = '';
  progressEl.textContent = '';
  setFeedback('');

  state = 'COUNTDOWN';
  abortBtn.hidden = false;
  // На время отсчёта клавиатура показывает применённые настройки, а не черновик флажков,
  // на основном слое
  shownLayer = 0;
  renderKeyboard(appliedSettings);
  // После предыдущего задания панель прокручена к таблице результатов
  jmyakPanel.scrollTop = 0;
  countdownValue = COUNTDOWN_SECONDS;
  // Цифра отсчёта — во второй строке, там, где появится первый символ
  setStatus(t('trainer.status.ready'), String(countdownValue), 'countdown');

  countdownInterval = setInterval(() => {
    countdownValue--;
    if (countdownValue > 0) {
      setStatus(t('trainer.status.ready'), String(countdownValue), 'countdown');
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      startTask();
    }
  }, 1000);
}

function startTask() {
  state = 'TASK';
  inputLocked = false;
  heldModifiers.clear();
  applyBtn.disabled = true;
  langSelect.disabled = true;

  // Фиксируем настройки на время задания
  runSettings = Object.assign({}, appliedSettings);

  // Снимаем фокус с элементов настроек, иначе они «глотают» нажатия
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }

  // Строим по циклам (по одному символу на цикл)
  const cyclesSymbols = pendingSymbols || buildCycleSequence(runSettings);
  pendingSymbols = null;

  // Разворачиваем в последовательность нажатий с учётом повторов
  sequence = [];
  for (const sym of cyclesSymbols) {
    for (let j = 0; j < runSettings.repeats; j++) {
      sequence.push(sym);
    }
  }

  taskEvents = cyclesSymbols.map(sym => ({ target: sym, events: [] }));

  currentIndex = 0;
  renderKeyboard(runSettings);
  // Клавиши, которые встретятся в задании, — жёлтым (текущую отдельно не выделяем)
  highlightTaskKeys();
  nextSymbol();
}

function abortTask() {
  if (state !== 'COUNTDOWN' && state !== 'TASK') return;
  clearTimers();
  inputLocked = false;
  heldModifiers.clear();
  state = 'IDLE';
  applyBtn.disabled = false;
  langSelect.disabled = false;
  abortBtn.hidden = true;
  progressEl.textContent = '';
  setFeedback('');
  shownLayer = 0;
  refreshKeyboard(); // снимает жёлтый и вспышки, возвращает предпросмотр на основном слое
  updateStartPrompt();
}

function nextSymbol() {
  nextTimeout = null;
  if (state !== 'TASK') return;
  if (currentIndex >= sequence.length) {
    finishTask();
    return;
  }
  inputLocked = false;
  currentSymbol = sequence[currentIndex];
  startTime = Date.now();
  // Символ на другом слое сплита — показываем этот слой и называем его в подсказке
  showLayerFor(currentSymbol);
  scheduleHint();
  setStatus(t('trainer.status.press') + symbolHints(currentSymbol, runSettings), displayKey(currentSymbol), 'target');
  // Строка под клавиатурой не очищается: результат прошлого нажатия виден до следующего

  const cycle = Math.floor(currentIndex / runSettings.repeats) + 1;
  const repeat = (currentIndex % runSettings.repeats) + 1;
  // Число циклов берём из задания: при «Весь набор» оно не равно ползунку
  progressEl.textContent = t('trainer.progress', {
    cycle, cycles: taskEvents.length, repeat, repeats: runSettings.repeats
  });
}

function finishTask() {
  state = 'FINISHED';
  inputLocked = false;
  heldModifiers.clear();
  applyBtn.disabled = false;
  langSelect.disabled = false;
  abortBtn.hidden = true;
  setStatus(t('trainer.status.done'));
  setFeedback('');
  progressEl.textContent = '';
  shownLayer = 0;
  refreshKeyboard(); // снимает жёлтый и вспышки, возвращает предпросмотр на основном слое
  renderResults();
  currentStartKey = Math.random() < 0.5 ? ' ' : 'Enter';
  requestAnimationFrame(() => {
    jmyakPanel.scrollTop = jmyakPanel.scrollHeight;
  });
  if (promptTimeout) clearTimeout(promptTimeout);
  promptTimeout = setTimeout(() => {
    promptTimeout = null;
    // Не затираем отсчёт/задание, если пользователь уже запустил новое
    if (state === 'FINISHED' || state === 'IDLE') updateStartPrompt();
  }, 1500);
}

// Клавиши, которые были нажаты не с первого раза: цели циклов, где было хотя бы
// одно ошибочное нажатие, без повторов и в порядке появления. В режиме «Все»
// к буквам добавлена раскладка — иначе «с» и «c» в списке не различить, а к символам
// с другого слоя сплита — название слоя.
function missedSymbols() {
  const missed = [];
  taskEvents.forEach(item => {
    if (item.events.some(e => !e.isCorrect) && !missed.includes(item.target)) {
      missed.push(item.target);
    }
  });
  return missed;
}

// Тексты перевода вставляются как есть (это свои файлы), клавиши — экранированными
function renderMistakes(missed) {
  const keys = missed
    .map(sym => `<b class="mistakes-key">${escapeHtml(displayKey(sym) + symbolHints(sym, runSettings))}</b>`)
    .join(', ');
  const text = missed.length === 0
    ? `<p class="mistakes-none">${t('trainer.results.noMistakes')}</p>`
    : `<p>${t('trainer.results.mistakes', { keys })}</p>` +
      `<button type="button" class="btn btn-primary" id="retryBtn">${t('trainer.results.retry')}</button>`;
  return `<div class="mistakes"><h3>${t('trainer.results.mistakesTitle')}</h3>${text}</div>`;
}

// «Повторить ошибки»: каждая клавиша с ошибкой RETRY_ROUNDS раз, круги перемешаны,
// на стыке кругов одна и та же клавиша не идёт дважды подряд
function buildRetrySequence(symbols) {
  const result = [];
  for (let r = 0; r < RETRY_ROUNDS; r++) {
    const round = shuffle(symbols.slice());
    if (round.length > 1 && round[0] === result[result.length - 1]) {
      [round[0], round[1]] = [round[1], round[0]];
    }
    result.push(...round);
  }
  return result;
}

// Итоги задания: блок ошибок (с кнопкой «Повторить ошибки») и под ним свёрнутая
// таблица всех нажатий
function renderResults() {
  const missed = missedSymbols();
  const columns = [
    t('trainer.results.colNumber'), t('trainer.results.colTarget'), t('trainer.results.colPresses'),
    t('trainer.results.colErrors'), t('trainer.results.colAvgTime')
  ].map(text => `<th>${text}</th>`).join('');
  let html = renderMistakes(missed) +
    `<details class="info results-details"><summary>${t('trainer.results.details')}</summary>` +
    `<div class="results-body"><table><thead><tr>${columns}</tr></thead><tbody>`;
  taskEvents.forEach((item, idx) => {
    const events = item.events;
    const errors = events.filter(e => !e.isCorrect).length;
    const totalTime = events.reduce((sum, e) => sum + e.time, 0);
    const avgTime = events.length ? Math.round(totalTime / events.length) : 0;
    const pressesHtml = events.map(e => {
      const cls = e.isCorrect ? 'event-correct' : 'event-wrong';
      return `<span class="${cls}">${t('trainer.results.press', { key: escapeHtml(displayKey(e.key)), time: e.time })}</span>`;
    }).join(', ');
    html += `<tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(displayKey(item.target))}</td>
      <td>${pressesHtml || '—'}</td>
      <td>${errors}</td>
      <td>${avgTime}</td>
    </tr>`;
  });
  html += '</tbody></table></div></details>';
  resultsEl.innerHTML = html;

  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      // Фокус с кнопки снимаем, чтобы нажатия в задании не «нажимали» её
      retryBtn.blur();
      beginCountdown(buildRetrySequence(missed));
    });
  }
}

// ==================== ОБРАБОТКА КЛАВИШ ====================
abortBtn.addEventListener('click', () => {
  abortTask();
  // Скрытая кнопка остаётся на своём месте невидимой — снимаем с неё фокус,
  // чтобы Пробел/Enter запускали новое задание, а не нажимали её повторно
  abortBtn.blur();
});

function dropStaleModifiers(e) {
  for (const key of heldModifiers.keys()) {
    if (!e[MODIFIER_FLAGS[key]]) heldModifiers.delete(key);
  }
}

// Регистрирует нажатие клавиши (верное или ошибочное) в текущем цикле.
// code — KeyboardEvent.code нажатой физической клавиши (у синтетических событий пустой),
// shift — был ли зажат Shift: по code и shift находим нажатую позицию на схеме.
function handlePress(key, time, code = '', shift = false) {
  if (state !== 'TASK' || inputLocked) return;
  const cycle = taskEvents[Math.floor(currentIndex / runSettings.repeats)];
  if (!cycle) return;
  const pressedPos = code ? kbModel.positionOf(code, shift, shownLayer) : null;

  if (normalizeKey(key) === normalizeKey(currentSymbol)) {
    inputLocked = true;
    clearHint();
    // Подсвечиваем клавишу, которую реально нажали: в режиме «Все» знак может набираться
    // не той клавишей, где он стоит в US-раскладке. Если её нет на клавиатуре
    // (цифровой блок) или код неизвестен — клавишу, на которой стоит символ.
    flashKeys(pressedPos ? [pressedPos] : symbolPositions(currentSymbol, runSettings), 'kb-correct', ADVANCE_DELAY_MS);
    setFeedback(t('trainer.feedback.time', { time }), 'ok');
    cycle.events.push({ key, time, isCorrect: true });

    currentIndex++;
    nextTimeout = setTimeout(nextSymbol, ADVANCE_DELAY_MS);
  } else {
    // Клавишу, которой нет на клавиатуре (например, цифрового блока), не видно,
    // но ошибка всё равно показывается строкой под клавиатурой
    const wrongPositions = pressedPos ? [pressedPos] : code ? [] : symbolPositions(key, runSettings);
    flashKeys(wrongPositions, 'kb-wrong', WRONG_FLASH_MS);
    setFeedback(t('trainer.feedback.wrong', { key: feedbackKey(key), time }), 'bad');
    cycle.events.push({ key, time, isCorrect: false });
  }
}

window.addEventListener('keydown', (e) => {
  // Пока открыто окно первого запуска, задание не запускается: после клика по фону
  // фокус на body, и Пробел/Enter иначе начали бы отсчёт под окном. Нажатия на кнопках
  // окна работают как обычно (preventDefault не вызываем)
  if (!welcomeEl.hidden) return;
  if (state === 'IDLE' || state === 'FINISHED') {
    // На элементах управления клавиши работают как обычно (в том числе Enter на ссылке
    // «Вид клавиатуры» — переход, а не старт задания)
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'TEXTAREA' || tag === 'A') return;
    if (e.key === currentStartKey) {
      e.preventDefault();
      if (!e.repeat) beginCountdown();
    } else if (e.key === ' ') {
      // Пробел не должен прокручивать страницу
      e.preventDefault();
    }
  } else if (state === 'COUNTDOWN') {
    if (e.key === ' ') e.preventDefault();
  } else if (state === 'TASK') {
    e.preventDefault();

    // Автоповтор игнорируем
    if (e.repeat) return;

    // Убираем «залипшие» записи: если у события уже нет флага модификатора,
    // значит его keyup мы не получили (например, после Alt+Tab)
    dropStaleModifiers(e);

    // Любая клавиша, нажатая при удерживаемом модификаторе, делает его частью комбинации
    const alreadyHeld = heldModifiers.size > 0;
    heldModifiers.forEach(m => { m.combo = true; });

    if (IGNORED_KEYS.includes(e.key)) return;

    if (e.key in MODIFIER_FLAGS) {
      // Решение о модификаторе принимается при отпускании (keyup)
      if (!inputLocked) {
        heldModifiers.set(e.key, { time: Date.now() - startTime, combo: alreadyHeld, code: e.code });
      }
      return;
    }

    handlePress(e.key, Date.now() - startTime, e.code, e.shiftKey);
  }
});

window.addEventListener('keyup', (e) => {
  if (state !== 'TASK' || !(e.key in MODIFIER_FLAGS)) return;
  const held = heldModifiers.get(e.key);
  if (!held) return;
  heldModifiers.delete(e.key);
  // Одиночное нажатие модификатора засчитываем, комбинацию — пропускаем
  if (!held.combo) handlePress(e.key, held.time, held.code);
});

// Потеря фокуса окна (Alt+Tab, меню «Пуск» по Win): keyup мы можем не получить.
// Клавиша Win, нажатая одна, открывает «Пуск» и уводит фокус — засчитываем её сразу.
// Остальные модификаторы при потере фокуса — это, как правило, комбинация, их пропускаем.
window.addEventListener('blur', () => {
  if (state === 'TASK') {
    const meta = heldModifiers.get('Meta');
    if (meta && !meta.combo) handlePress('Meta', meta.time, meta.code);
  }
  heldModifiers.clear();
});

// ==================== ХРАНИЛИЩЕ НЕДОСТУПНО ====================
// Браузер может запретить сайту сохранять данные — тогда тренажёр работает, но ничего
// не запоминает, а сплит со страницы «Вид клавиатуры» сюда не попадает (страницы
// обмениваются настройками только через localStorage). Предупреждаем полосой вверху
// панели; крестик скрывает её до перезагрузки
const storageOk = JmakKeyboard.storageAvailable();
const storageWarningEl = document.getElementById('storageWarning');
const storageWarningClose = document.getElementById('storageWarningClose');
storageWarningEl.hidden = storageOk;
storageWarningClose.addEventListener('click', () => {
  storageWarningEl.hidden = true;
  // Снимаем фокус со скрытой кнопки, чтобы Пробел/Enter запускали задание
  storageWarningClose.blur();
});

// ==================== ПЕРВЫЙ ЗАПУСК ====================
// Если в браузере ещё ничего не сохранено, спрашиваем, какой клавиатурой пользуются.
// Окно закрывается только кнопками: у обычного div нет встроенного закрытия (Esc,
// как у <dialog>), а содержимое страницы под ним недоступно (inert). Ответ сохраняется
// как тип клавиатуры, поэтому окно больше не появляется; «Сплит» сразу открывает
// страницу «Вид клавиатуры» — там уже выбран сплит, осталось задать его форму.
const welcomeEl = document.getElementById('welcome');
const appEl = document.querySelector('.app');

function isFirstVisit() {
  if (!storageOk) return false; // ответ не сохранится — окно появлялось бы каждый раз
  try {
    return [JmakKeyboard.CONFIG_KEY, SETTINGS_STORAGE_KEY, 'jmak-theme', JmakI18n.STORAGE_KEY]
      .every(key => localStorage.getItem(key) === null);
  } catch (e) {
    return false;
  }
}

function openWelcome() {
  welcomeEl.hidden = false;
  appEl.inert = true;
  // Фокус на само окно, а не на кнопку: случайный Пробел (за окном видно «Для начала
  // нажмите Пробел») не должен выбрать ответ. Кнопки доступны по Tab
  welcomeEl.querySelector('.modal').focus();
}

function chooseKeyboard(type) {
  kbConfig = JmakKeyboard.normalizeConfig(Object.assign({}, kbConfig, { type }));
  JmakKeyboard.saveConfig(kbConfig);
  welcomeEl.hidden = true;
  appEl.inert = false;
  if (type === 'split') location.href = 'key_settings.html';
}

document.getElementById('welcomeStandard').addEventListener('click', () => chooseKeyboard('standard'));
document.getElementById('welcomeSplit').addEventListener('click', () => chooseKeyboard('split'));

// ==================== ЯЗЫК ====================
// Языки — переводы из папки localization (см. js/i18n.js). Язык меняется без перезагрузки:
// разметку переводит JmakI18n.setLanguage, а то, что строится из JS (статус, итоги
// задания, вкладки слоёв), перерисовываем здесь. Во время задания список недоступен,
// как и «Применить»; во время отсчёта статус обновит следующий тик.
function fillLanguageSelect() {
  JmakI18n.languages().forEach(({ code, name }) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    langSelect.appendChild(option);
  });
  langSelect.value = JmakI18n.language();
}

langSelect.addEventListener('change', () => {
  JmakI18n.setLanguage(langSelect.value);
  if (state === 'FINISHED') {
    renderResults();
    // «Задание выполнено!» держится 1,5 с, потом сменяется подсказкой о старте
    if (promptTimeout) setStatus(t('trainer.status.done'));
    else updateStartPrompt();
  } else if (state === 'IDLE') {
    updateStartPrompt();
  }
  refreshKeyboard();
  // Фокус снимаем, чтобы Пробел/Enter запускали задание
  langSelect.blur();
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
// Сначала переносим в форму настройки, сохранённые в localStorage (если они
// есть), затем приводим DOM в согласованное состояние (браузер мог восстановить
// свои собственные значения формы поверх них) и только потом читаем настройки
// и обновляем интерфейс.
const storedSettings = loadStoredSettings();
if (storedSettings) applySettingsToDom(storedSettings);
else letterSetSelect.value = defaultLetterSet(); // настроек ещё нет — набор букв по языку
validateCheckboxes();
updateSettingsDisplay();
appliedSettings = readSettingsFromDom();
runSettings = appliedSettings;
fillLanguageSelect();
updateStartPrompt();
refreshKeyboard();
if (isFirstVisit()) openWelcome();
