// ==================== СОСТОЯНИЕ ====================
let state = 'IDLE'; // IDLE | COUNTDOWN | TASK | FINISHED
let appliedSettings = {
  letters: true,
  letterSet: 'ru',
  special: false,
  digits: false,
  fkeys: false,
  control: false,
  showSequence: false,
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
let chipElements = [];

// ==================== DOM ====================
const statusEl = document.getElementById('status');
const keyBoxEl = document.getElementById('keyBox');
const pressTimeEl = document.getElementById('pressTime');
const progressEl = document.getElementById('progress');
const sequenceEl = document.getElementById('sequence');
const resultsEl = document.getElementById('results');
const jmyakPanel = document.getElementById('jmyakPanel');

const cbLetters = document.getElementById('cbLetters');
const letterGroup = document.getElementById('letterGroup');
const cbSpecial = document.getElementById('cbSpecial');
const cbDigits = document.getElementById('cbDigits');
const cbFkeys = document.getElementById('cbFkeys');
const cbControl = document.getElementById('cbControl');
const cbShowSeq = document.getElementById('cbShowSeq');
const cyclesSlider = document.getElementById('cycles');
const cyclesVal = document.getElementById('cyclesVal');
const repeatsSlider = document.getElementById('repeats');
const repeatsVal = document.getElementById('repeatsVal');
const applyBtn = document.getElementById('applyBtn');
const abortBtn = document.getElementById('abortBtn');
const themeToggle = document.getElementById('themeToggle');

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
// Удерживаемые сейчас модификаторы: key → { time, combo }
const heldModifiers = new Map();

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

// Пул спец. символов зависит от выбранного набора букв:
// «Рус» — только символы русской раскладки, «Eng» / «Все» / буквы выключены — все символы.
// (Английская раскладка содержит все символы пула, поэтому для «Eng» переключать ничего не нужно.)
function getSpecialPool(settings) {
  if (settings.letters && settings.letterSet === 'ru') return SPECIAL_POOL_RU.slice();
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

// Читаемое имя клавиши (пробел иначе показывался бы пустой строкой)
function displayKey(key) {
  return key === ' ' ? 'Пробел' : key;
}

// Буквы сравниваем без учёта регистра (CapsLock / Shift не должны давать ошибку)
function normalizeKey(key) {
  return key.length === 1 ? key.toLowerCase() : key;
}

// Показывает текст в большом квадрате; длинные названия уменьшает, чтобы влезли
function setKeyBox(text, cls) {
  keyBoxEl.textContent = text;
  keyBoxEl.className = 'key-box' + (cls ? ' ' + cls : '') + (text.length > 2 ? ' long' : '');
}

// ==================== НАСТРОЙКИ ====================
function updateSettingsDisplay() {
  cyclesVal.textContent = cyclesSlider.value;
  repeatsVal.textContent = repeatsSlider.value;
}

function validateCheckboxes() {
  const anyChecked = cbLetters.checked || cbSpecial.checked || cbDigits.checked || cbFkeys.checked || cbControl.checked;
  if (!anyChecked) {
    cbLetters.checked = true;
  }
  letterGroup.style.opacity = cbLetters.checked ? '1' : '0.5';
  letterGroup.style.pointerEvents = cbLetters.checked ? 'auto' : 'none';
}

function updateSequenceVisibility() {
  if (appliedSettings.showSequence) {
    sequenceEl.classList.remove('hidden');
  } else {
    sequenceEl.classList.add('hidden');
  }
}

function readSettingsFromDom() {
  return {
    letters: cbLetters.checked,
    letterSet: document.querySelector('input[name="letterSet"]:checked').value,
    special: cbSpecial.checked,
    digits: cbDigits.checked,
    fkeys: cbFkeys.checked,
    control: cbControl.checked,
    showSequence: cbShowSeq.checked,
    cycles: parseInt(cyclesSlider.value, 10),
    repeats: parseInt(repeatsSlider.value, 10)
  };
}

// Переносит объект настроек в элементы формы — обратная операция к readSettingsFromDom.
function applySettingsToDom(settings) {
  cbLetters.checked = settings.letters;
  const letterSetInput = document.querySelector(`input[name="letterSet"][value="${settings.letterSet}"]`);
  if (letterSetInput) letterSetInput.checked = true;
  cbSpecial.checked = settings.special;
  cbDigits.checked = settings.digits;
  cbFkeys.checked = settings.fkeys;
  cbControl.checked = settings.control;
  cbShowSeq.checked = settings.showSequence;
  cyclesSlider.value = String(settings.cycles);
  repeatsSlider.value = String(settings.repeats);
}

// ==================== СОХРАНЕНИЕ НАСТРОЕК (localStorage) ====================
const SETTINGS_STORAGE_KEY = 'jmak-settings';

// Читает настройки из localStorage и проверяет каждое поле — на случай
// повреждённых данных или старой версии формата. Некорректные/отсутствующие
// поля заменяются значением по умолчанию, а не роняют загрузку целиком.
function loadStoredSettings() {
  let raw;
  try {
    raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch (e) {
    return null; // localStorage недоступен (приватный режим и т.п.)
  }
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
    showSequence: bool(data.showSequence, false),
    cycles: clampInt(data.cycles, 5, 100, 5),
    repeats: clampInt(data.repeats, 1, 10, 1)
  };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    // localStorage недоступен — настройки просто не сохранятся для следующего раза
  }
}

// ==================== ОБРАБОТЧИКИ НАСТРОЕК ====================
cbLetters.addEventListener('change', () => { validateCheckboxes(); markSettingsChanged(); });
cbSpecial.addEventListener('change', () => { validateCheckboxes(); markSettingsChanged(); });
cbDigits.addEventListener('change', () => { validateCheckboxes(); markSettingsChanged(); });
cbFkeys.addEventListener('change', () => { validateCheckboxes(); markSettingsChanged(); });
cbControl.addEventListener('change', () => { validateCheckboxes(); markSettingsChanged(); });
cbShowSeq.addEventListener('change', markSettingsChanged);

document.querySelectorAll('input[name="letterSet"]').forEach(r => {
  r.addEventListener('change', markSettingsChanged);
});

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
  updateSequenceVisibility();
  clearSettingsChanged();
  // Снимаем фокус, чтобы Пробел/Enter запускали задание, а не нажимали кнопку повторно
  applyBtn.blur();
});

// ==================== ПОСТРОЕНИЕ ПОСЛЕДОВАТЕЛЬНОСТИ ====================
// Гарантирует по одному символу из каждой включённой категории
// и отсутствие двух одинаковых символов подряд между циклами.
// Пулы категорий не пересекаются, поэтому «обязательные» символы
// не могут совпасть друг с другом; остальные позиции заполняются
// с проверкой обоих соседей.
function buildCycleSequence(settings) {
  const N = settings.cycles;
  const pools = getCategoryPools(settings);

  if (pools.length === 0) return [];

  const result = new Array(N).fill(null);

  // Случайные позиции для «обязательных» символов — по одной на категорию
  const positions = [];
  for (let i = 0; i < N; i++) positions.push(i);
  // Fisher–Yates
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

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
  return key === ' ' ? 'Пробел' : 'Enter';
}

function updateStartPrompt() {
  statusEl.textContent = `Для начала нажмите ${getStartKeyName(currentStartKey)}`;
}

function clearTimers() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  if (nextTimeout) { clearTimeout(nextTimeout); nextTimeout = null; }
  if (promptTimeout) { clearTimeout(promptTimeout); promptTimeout = null; }
}

function beginCountdown() {
  clearTimers();
  resultsEl.innerHTML = '';
  sequenceEl.innerHTML = '';
  progressEl.textContent = '';
  pressTimeEl.textContent = '';
  setKeyBox('—', 'idle');

  state = 'COUNTDOWN';
  abortBtn.hidden = false;
  countdownValue = COUNTDOWN_SECONDS;
  statusEl.textContent = countdownValue;

  countdownInterval = setInterval(() => {
    countdownValue--;
    if (countdownValue > 0) {
      statusEl.textContent = countdownValue;
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

  // Фиксируем настройки на время задания
  runSettings = Object.assign({}, appliedSettings);

  // Снимаем фокус с элементов настроек, иначе они «глотают» нажатия
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }

  // Строим по циклам (по одному символу на цикл)
  const cyclesSymbols = buildCycleSequence(runSettings);

  // Разворачиваем в последовательность нажатий с учётом повторов
  sequence = [];
  for (const sym of cyclesSymbols) {
    for (let j = 0; j < runSettings.repeats; j++) {
      sequence.push(sym);
    }
  }

  taskEvents = cyclesSymbols.map(sym => ({ target: sym, events: [] }));

  currentIndex = 0;
  renderSequence();
  nextSymbol();
}

function abortTask() {
  if (state !== 'COUNTDOWN' && state !== 'TASK') return;
  clearTimers();
  inputLocked = false;
  heldModifiers.clear();
  state = 'IDLE';
  applyBtn.disabled = false;
  abortBtn.hidden = true;
  sequenceEl.innerHTML = '';
  chipElements = [];
  progressEl.textContent = '';
  pressTimeEl.textContent = '';
  setKeyBox('—', 'idle');
  updateStartPrompt();
}

function renderSequence() {
  sequenceEl.innerHTML = '';
  chipElements = [];
  if (!runSettings.showSequence) return;
  sequence.forEach((sym, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = displayKey(sym);
    if (i === currentIndex) chip.classList.add('current');
    sequenceEl.appendChild(chip);
    chipElements.push(chip);
  });
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
  statusEl.innerHTML = `Жми&nbsp;<span class="target-key">${escapeHtml(displayKey(currentSymbol))}</span>`;
  setKeyBox(displayKey(currentSymbol));
  pressTimeEl.textContent = '';

  if (runSettings.showSequence) {
    chipElements.forEach((chip, i) => {
      chip.classList.remove('current');
      if (i === currentIndex) chip.classList.add('current');
    });
  }

  const cycle = Math.floor(currentIndex / runSettings.repeats) + 1;
  const repeat = (currentIndex % runSettings.repeats) + 1;
  progressEl.textContent = `Цикл ${cycle}/${runSettings.cycles}, повтор ${repeat}/${runSettings.repeats}`;
}

function finishTask() {
  state = 'FINISHED';
  inputLocked = false;
  heldModifiers.clear();
  applyBtn.disabled = false;
  abortBtn.hidden = true;
  statusEl.textContent = 'Задание выполнено!';
  setKeyBox('—', 'idle');
  pressTimeEl.textContent = '';
  progressEl.textContent = '';
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

function renderResults() {
  let html = '<h3>Результаты</h3><table><thead><tr><th>№</th><th>Целевая клавиша</th><th>Нажатия</th><th>Ошибки</th><th>Среднее время (мс)</th></tr></thead><tbody>';
  taskEvents.forEach((item, idx) => {
    const events = item.events;
    const errors = events.filter(e => !e.isCorrect).length;
    const totalTime = events.reduce((sum, e) => sum + e.time, 0);
    const avgTime = events.length ? Math.round(totalTime / events.length) : 0;
    const pressesHtml = events.map(e => {
      const cls = e.isCorrect ? 'event-correct' : 'event-wrong';
      return `<span class="${cls}">${escapeHtml(displayKey(e.key))} (${e.time} мс)</span>`;
    }).join(', ');
    html += `<tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(displayKey(item.target))}</td>
      <td>${pressesHtml || '—'}</td>
      <td>${errors}</td>
      <td>${avgTime}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  resultsEl.innerHTML = html;
}

// ==================== ОБРАБОТКА КЛАВИШ ====================
abortBtn.addEventListener('click', abortTask);

function dropStaleModifiers(e) {
  for (const key of heldModifiers.keys()) {
    if (!e[MODIFIER_FLAGS[key]]) heldModifiers.delete(key);
  }
}

// Регистрирует нажатие клавиши (верное или ошибочное) в текущем цикле
function handlePress(key, time) {
  if (state !== 'TASK' || inputLocked) return;
  const cycle = taskEvents[Math.floor(currentIndex / runSettings.repeats)];
  if (!cycle) return;

  if (normalizeKey(key) === normalizeKey(currentSymbol)) {
    inputLocked = true;
    setKeyBox(displayKey(currentSymbol), 'correct');
    pressTimeEl.textContent = `${time} мс`;
    cycle.events.push({ key, time, isCorrect: true });

    if (runSettings.showSequence && chipElements[currentIndex]) {
      chipElements[currentIndex].classList.remove('current');
      chipElements[currentIndex].classList.add('correct');
    }

    currentIndex++;
    nextTimeout = setTimeout(nextSymbol, 200);
  } else {
    setKeyBox(displayKey(key), 'wrong');
    pressTimeEl.textContent = `${time} мс (ошибка)`;
    cycle.events.push({ key, time, isCorrect: false });
  }
}

window.addEventListener('keydown', (e) => {
  if (state === 'IDLE' || state === 'FINISHED') {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
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
        heldModifiers.set(e.key, { time: Date.now() - startTime, combo: alreadyHeld });
      }
      return;
    }

    handlePress(e.key, Date.now() - startTime);
  }
});

window.addEventListener('keyup', (e) => {
  if (state !== 'TASK' || !(e.key in MODIFIER_FLAGS)) return;
  const held = heldModifiers.get(e.key);
  if (!held) return;
  heldModifiers.delete(e.key);
  // Одиночное нажатие модификатора засчитываем, комбинацию — пропускаем
  if (!held.combo) handlePress(e.key, held.time);
});

// Потеря фокуса окна (Alt+Tab, меню «Пуск» по Win): keyup мы можем не получить.
// Клавиша Win, нажатая одна, открывает «Пуск» и уводит фокус — засчитываем её сразу.
// Остальные модификаторы при потере фокуса — это, как правило, комбинация, их пропускаем.
window.addEventListener('blur', () => {
  if (state === 'TASK') {
    const meta = heldModifiers.get('Meta');
    if (meta && !meta.combo) handlePress('Meta', meta.time);
  }
  heldModifiers.clear();
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
// Сначала переносим в форму настройки, сохранённые в localStorage (если они
// есть), затем приводим DOM в согласованное состояние (браузер мог восстановить
// свои собственные значения формы поверх них) и только потом читаем настройки
// и обновляем интерфейс.
const storedSettings = loadStoredSettings();
if (storedSettings) applySettingsToDom(storedSettings);
validateCheckboxes();
updateSettingsDisplay();
appliedSettings = readSettingsFromDom();
runSettings = appliedSettings;
updateStartPrompt();
updateSequenceVisibility();
