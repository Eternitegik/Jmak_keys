// ==================== РЕКОРДЫ: ХРАНИЛИЩЕ ====================
// Скорость нажатия каждого символа, который когда-либо был в задании: предыдущий,
// текущий и лучший результат в мс. Тренажёр дописывает сюда итоги завершённого задания
// (script.js), страница «Рекорды» показывает таблицу и сохраняет/загружает её файлом
// (records.js).
//
// Результат символа за задание — среднее время его верных нажатий. Новый результат
// сдвигает текущий в предыдущий, лучший — наименьший из всех. Строки не удаляются,
// новые символы дописываются в конец.
//
// В localStorage: { version: 1, items: [{ key, prev, current, best }] }. Массив, а не
// объект по символам: у ключей-цифр ('0'…'9') объект не сохраняет порядок добавления.
const JmakRecords = (function () {
  'use strict';

  const STORAGE_KEY = 'jmak-records';
  const VERSION = 1;
  const MAX_KEY_LENGTH = 20; // самые длинные значения KeyboardEvent.key — 'ArrowRight' и т.п.

  // Время в мс: целое неотрицательное число или null
  function ms(v) {
    return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  }

  // Проверяет записи (из localStorage или из файла): некорректные отбрасываются,
  // повторы символа — тоже (остаётся первая запись)
  function normalize(items) {
    const result = [];
    const seen = new Set();
    (Array.isArray(items) ? items : []).forEach(item => {
      if (!item || typeof item !== 'object') return;
      const key = item.key;
      if (typeof key !== 'string' || !key || key.length > MAX_KEY_LENGTH || seen.has(key)) return;
      const current = ms(item.current);
      const best = ms(item.best);
      if (current === null || best === null) return;
      seen.add(key);
      result.push({ key, prev: ms(item.prev), current, best: Math.min(best, current) });
    });
    return result;
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return normalize(data && data.items);
    } catch (e) {
      return []; // localStorage недоступен или повреждённый JSON
    }
  }

  function save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, items: normalize(items) }));
      return true;
    } catch (e) {
      return false; // localStorage недоступен — рекорды не сохранятся
    }
  }

  // Итоги задания: Map символ → среднее время верных нажатий (мс)
  function addTaskResults(results) {
    const items = load();
    results.forEach((time, key) => {
      const value = ms(time);
      if (value === null) return;
      const item = items.find(i => i.key === key);
      if (item) {
        item.prev = item.current;
        item.current = value;
        item.best = Math.min(item.best, value);
      } else {
        items.push({ key, prev: null, current: value, best: value });
      }
    });
    return save(items);
  }

  return { STORAGE_KEY, normalize, load, save, addTaskResults };
})();
