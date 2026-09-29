// ==================== СТРАНИЦА «ВИД КЛАВИАТУРЫ» (макет) ====================
// Пока только интерфейс: выбор типа клавиатуры и подписи ползунков.
// Сохранение появится позже — в localStorage под ключом 'jmak-keyboard' в виде
//   { type: 'standard' | 'split', split: { left: { cols, rows }, right: { cols, rows } } }
// Главная страница будет передавать эти настройки в JmakKeyboard.buildLayout (keyboard.js).
(function () {
  'use strict';

  const splitBlock = document.getElementById('splitBlock');
  const typeRadios = document.querySelectorAll('input[name="kbType"]');
  const sliders = document.querySelectorAll('input[type="range"][data-label]');

  // Настройки половин показываем только для сплит-клавиатуры
  function syncType() {
    const checked = document.querySelector('input[name="kbType"]:checked');
    splitBlock.hidden = !checked || checked.value !== 'split';
  }

  function syncSliderLabel(slider) {
    document.getElementById(slider.dataset.label).textContent = slider.value;
  }

  typeRadios.forEach(r => r.addEventListener('change', syncType));
  sliders.forEach(s => s.addEventListener('input', () => syncSliderLabel(s)));

  // Браузер (например, Firefox) может восстановить состояние формы после
  // перезагрузки — сразу приводим интерфейс в соответствие с ним
  syncType();
  sliders.forEach(syncSliderLabel);
})();
