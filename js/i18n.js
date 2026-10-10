// ==================== ЛОКАЛИЗАЦИЯ ====================
// Переводы интерфейса лежат в localization/loc_<код>.js, список кодов — в
// localization/languages.js. Браузер не может прочитать содержимое папки (ни с диска, ни
// на GitHub Pages), поэтому языки перечислены явно. Переводы — обычные скрипты, а не
// JSON: страницу, открытую через file://, браузер не пускает загружать соседние файлы
// через fetch.
//
// Порядок загрузки (в <head> обеих страниц): этот файл → languages.js, который вызывает
// JmakI18n.load(['rus', 'eng', …]) → load() через document.write вставляет скрипты
// переводов. Вставленные так скрипты грузятся синхронно и по порядку, до скриптов
// страницы: когда выполняются keyboard.js и script.js, все словари уже на месте.
//
// Файл перевода: JmakI18n.register({ meta: { name, browser }, … }) — объект в формате
// JSON; код языка берётся из имени файла (loc_eng.js → eng). meta.name — название в
// списке выбора языка, meta.browser — коды языка браузера без региона ('ru', 'en'), для
// которых подходит этот перевод. Остальное — дерево строк, ключ — путь через точки:
// t('trainer.status.ready'). В строках бывают подстановки {name}.
//
// Разметка переводится по атрибутам: data-i18n="ключ" — текст элемента, data-i18n-html —
// текст с разметкой (<b>, <code>) из своих файлов перевода, data-i18n-attr="атрибут:ключ"
// (несколько — через «;»).
const JmakI18n = (function () {
  'use strict';

  const STORAGE_KEY = 'jmak-lang';
  // Язык, если для языка браузера нет перевода; из него же берутся строки, которых нет
  // в выбранном переводе
  const FALLBACK = 'eng';
  const DIR = 'localization/';

  const codes = [];               // коды из languages.js в порядке списка
  const dictionaries = new Map(); // код → данные файла перевода
  let current = null;             // текущий язык; выбирается при первом обращении

  // languages.js: подключить файлы переводов (только во время разбора страницы)
  function load(list) {
    (Array.isArray(list) ? list : []).forEach(code => {
      if (typeof code !== 'string' || !/^[a-z0-9_-]+$/i.test(code) || codes.includes(code)) return;
      codes.push(code);
      document.write(`<script src="${DIR}loc_${code}.js"><\/script>`);
    });
  }

  // Файл перевода: код — из имени выполняющегося файла, а не из его содержимого, поэтому
  // копия loc_eng.js под новым именем не перезапишет английский
  function register(data) {
    const script = document.currentScript;
    const match = script && /loc_([a-z0-9_-]+)\.js(?:[?#].*)?$/i.exec(script.src);
    if (!match || !data || typeof data !== 'object') return;
    dictionaries.set(match[1], data);
  }

  // Загруженные языки в порядке languages.js; файла, которого нет (404), в списке нет
  const loaded = () => codes.filter(code => dictionaries.has(code));

  function meta(code) {
    const m = (dictionaries.get(code) || {}).meta;
    return m && typeof m === 'object' ? m : {};
  }

  const browserCodes = code => [].concat(meta(code).browser || []).filter(c => typeof c === 'string');

  function storedLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null; // localStorage недоступен
    }
  }

  // Какой язык выбрать: сохранённый, если такой перевод есть, иначе первый язык браузера
  // (navigator.languages, 'ru-RU' → 'ru'), для которого есть перевод, иначе FALLBACK
  function preferredLanguage() {
    const list = loaded();
    const saved = storedLanguage();
    if (saved && list.includes(saved)) return saved;
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const tag of prefs) {
      const primary = String(tag || '').toLowerCase().split('-')[0];
      const code = list.find(c => browserCodes(c).includes(primary));
      if (code) return code;
    }
    return list.includes(FALLBACK) ? FALLBACK : list[0] || null;
  }

  function language() {
    if (current === null || !dictionaries.has(current)) current = preferredLanguage();
    return current;
  }

  // Код языка для <html lang> и для выбора набора букв по умолчанию ('ru', 'en'…)
  function locale() {
    return browserCodes(language())[0] || '';
  }

  // Языки для списка выбора: [{ code, name }]
  function languages() {
    return loaded().map(code => {
      const name = meta(code).name;
      return { code, name: typeof name === 'string' && name ? name : code };
    });
  }

  function lookup(code, key) {
    let node = dictionaries.get(code);
    for (const part of key.split('.')) {
      if (!node || typeof node !== 'object') return undefined;
      node = node[part];
    }
    return typeof node === 'string' ? node : undefined;
  }

  function format(text, params) {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (m, name) =>
      (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m));
  }

  // Строка на текущем языке; если её нет в переводе — из FALLBACK, если нет и там — ключ
  function t(key, params) {
    let text = lookup(language(), key);
    if (text === undefined) text = lookup(FALLBACK, key);
    return format(text === undefined ? key : text, params);
  }

  // Строка на всех загруженных языках — чтобы узнавать стандартные тексты, сохранённые
  // на другом языке (названия слоёв «Слой 1» / «Layer 1»)
  function variants(key, params) {
    return loaded()
      .map(code => lookup(code, key))
      .filter(text => text !== undefined)
      .map(text => format(text, params));
  }

  function translatePage() {
    const lang = locale();
    if (lang) document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  // Сменить язык без перезагрузки: перевести разметку; то, что страница строит из JS,
  // она перерисовывает сама. Выбор запоминается (если хранилище доступно)
  function setLanguage(code) {
    if (!loaded().includes(code)) return false;
    current = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
      // localStorage недоступен — язык сохранится только до закрытия страницы
    }
    translatePage();
    return true;
  }

  return {
    STORAGE_KEY, load, register, languages, language, preferredLanguage, locale,
    t, variants, translatePage, setLanguage
  };
})();
