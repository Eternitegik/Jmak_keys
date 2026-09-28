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
let countdownValue = 5;
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
const settingsViewBody = document.getElementById('settingsViewBody');
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

// ==================== ИНДИКАЦИЯ ИЗМЕНЕНИЙ ====================
function markSettingsChanged() {
  applyBtn.classList.add('changed');
}
function clearSettingsChanged() {
  applyBtn.classList.remove('changed');
}

// ==================== ПУЛЫ ПО КАТЕГОРИЯМ ====================
const SPECIAL_POOL = '!@#$%^&*()_+-=[]{};:"\\|,.<>/?`~'.split('');
const DIGITS_POOL = '0123456789'.split('');
const CONTROL_POOL = ['Shift', 'Control', 'Alt', 'Tab', 'CapsLock', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Meta'];

// Клавиши, которые нужно нажать, чтобы набрать другой символ (Shift+1 → «!»).
// Если они не являются целью, их нажатие не считается ошибкой.
const HELPER_KEYS = ['Shift', 'AltGraph', 'Dead', 'Process', 'Unidentified'];

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

// Возвращает массив пулов для каждой включённой категории
function getCategoryPools(settings) {
  const pools = [];
  if (settings.letters) pools.push(getLetterPool(settings.letterSet));
  if (settings.special) pools.push(SPECIAL_POOL.slice());
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

function updateSettingsView() {
  const s = appliedSettings;
  let html = '';
  html += `Набор символов: ${s.letters ? 'вкл' : 'выкл'}`;
  if (s.letters) html += ` (${s.letterSet === 'ru' ? 'Рус' : s.letterSet === 'en' ? 'Eng' : 'Все'})`;
  html += '<br>';
  html += `Спец. символы: ${s.special ? 'вкл' : 'выкл'}<br>`;
  html += `Цифры: ${s.digits ? 'вкл' : 'выкл'}<br>`;
  html += `F клавиши: ${s.fkeys ? 'вкл' : 'выкл'}<br>`;
  html += `Управляющие клавиши: ${s.control ? 'вкл' : 'выкл'}<br>`;
  html += `Отображение списка букв: ${s.showSequence ? 'вкл' : 'выкл'}<br>`;
  html += `Количество циклов: ${s.cycles}<br>`;
  html += `Количество повторений: ${s.repeats}`;
  settingsViewBody.innerHTML = html;
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
  updateSettingsView();
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
  countdownValue = 5;
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
  statusEl.textContent = `Жми ${displayKey(currentSymbol)}`;
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

    // Автоповтор, ввод во время паузы между символами и «вспомогательные» клавиши игнорируем
    if (e.repeat || inputLocked) return;
    if (HELPER_KEYS.includes(e.key) && e.key !== currentSymbol) return;

    const time = Date.now() - startTime;
    const cycleIdx = Math.floor(currentIndex / runSettings.repeats);
    const cycle = taskEvents[cycleIdx];
    if (!cycle) return;

    if (normalizeKey(e.key) === normalizeKey(currentSymbol)) {
      inputLocked = true;
      setKeyBox(displayKey(currentSymbol), 'correct');
      pressTimeEl.textContent = `${time} мс`;
      cycle.events.push({ key: e.key, time, isCorrect: true });

      if (runSettings.showSequence && chipElements[currentIndex]) {
        chipElements[currentIndex].classList.remove('current');
        chipElements[currentIndex].classList.add('correct');
      }

      currentIndex++;
      nextTimeout = setTimeout(nextSymbol, 200);
    } else {
      setKeyBox(displayKey(e.key), 'wrong');
      pressTimeEl.textContent = `${time} мс (ошибка)`;
      cycle.events.push({ key: e.key, time, isCorrect: false });
    }
  }
});

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
// Сначала приводим DOM в согласованное состояние (браузер мог восстановить
// значения формы), затем читаем настройки и только потом обновляем интерфейс.
validateCheckboxes();
updateSettingsDisplay();
appliedSettings = readSettingsFromDom();
runSettings = appliedSettings;
updateSettingsView();
updateStartPrompt();
updateSequenceVisibility();
