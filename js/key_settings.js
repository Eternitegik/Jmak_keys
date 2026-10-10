// ==================== СТРАНИЦА «ВИД КЛАВИАТУРЫ» ====================
// Тип клавиатуры, форма сплита и запись своей раскладки («запоминание»). Настройки
// сохраняются в localStorage сразу при изменении (JmakKeyboard.saveConfig, ключ
// 'jmak-keyboard'), тренажёр читает их при открытии. Предпросмотр рисует ту же модель,
// что и тренажёр (keyboard.js).
//
// Запоминание: подсвечиваем позицию на схеме, пользователь жмёт свою клавишу, и мы
// записываем её KeyboardEvent.code (+ был ли Shift). Подписи потом выводятся из кода,
// поэтому раскладка ОС при записи не важна. Браузер не видит, какой слой включён, и не
// получает событий от клавиш, которые ничего не отправляют (переключатели слоёв,
// пустые) — такие клавиши отмечаются кнопками «Это клавиша слоя…» и «Пусто».
(function () {
  'use strict';

  // Пресеты популярных сплитов — приблизительно: число столбцов, рядов и клавиш под
  // большой палец, а не точная геометрия
  const PRESETS = {
    corne: { stagger: 'moderate', half: { cols: 6, rows: 3, thumbs: 3 } },
    sweep: { stagger: 'strong', half: { cols: 5, rows: 3, thumbs: 2 } },
    iris: { stagger: 'moderate', half: { cols: 6, rows: 4, thumbs: 4 } },
    lily58: { stagger: 'moderate', half: { cols: 6, rows: 4, thumbs: 5 } }
  };

  const HALF_FIELDS = ['cols', 'rows', 'thumbs'];
  const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta'];
  // Служебные события, которые не являются нажатием клавиши (мёртвые клавиши, IME, AltGr)
  const IGNORED_KEYS = ['Dead', 'Process', 'Unidentified', 'AltGraph'];

  const $ = id => document.getElementById(id);
  const typeRadios = document.querySelectorAll('input[name="kbType"]');
  const sliders = document.querySelectorAll('input[type="range"][data-label]');
  const splitBlock = $('splitBlock');
  const presetSelect = $('preset');
  const staggerSelect = $('stagger');
  const sameHalves = $('sameHalves');
  const separateSymbols = $('separateSymbols');
  const rightCard = $('rightCard');
  const showFingers = $('showFingers');
  const preview = $('preview');
  const previewTitle = $('previewTitle');
  const splitNote = $('splitNote');
  const saveNote = $('saveNote');
  const storageWarning = $('storageWarning');
  const storageWarningClose = $('storageWarningClose');
  const layerTabs = $('layerTabs');
  const layoutTools = $('layoutTools');
  const learnBtn = $('learnBtn');
  const addLayerBtn = $('addLayerBtn');
  const renameLayerBtn = $('renameLayerBtn');
  const removeLayerBtn = $('removeLayerBtn');
  const resetLayoutBtn = $('resetLayoutBtn');
  const wizard = $('wizard');
  const wizardTitle = $('wizardTitle');
  const wizardText = $('wizardText');
  const wizardLast = $('wizardLast');
  const wzBack = $('wzBack');
  const wzEmpty = $('wzEmpty');
  const wzSame = $('wzSame');
  const wzLayer = $('wzLayer');
  const wzDone = $('wzDone');
  const exportBtn = $('exportBtn');
  const importBtn = $('importBtn');
  const importFile = $('importFile');
  const backupStatus = $('backupStatus');

  // Строка интерфейса на выбранном языке (js/i18n.js, переводы — в папке localization)
  const t = JmakI18n.t;

  // ---------- Состояние ----------
  let config = JmakKeyboard.loadConfig(); // { type, split, keymap } — то, что сохранено
  let selectedLayer = 0;                  // слой, показанный на схеме
  let layout = null;                      // форма последней отрисовки
  // Идёт запись: { mode: 'walk' (все клавиши по очереди) | 'single' (одна клавиша),
  //               layer, order: [pos], index, last: текст о последней записи }
  let capture = null;
  let heldMod = null; // удерживаемый модификатор: { code, key, combo }

  // ---------- Форма ----------
  // Ползунок половины: ('left', 'cols') → #leftCols
  const slider = (side, field) => $(side + field[0].toUpperCase() + field.slice(1));

  // Подписи на клавишах предпросмотра — по набору букв, применённому в тренажёре; без
  // сохранённых настроек — как набор по умолчанию в тренажёре (по языку интерфейса)
  function labelMode() {
    try {
      const s = JSON.parse(localStorage.getItem('jmak-settings'));
      if (s && s.letters === false) return 'en';
      if (s && ['ru', 'en', 'all'].includes(s.letterSet)) return s.letterSet;
    } catch (e) {
      // нет сохранённых настроек тренажёра — подписи по умолчанию
    }
    return JmakI18n.locale() === 'ru' ? 'ru' : 'en';
  }

  function readHalf(side) {
    const half = {};
    HALF_FIELDS.forEach(f => { half[f] = parseInt(slider(side, f).value, 10); });
    return half;
  }

  function writeHalf(side, half) {
    HALF_FIELDS.forEach(f => { slider(side, f).value = String(half[f]); });
  }

  // Тип и форма — из элементов страницы, записанная раскладка — из состояния
  function readForm() {
    const checked = document.querySelector('input[name="kbType"]:checked');
    const same = sameHalves.checked;
    const left = readHalf('left');
    return JmakKeyboard.normalizeConfig({
      type: checked ? checked.value : 'standard',
      split: { same, stagger: staggerSelect.value, left, right: same ? left : readHalf('right') },
      keymap: config.keymap,
      separateSymbols: separateSymbols.checked
    });
  }

  function writeForm(cfg) {
    typeRadios.forEach(r => { r.checked = r.value === cfg.type; });
    staggerSelect.value = cfg.split.stagger;
    sameHalves.checked = cfg.split.same;
    separateSymbols.checked = cfg.separateSymbols;
    writeHalf('left', cfg.split.left);
    writeHalf('right', cfg.split.right);
  }

  // Какой пресет совпадает с формой ('' — своя форма)
  function matchingPreset(split) {
    const equal = (a, b) => HALF_FIELDS.every(f => a[f] === b[f]);
    return Object.keys(PRESETS).find(name => {
      const p = PRESETS[name];
      return split.stagger === p.stagger && equal(split.left, p.half) && equal(split.right, p.half);
    }) || '';
  }

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return; // «Своя форма» — ничего не меняем
    staggerSelect.value = p.stagger;
    sameHalves.checked = true;
    writeHalf('left', p.half);
    writeHalf('right', p.half);
  }

  // ---------- Записанная раскладка ----------
  // У слоя хранится только своё название; пустое — стандартное («Слой 1» на текущем
  // языке, см. JmakKeyboard.layerName)
  const isSplit = () => config.type === 'split';
  const layers = () => (config.keymap ? config.keymap.layers : [{ name: '', keys: {} }]);
  const layerLabel = i => (layers()[i] || {}).name || JmakKeyboard.layerName(i);
  const layerTitle = i => t('keySettings.quoted', { name: layerLabel(i) });

  // Создаёт записанную раскладку и слои до n включительно
  function ensureLayer(n) {
    if (!config.keymap) config.keymap = { layers: [{ name: '', keys: {} }] };
    const list = config.keymap.layers;
    while (list.length <= n) list.push({ name: '', keys: {} });
  }

  function getEntry(layer, pos) {
    const l = layers()[layer];
    return l ? l.keys[pos] : undefined;
  }

  // entry: запись (см. keyboard.js) или null — убрать запись (на слое — «как на основном»)
  function setEntry(layer, pos, entry) {
    ensureLayer(layer);
    const keys = config.keymap.layers[layer].keys;
    if (entry) keys[pos] = entry;
    else delete keys[pos];
  }

  // Удаляет последний слой и ссылки на него из клавиш слоёв
  function removeLastLayer() {
    const list = config.keymap.layers;
    const removed = list.length - 1;
    list.pop();
    list.forEach(l => {
      Object.keys(l.keys).forEach(pos => {
        const e = l.keys[pos];
        if (e.layer !== removed) return;
        if (e.code) delete e.layer;
        else delete l.keys[pos];
      });
    });
  }

  // ---------- Сохранение ----------
  let saveNoteTimer = null;
  function showNote(text, ok) {
    saveNote.textContent = text;
    saveNote.classList.toggle('error', !ok);
    saveNote.classList.add('visible');
    clearTimeout(saveNoteTimer);
    saveNoteTimer = setTimeout(() => saveNote.classList.remove('visible'), 1500);
  }

  function persist() {
    const ok = JmakKeyboard.saveConfig(config);
    showNote(ok ? t('keySettings.saved') : t('keySettings.saveFailed'), ok);
  }

  // Браузер может запретить сайту сохранять данные — тогда изменения не попадут в
  // тренажёр. Предупреждаем полосой под шапкой; крестик скрывает её до перезагрузки
  storageWarning.hidden = JmakKeyboard.storageAvailable();
  storageWarningClose.addEventListener('click', () => {
    storageWarning.hidden = true;
    storageWarningClose.blur();
  });

  // ---------- Отрисовка ----------
  function renderPreview() {
    layout = isSplit()
      ? JmakKeyboard.buildLayout({ type: 'split', split: config.split })
      : JmakKeyboard.buildLayout({ type: 'standard' });
    const keymap = isSplit()
      ? JmakKeyboard.buildKeymap(layout, config.keymap)
      : JmakKeyboard.defaultKeymap(layout);
    const model = JmakKeyboard.createModel(layout, keymap, {
      separateSymbols: isSplit() && config.separateSymbols
    });
    const shownLayer = isSplit() ? selectedLayer : 0;
    const keyMap = JmakKeyboard.render(preview, model, labelMode(), { layer: shownLayer });
    preview.classList.toggle('kb-hands-fingers', showFingers.checked);
    preview.classList.toggle('editable', isSplit());

    // На слое — обвести клавиши основного слоя, которые его включают
    if (shownLayer > 0) {
      const base = keymap.layers[0].keys;
      const switches = Object.keys(base).filter(pos => base[pos].layer === shownLayer);
      JmakKeyboard.toggle(keyMap, switches, 'kb-layer-target', true);
    }
    if (capture) JmakKeyboard.toggle(keyMap, [capture.order[capture.index]], 'kb-current', true);
  }

  function renderTabs() {
    layerTabs.hidden = !isSplit();
    layerTabs.textContent = '';
    layers().forEach((l, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'layer-tab' + (i === selectedLayer ? ' active' : '');
      tab.textContent = layerLabel(i);
      tab.addEventListener('click', () => {
        stopCapture();
        selectedLayer = i;
        refresh();
        tab.blur();
      });
      layerTabs.appendChild(tab);
    });
  }

  function syncTools() {
    const split = isSplit();
    previewTitle.textContent = split ? t('keySettings.preview.titleSplit') : t('keySettings.preview.title');
    splitNote.hidden = !split;
    layoutTools.hidden = !split || !!capture;
    const count = layers().length;
    learnBtn.textContent = t('keySettings.layout.learn', { layer: layerTitle(selectedLayer) });
    addLayerBtn.disabled = count >= JmakKeyboard.MAX_LAYERS;
    renameLayerBtn.disabled = selectedLayer === 0;
    removeLayerBtn.disabled = selectedLayer === 0 || selectedLayer !== count - 1;
    resetLayoutBtn.disabled = !config.keymap;
  }

  function describe(key) {
    if (key === ' ') return t('common.space');
    const label = JmakKeyboard.keyLabel(key) || key;
    return label.length === 1 ? label.toUpperCase() : label;
  }

  function syncWizard() {
    wizard.hidden = !capture;
    if (!capture) return;
    const onBase = capture.layer === 0;
    wizardTitle.textContent = capture.mode === 'walk'
      ? t('keySettings.wizard.titleWalk', {
        layer: layerTitle(capture.layer), index: capture.index + 1, total: capture.order.length
      })
      : t('keySettings.wizard.titleSingle', { layer: layerTitle(capture.layer) });
    wizardText.textContent = onBase ? t('keySettings.wizard.textBase') : t('keySettings.wizard.textLayer');
    wizardLast.textContent = capture.last;
    wzBack.disabled = capture.mode !== 'walk' || capture.index === 0;
    // «Как на основном» имеет смысл только на остальных слоях
    wzSame.hidden = onBase;

    // «Это клавиша слоя…»: существующие слои (кроме текущего) и следующий новый
    wzLayer.textContent = '';
    const option = (value, text) => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      wzLayer.appendChild(o);
    };
    option('', t('keySettings.wizard.layerSelect'));
    const count = layers().length;
    for (let n = 1; n < count; n++) {
      if (n !== capture.layer) option(String(n), layerLabel(n));
    }
    if (count < JmakKeyboard.MAX_LAYERS) {
      option(String(count), t('keySettings.wizard.newLayer', { layer: JmakKeyboard.layerName(count) }));
    }
  }

  // Полное обновление страницы по состоянию
  function refresh() {
    syncUi();
    renderTabs();
    syncTools();
    syncWizard();
    renderPreview();
  }

  // Блоки сплита, правая половина (при «одинаковых» — копия левой, ползунки неактивны),
  // подписи ползунков и пресет, который совпадает с формой
  function syncUi() {
    splitBlock.hidden = !isSplit();
    writeHalf('right', config.split.right);
    rightCard.classList.toggle('disabled', config.split.same);
    HALF_FIELDS.forEach(f => { slider('right', f).disabled = config.split.same; });
    sliders.forEach(s => { $(s.dataset.label).textContent = s.value; });
    presetSelect.value = matchingPreset(config.split);
  }

  // ---------- Запись ----------
  function startCapture(mode, order) {
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    heldMod = null;
    capture = { mode, layer: selectedLayer, order, index: 0, last: '' };
    refresh();
  }

  function stopCapture() {
    capture = null;
    heldMod = null;
  }

  // Записать текущую позицию и перейти к следующей
  function commit(entry, lastText) {
    setEntry(capture.layer, capture.order[capture.index], entry);
    persist();
    capture.last = t('keySettings.wizard.recorded', { what: lastText });
    if (capture.mode === 'single' || capture.index >= capture.order.length - 1) {
      const finishedWalk = capture.mode === 'walk';
      const title = layerTitle(capture.layer);
      stopCapture();
      refresh();
      if (finishedWalk) showNote(t('keySettings.layout.recorded', { layer: title }), true);
      return;
    }
    capture.index++;
    refresh();
  }

  window.addEventListener('keydown', e => {
    if (!capture) return;
    e.preventDefault(); // Tab, F5, Пробел и т.п. не должны делать своё обычное действие
    if (e.repeat) return;
    if (MODIFIER_KEYS.includes(e.key)) {
      // Одиночный модификатор записываем при отпускании, в комбинации — пропускаем
      if (heldMod) heldMod.combo = true;
      else heldMod = { code: e.code, key: e.key, combo: false };
      return;
    }
    if (heldMod) heldMod.combo = true;
    if (IGNORED_KEYS.includes(e.key) || !e.code) return;
    // Если прошивка шлёт символ с Shift (например, «!» = Shift+1), Shift придёт вместе с ним
    commit({ code: e.code, shift: e.shiftKey, key: e.key }, describe(e.key));
  });

  window.addEventListener('keyup', e => {
    if (!capture) return;
    e.preventDefault(); // иначе Пробел «нажмёт» кнопку с фокусом
    if (!heldMod || e.code !== heldMod.code) return;
    const held = heldMod;
    heldMod = null;
    if (!held.combo) commit({ code: held.code, shift: false, key: held.key }, describe(held.key));
  });

  // Одиночная клавиша Win открывает «Пуск» и уводит фокус — keyup не придёт
  window.addEventListener('blur', () => {
    const held = heldMod;
    heldMod = null;
    if (capture && held && held.key === 'Meta' && !held.combo) {
      commit({ code: held.code, shift: false, key: held.key }, describe(held.key));
    }
  });

  // ---------- Обработчики ----------
  // Любое изменение формы: прервать запись, сохранить, обновить интерфейс и предпросмотр
  function update() {
    stopCapture();
    config = readForm();
    persist();
    refresh();
  }

  typeRadios.forEach(r => r.addEventListener('change', update));
  [staggerSelect, sameHalves, separateSymbols].forEach(el => el.addEventListener('change', update));
  sliders.forEach(s => s.addEventListener('input', update));
  presetSelect.addEventListener('change', () => { applyPreset(presetSelect.value); update(); });
  showFingers.addEventListener('change', renderPreview);

  learnBtn.addEventListener('click', () => startCapture('walk', JmakKeyboard.learningOrder(layout)));

  addLayerBtn.addEventListener('click', () => {
    ensureLayer(layers().length);
    selectedLayer = config.keymap.layers.length - 1;
    persist();
    refresh();
  });

  // Название слоя видно на вкладках и в подсказке тренажёра «Жми (Символы)». Пустое
  // название — стандартное
  renameLayerBtn.addEventListener('click', () => {
    const layer = config.keymap && config.keymap.layers[selectedLayer];
    if (!layer || selectedLayer === 0) return;
    const name = prompt(t('keySettings.layout.renamePrompt'), layerLabel(selectedLayer));
    if (name === null) return;
    layer.name = name.trim().slice(0, 20);
    persist();
    refresh();
  });

  removeLayerBtn.addEventListener('click', () => {
    if (!confirm(t('keySettings.layout.removeConfirm', { layer: layerTitle(selectedLayer) }))) return;
    removeLastLayer();
    selectedLayer = config.keymap.layers.length - 1;
    persist();
    refresh();
  });

  resetLayoutBtn.addEventListener('click', () => {
    if (!confirm(t('keySettings.layout.resetConfirm'))) return;
    config.keymap = null;
    selectedLayer = 0;
    persist();
    refresh();
  });

  // Клик по клавише схемы: во время обхода — перейти к ней, иначе записать только её
  preview.addEventListener('click', e => {
    const keyEl = e.target.closest('.kb-key');
    if (!keyEl || !isSplit()) return;
    const pos = keyEl.dataset.pos;
    if (capture && capture.mode === 'walk') {
      const i = capture.order.indexOf(pos);
      if (i >= 0) {
        capture.index = i;
        capture.last = '';
        refresh();
      }
    } else {
      startCapture('single', [pos]);
    }
  });

  wzBack.addEventListener('click', () => {
    if (capture && capture.index > 0) {
      capture.index--;
      capture.last = '';
      refresh();
    }
    wzBack.blur();
  });

  // «Пусто» — клавиша ничем не занята (на слое — не повторяет основной слой)
  wzEmpty.addEventListener('click', () => {
    if (capture) commit({ empty: true }, t('keySettings.wizard.empty'));
    wzEmpty.blur();
  });

  // «Как на основном» — убрать запись слоя: клавиша работает как на основном слое
  wzSame.addEventListener('click', () => {
    if (capture && capture.layer > 0) commit(null, t('keySettings.wizard.same'));
    wzSame.blur();
  });

  // «Это клавиша слоя N»: то, что клавиша печатает на этом слое, сохраняется —
  // так записывается tap-hold клавиша (нажатие — символ, удержание — слой)
  wzLayer.addEventListener('change', () => {
    const n = parseInt(wzLayer.value, 10);
    wzLayer.blur();
    if (!capture || !Number.isInteger(n)) return;
    ensureLayer(n);
    const existing = getEntry(capture.layer, capture.order[capture.index]);
    const entry = existing && existing.code
      ? { code: existing.code, shift: existing.shift, key: existing.key, layer: n }
      : { layer: n };
    commit(entry, t('keySettings.wizard.layerKey', { layer: layerTitle(n) }));
  });

  wzDone.addEventListener('click', () => {
    stopCapture();
    refresh();
  });

  // ---------- Резервная копия ----------
  // Файл: { app: 'jmak-keys', version, exported, keyboard, settings, theme, language } —
  // вид клавиатуры с раскладкой и слоями, применённые настройки тренажёра, тема и язык
  // интерфейса (код перевода; в файлах старых версий его нет)
  const BACKUP_APP = 'jmak-keys';
  const BACKUP_VERSION = 1;
  const SETTINGS_KEY = 'jmak-settings'; // настройки тренажёра (script.js)
  const THEME_KEY = 'jmak-theme';

  function setBackupStatus(text, ok) {
    backupStatus.textContent = text;
    backupStatus.classList.toggle('ok', ok);
    backupStatus.classList.toggle('error', !ok);
  }

  function readStored(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function exportBackup() {
    let settings = null;
    try {
      settings = JSON.parse(readStored(SETTINGS_KEY));
    } catch (e) {
      // повреждённые настройки тренажёра в файл не кладём
    }
    const theme = readStored(THEME_KEY);
    const data = {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exported: new Date().toISOString(),
      keyboard: JmakKeyboard.normalizeConfig(config),
      settings: settings && typeof settings === 'object' ? settings : null,
      theme: theme === 'light' || theme === 'dark' ? theme : null,
      language: JmakI18n.language()
    };
    const fileName = `jmak-keys-${data.exported.slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupStatus(t('keySettings.backup.exported', { file: fileName }), true);
  }

  function importBackup(text) {
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // ниже — общее сообщение
    }
    if (!data || data.app !== BACKUP_APP || !data.keyboard || typeof data.keyboard !== 'object') {
      setBackupStatus(t('keySettings.backup.notBackup'), false);
      return;
    }
    if (!confirm(t('keySettings.backup.importConfirm'))) return;

    stopCapture();
    config = JmakKeyboard.normalizeConfig(data.keyboard);
    let ok = JmakKeyboard.saveConfig(config);
    try {
      // Поля настроек тренажёра проверяет сам тренажёр при загрузке (loadStoredSettings)
      if (data.settings && typeof data.settings === 'object') {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      }
      if (data.theme === 'light' || data.theme === 'dark') {
        localStorage.setItem(THEME_KEY, data.theme);
        if (data.theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
      }
    } catch (e) {
      ok = false;
    }
    // Язык — если такой перевод есть; разметку переводит setLanguage, остальное — refresh
    if (typeof data.language === 'string') JmakI18n.setLanguage(data.language);
    selectedLayer = 0;
    writeForm(config);
    refresh();
    setBackupStatus(ok ? t('keySettings.backup.imported') : t('keySettings.backup.importSaveFailed'), ok);
  }

  exportBtn.addEventListener('click', () => {
    exportBackup();
    exportBtn.blur();
  });

  importBtn.addEventListener('click', () => {
    importFile.click();
    importBtn.blur();
  });

  importFile.addEventListener('change', () => {
    const file = importFile.files && importFile.files[0];
    importFile.value = ''; // чтобы тот же файл можно было выбрать снова
    if (!file) return;
    file.text()
      .then(importBackup)
      .catch(() => setBackupStatus(t('keySettings.backup.readFailed'), false));
  });

  // Начальное состояние — из сохранённых настроек. Браузер (например, Firefox) может
  // восстановить значения формы после перезагрузки, поэтому форму заполняем явно.
  writeForm(config);
  refresh();
})();
