// ==================== СТРАНИЦА «РЕКОРДЫ» ====================
// Таблица скорости нажатия по символам (хранилище — records_store.js) и сохранение
// таблицы в файл / загрузка из файла. Тренажёр дописывает результаты после каждого
// завершённого задания; если он открыт в соседней вкладке, таблица обновляется сама.
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const recordsTable = $('recordsTable');
  const recordsBody = $('recordsBody');
  const recordsEmpty = $('recordsEmpty');
  const recordsActions = $('recordsActions');
  const resetBtn = $('resetBtn');
  const storageWarning = $('storageWarning');
  const storageWarningClose = $('storageWarningClose');
  const exportBtn = $('exportBtn');
  const importBtn = $('importBtn');
  const importFile = $('importFile');
  const backupStatus = $('backupStatus');

  // Строка интерфейса на выбранном языке (js/i18n.js, переводы — в папке localization)
  const t = JmakI18n.t;

  // Имя символа — как в тренажёре: Ctrl, Win, PgDn, ↑…; у пробела подписи нет — «Пробел»
  function describe(key) {
    if (key === ' ') return t('common.space');
    const label = JmakKeyboard.keyLabel(key) || key;
    return label.length === 1 ? label.toUpperCase() : label;
  }

  const timeCell = value => (value === null ? '—' : String(value));

  function cell(text, cls) {
    const td = document.createElement('td');
    td.textContent = text;
    if (cls) td.className = cls;
    return td;
  }

  function render() {
    const items = JmakRecords.load();
    recordsTable.hidden = items.length === 0;
    recordsEmpty.hidden = items.length > 0;
    recordsActions.hidden = items.length === 0; // сбрасывать нечего
    recordsBody.textContent = '';
    items.forEach(item => {
      // Текущий результат — зелёный, если быстрее предыдущего, красный — если медленнее
      const trend = item.prev === null || item.current === item.prev ? ''
        : item.current < item.prev ? 'record-faster' : 'record-slower';
      const tr = document.createElement('tr');
      tr.append(
        cell(describe(item.key)),
        cell(timeCell(item.prev)),
        cell(timeCell(item.current), trend),
        cell(timeCell(item.best), 'record-best')
      );
      recordsBody.appendChild(tr);
    });
  }

  // Браузер может запретить сайту сохранять данные — тогда тренажёр не запишет рекорды.
  // Предупреждаем полосой под шапкой; крестик скрывает её до перезагрузки
  storageWarning.hidden = JmakKeyboard.storageAvailable();
  storageWarningClose.addEventListener('click', () => {
    storageWarning.hidden = true;
    storageWarningClose.blur();
  });

  // Задание завершили в соседней вкладке или вернулись на страницу кнопкой «Назад»
  window.addEventListener('storage', e => { if (e.key === JmakRecords.STORAGE_KEY) render(); });
  window.addEventListener('pageshow', e => { if (e.persisted) render(); });

  // ---------- Сброс ----------
  // Удаляет всю таблицу — только после подтверждения
  resetBtn.addEventListener('click', () => {
    resetBtn.blur();
    if (!confirm(t('records.resetConfirm'))) return;
    JmakRecords.save([]);
    render();
  });

  // ---------- Сохранение и загрузка ----------
  // Файл: { app: 'jmak-keys', kind: 'records', version, exported, records: [...] }
  const FILE_APP = 'jmak-keys';
  const FILE_KIND = 'records';
  const FILE_VERSION = 1;

  function setBackupStatus(text, ok) {
    backupStatus.textContent = text;
    backupStatus.classList.toggle('ok', ok);
    backupStatus.classList.toggle('error', !ok);
  }

  function exportRecords() {
    const data = {
      app: FILE_APP,
      kind: FILE_KIND,
      version: FILE_VERSION,
      exported: new Date().toISOString(),
      records: JmakRecords.load()
    };
    const fileName = `jmak-records-${data.exported.slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupStatus(t('records.backup.exported', { file: fileName }), true);
  }

  // Загрузка заменяет таблицу целиком
  function importRecords(text) {
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // ниже — общее сообщение
    }
    if (!data || data.app !== FILE_APP || data.kind !== FILE_KIND || !Array.isArray(data.records)) {
      setBackupStatus(t('records.backup.notRecords'), false);
      return;
    }
    if (!confirm(t('records.backup.importConfirm'))) return;
    const ok = JmakRecords.save(JmakRecords.normalize(data.records));
    render();
    setBackupStatus(ok ? t('records.backup.imported') : t('records.backup.importSaveFailed'), ok);
  }

  exportBtn.addEventListener('click', () => {
    exportRecords();
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
      .then(importRecords)
      .catch(() => setBackupStatus(t('records.backup.readFailed'), false));
  });

  render();
})();
