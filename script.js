// ==================== СОСТОЯНИЕ ====================
let state = 'IDLE';
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
let symbolPool = [];
let currentStartKey = ' ';
let countdownInterval = null;
let countdownValue = 5;
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

function getLetterPool(letterSet) {
  const ru = 'йцукенгшщзхъфывапролджэячсмитьбю'.split('');
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

// Полный пул всех символов (для обратной совместимости)
function getSymbolPool(settings) {
  return getCategoryPools(settings).flat();
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
  appliedSettings = {
    letters: cbLetters.checked,
    letterSet: document.querySelector('input[name="letterSet"]:checked').value,
    special: cbSpecial.checked,
    digits: cbDigits.checked,
    fkeys: cbFkeys.checked,
    control: cbControl.checked,
    showSequence: cbShowSeq.checked,
    cycles: parseInt(cyclesSlider.value),
    repeats: parseInt(repeatsSlider.value)
  };
  symbolPool = getSymbolPool(appliedSettings);
  updateSettingsView();
  updateSequenceVisibility();
  clearSettingsChanged();
});

// ==================== ПОСТРОЕНИЕ ПОСЛЕДОВАТЕЛЬНОСТИ ====================
// Гарантирует по одному символу из каждой включённой категории
// и отсутствие двух одинаковых символов подряд между циклами.
function buildCycleSequence() {
  const N = appliedSettings.cycles;
  const pools = getCategoryPools(appliedSettings);

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

  // Финальная правка: устраняем возможные совпадения, оставшиеся от
  // заранее размещённых «обязательных» символов.
  for (let i = 1; i < N; i++) {
    if (result[i] === result[i - 1]) {
      for (let j = i + 1; j < N; j++) {
        const leftOk = result[j] !== result[i - 1];
        const rightOk = (j === N - 1) || (result[j] !== result[j + 1]);
        if (leftOk && rightOk) {
          [result[i], result[j]] = [result[j], result[i]];
          break;
        }
      }
    }
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

function beginCountdown() {
  resultsEl.innerHTML = '';
  sequenceEl.innerHTML = '';
  progressEl.textContent = '';
  pressTimeEl.textContent = '';
  keyBoxEl.textContent = '—';
  keyBoxEl.className = 'key-box idle';

  state = 'COUNTDOWN';
  countdownValue = 5;
  statusEl.textContent = countdownValue;

  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdownValue--;
    if (countdownValue > 0) {
      statusEl.textContent = countdownValue;
    } else {
      clearInterval(countdownInterval);
      startTask();
    }
  }, 1000);
}

function startTask() {
  state = 'TASK';

  // Строим по циклам (по одному символу на цикл)
  const cyclesSymbols = buildCycleSequence();

  // Разворачиваем в последовательность нажатий с учётом повторов
  sequence = [];
  for (const sym of cyclesSymbols) {
    for (let j = 0; j < appliedSettings.repeats; j++) {
      sequence.push(sym);
    }
  }

  taskEvents = cyclesSymbols.map(sym => ({ target: sym, events: [] }));

  currentIndex = 0;
  renderSequence();
  nextSymbol();
}

function renderSequence() {
  sequenceEl.innerHTML = '';
  chipElements = [];
  if (!appliedSettings.showSequence) return;
  sequence.forEach((sym, i) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = sym;
    if (i === currentIndex) chip.classList.add('current');
    sequenceEl.appendChild(chip);
    chipElements.push(chip);
  });
}

function nextSymbol() {
  if (currentIndex >= sequence.length) {
    finishTask();
    return;
  }
  currentSymbol = sequence[currentIndex];
  startTime = Date.now();
  statusEl.textContent = `Жми ${currentSymbol}`;
  keyBoxEl.textContent = currentSymbol;
  keyBoxEl.className = 'key-box';
  pressTimeEl.textContent = '';

  if (appliedSettings.showSequence) {
    chipElements.forEach((chip, i) => {
      chip.classList.remove('current');
      if (i === currentIndex) chip.classList.add('current');
    });
  }

  const cycle = Math.floor(currentIndex / appliedSettings.repeats) + 1;
  const repeat = (currentIndex % appliedSettings.repeats) + 1;
  progressEl.textContent = `Цикл ${cycle}/${appliedSettings.cycles}, повтор ${repeat}/${appliedSettings.repeats}`;
}

function finishTask() {
  state = 'FINISHED';
  statusEl.textContent = 'Задание выполнено!';
  keyBoxEl.textContent = '—';
  keyBoxEl.className = 'key-box idle';
  pressTimeEl.textContent = '';
  progressEl.textContent = '';
  renderResults();
  currentStartKey = Math.random() < 0.5 ? ' ' : 'Enter';
  requestAnimationFrame(() => {
    jmyakPanel.scrollTop = jmyakPanel.scrollHeight;
  });
  setTimeout(() => {
    updateStartPrompt();
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
      return `<span class="${cls}">${e.key} (${e.time} мс)</span>`;
    }).join(', ');
    html += `<tr>
      <td>${idx + 1}</td>
      <td>${item.target}</td>
      <td>${pressesHtml || '—'}</td>
      <td>${errors}</td>
      <td>${avgTime}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  resultsEl.innerHTML = html;
}

// ==================== ОБРАБОТКА КЛАВИШ ====================
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;

  if (state === 'IDLE' || state === 'FINISHED') {
    if (e.key === currentStartKey) {
      e.preventDefault();
      beginCountdown();
    }
  } else if (state === 'TASK') {
    e.preventDefault();
    const time = Date.now() - startTime;
    const cycleIdx = Math.floor(currentIndex / appliedSettings.repeats);

    if (e.key === currentSymbol) {
      keyBoxEl.textContent = currentSymbol;
      keyBoxEl.className = 'key-box correct';
      pressTimeEl.textContent = `${time} мс`;
      taskEvents[cycleIdx].events.push({ key: e.key, time, isCorrect: true });

      if (appliedSettings.showSequence && chipElements[currentIndex]) {
        chipElements[currentIndex].classList.remove('current');
        chipElements[currentIndex].classList.add('correct');
      }

      currentIndex++;
      setTimeout(() => {
        nextSymbol();
      }, 200);
    } else {
      keyBoxEl.textContent = e.key;
      keyBoxEl.className = 'key-box wrong';
      pressTimeEl.textContent = `${time} мс (ошибка)`;
      taskEvents[cycleIdx].events.push({ key: e.key, time, isCorrect: false });
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
  }
}, { passive: false });

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
validateCheckboxes();
updateSettingsDisplay();
updateSettingsView();
updateStartPrompt();
updateSequenceVisibility();

appliedSettings = {
  letters: cbLetters.checked,
  letterSet: document.querySelector('input[name="letterSet"]:checked').value,
  special: cbSpecial.checked,
  digits: cbDigits.checked,
  fkeys: cbFkeys.checked,
  control: cbControl.checked,
  showSequence: cbShowSeq.checked,
  cycles: parseInt(cyclesSlider.value),
  repeats: parseInt(repeatsSlider.value)
};
symbolPool = getSymbolPool(appliedSettings);