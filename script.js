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
const settingsViewBody = document.getElementById('settingsViewBody'); // <-- изменено
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

// ==================== НАСТРОЙКИ ====================
function getSymbolPool(settings) {
  let pool = [];
  if (settings.letters) {
    const ru = 'йцукенгшщзхъфывапролджэячсмитьбю'.split('');
    const en = 'qwertyuiopasdfghjklzxcvbnm'.split('');
    if (settings.letterSet === 'ru') pool.push(...ru);
    else if (settings.letterSet === 'en') pool.push(...en);
    else if (settings.letterSet === 'all') pool.push(...ru, ...en);
  }
  if (settings.special) pool.push(...'!@#$%^&*()_+-=[]{};:"\\|,.<>/?`~'.split(''));
  if (settings.digits) pool.push(...'0123456789'.split(''));
  if (settings.fkeys) { for (let i = 1; i <= 12; i++) pool.push('F' + i); }
  if (settings.control) pool.push('Shift', 'Control', 'Alt', 'Tab', 'CapsLock', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Meta');
  return pool;
}

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
  settingsViewBody.innerHTML = html; // <-- изменено
}

function updateSequenceVisibility() {
  if (appliedSettings.showSequence) {
    sequenceEl.classList.remove('hidden');
  } else {
    sequenceEl.classList.add('hidden');
  }
}

// Обработчики настроек
cbLetters.addEventListener('change', validateCheckboxes);
cbSpecial.addEventListener('change', validateCheckboxes);
cbDigits.addEventListener('change', validateCheckboxes);
cbFkeys.addEventListener('change', validateCheckboxes);
cbControl.addEventListener('change', validateCheckboxes);

cyclesSlider.addEventListener('input', () => { cyclesVal.textContent = cyclesSlider.value; });
repeatsSlider.addEventListener('input', () => { repeatsVal.textContent = repeatsSlider.value; });

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
});

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

  sequence = [];
  let lastCycleSymbol = null;
  const poolLen = symbolPool.length;
  for (let i = 0; i < appliedSettings.cycles; i++) {
    let sym;
    let attempts = 0;
    do {
      sym = symbolPool[Math.floor(Math.random() * poolLen)];
      attempts++;
    } while (sym === lastCycleSymbol && poolLen > 1 && attempts < 200);
    lastCycleSymbol = sym;
    for (let j = 0; j < appliedSettings.repeats; j++) {
      sequence.push(sym);
    }
  }

  taskEvents = [];
  let idx = 0;
  for (let i = 0; i < appliedSettings.cycles; i++) {
    const targetSym = sequence[idx];
    taskEvents.push({ target: targetSym, events: [] });
    idx += appliedSettings.repeats;
  }

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