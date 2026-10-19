# Jmak_keys

**[English](#english)** · **[Русский](#русский)**

## English

**A trainer for key locations and finger muscle memory.**

An interactive web trainer that helps you learn where the keys are and build muscle memory in your fingers.
It is made first of all for people moving from a regular QWERTY keyboard to a split keyboard: at first your fingers reach for keys in the wrong places, and they need to learn the right movements again.
Speed is secondary — press times are shown so you can see your progress, but what matters most is pressing the right key without looking.
The project is written in plain HTML, CSS and JavaScript, with no third-party libraries or frameworks.

### ✨ Features

- **Flexible character sets**:
  - Russian letters;
  - English letters;
  - digits;
  - special characters (with “Russian” — only those typed in the Russian layout without switching; with “English”, “All” or “Off” — all of them);
  - F keys (F1–F12);
  - control keys (Shift, Ctrl, Alt, arrows, etc.).
- **Difficulty settings**:
  - number of cycles — from 5 to 100;
  - “Full set” — instead of a number of cycles, the task includes every character of the selected sets, each once, in random order;
  - repeats per key — from 1 to 10.
- **On-screen keyboard**:
  - keys from the selected sets are blue, the rest are gray; the highlight changes as soon as you toggle the options, even before “Apply”;
  - key labels follow the selected letter set (Cyrillic, Latin or both);
  - a correct press flashes green, a wrong one flashes red;
  - on a regular keyboard, the Esc and F1–F12 row appears when “F keys” or “Control keys” are on, and the Insert/Home/PgUp/Delete/End/PgDn block with arrows when “Control keys” are on; on a split with five rows, the top row is the F keys, while the other keys (and the F keys of a split without that row) are usually on layers — they are not on the diagram, but presses still count;
  - “Hand guides”: a colored stripe at the bottom of a key shows what to press it with when touch typing — “Split into halves” (purple — left hand, teal — right hand) or “For each finger” (each finger has its own color, thumbs are gray).
- **Memory training**:
  - “Where-to-press hint”: the target key and its finger stripe light up “Immediately”, “If I hesitate” (after 2 seconds) or “Never” (default);
  - “Hide key labels”: the diagram shows only the key shapes and the bumps on F/J — you have to remember where each character is;
  - “Retry mistakes”: a task made of the keys you didn't hit on the first try, 3 times each.
- **Real-time timing**:
  - reaction time is measured for every press (shown below the keyboard).
- **Visual feedback**:
  - a two-line prompt: “Press” on top and the character to press, large, below it;
  - with the “All” letter set, the letter's layout is shown next to “Press” — (Rus) or (Eng), so that look-alike letters such as Cyrillic «с» / Latin «c» or «а» / «a» don't get mixed up;
  - task progress;
  - optional yellow highlight of all the task's keys (the “Show letter list” checkbox).
- **Help and tips**:
  - a collapsible “About and tips” block in the trainer: how a task works, what the colors mean, the settings and split layers;
  - home position: fingers on the home keys A S D F / J K L ; (Ф Ы В А / О Л Д Ж), thumbs on the layer 1 and 2 keys (on a regular keyboard — on the space bar); after a press, the finger goes straight back to its place;
  - raising the difficulty step by step: hint “Immediately” → “If I hesitate” → “Never” → “Hide key labels”.
- **Results at the end**:
  - “Mistakes” — the keys you didn't hit on the first try (or “No mistakes, well done!”), plus a “Retry mistakes” button;
  - “Skipped characters” — the characters skipped with the “Skip” button: usually the ones you forgot to record in your keyboard layout;
  - a collapsed “Detailed results” table: target key, presses, number of mistakes, average press time.
- **Proper handling of key combinations**:
  - Alt, Ctrl, Shift and Win count only as a single press (when released);
  - combinations (Alt+Shift to switch layouts, Shift+1 for “!”, etc.) are skipped and don't count as mistakes.
- **Unsaved changes indicator**:
  - the “Apply” button gets a red outline if the settings were changed but not applied yet.
- **Guaranteed variety**:
  - if several character sets are enabled, each of them appears in the task at least once.
- **Saved settings**:
  - clicking “Apply” saves the settings to the browser's localStorage, and they are restored the next time you open the page;
  - if the browser doesn't let the site store data, both pages show a warning: the trainer works but remembers nothing, and the split from the “Keyboard setup” page doesn't reach the trainer;
  - “Backup” on the “Keyboard setup” page: all settings — keyboard view, recorded layout with layers, trainer settings, theme and language — are saved to a JSON file and loaded from it, for example in another browser or on another computer.
- **Dark and light theme**:
  - a “Dark theme” switch at the bottom of the settings panel; dark by default;
  - the choice is remembered and applies to both pages, with no flash on load.
- **Interface language** — English and Russian:
  - chosen at the bottom of the settings panel and switched instantly, without reloading; by default it follows the browser language (English if there is no translation for it);
  - a new user gets a letter set matching the language: “Russian” for the Russian interface, “English” for the others;
  - more languages can be added with a translation file — see “Localization”.
- **Split keyboards**:
  - on the first visit the trainer asks which keyboard you use: “Classic” keeps the regular keyboard, “Split” opens the “Keyboard setup” page with the split already selected;
  - the “Keyboard setup” page: standard or split keyboard; split shape — columns (5–7), rows (3–5: 4 — with the number row, 5 — with the F1–F12 row too), thumb keys (0–6) and column stagger, per half or the same for both;
  - presets for popular splits (Corne, Ferris Sweep, Iris, Lily58 / Sofle) and a live preview, including finger colors;
  - settings are saved right away, and the trainer draws the split instead of the regular keyboard; by default the letters are placed as on a regular QWERTY, and the fifth row is F1–F12;
  - recording your own layout: the page highlights the keys one by one, you press them on your keyboard, and the trainer remembers what is where (by key code, so the OS layout doesn't matter); layer keys and empty keys are marked with buttons, and a single key can be re-recorded by clicking it on the diagram;
  - layers: tabs above the preview, each layer recorded the same way, custom layer names (“Symbols”, “Numbers”), layer keys labeled “L1”, “L2”… and colored with the layer's color;
  - the “Digits and symbols on different keys” checkbox: if Shift + digit doesn't give a symbol (the symbols are on their own layer), a symbol is shown and highlighted only on its own key, and digit keys have no Shift symbols in their corners;
  - layers in the trainer: tabs above the keyboard, small labels of layers 1 and 2 in the key corners; if a task character is on another layer, the prompt names the layer (“Press (Symbols)”), the keyboard switches to it by itself, and the layer key is outlined.

### 🚀 Quick start

Just open `index.html` in any modern browser.
No installation or build step is needed.

Clone the repository:

    git clone https://github.com/Eternitegik/Jmak_keys.git

Go to the project folder:

    cd Jmak_keys

Open index.html in the browser:

    open index.html      # macOS
    start index.html     # Windows
    xdg-open index.html  # Linux

Or just download the ZIP archive and unpack it.

### 🌐 Live demo

The demo is available at:
**[Jmak_keys Demo](https://eternitegik.github.io/Jmak_keys/)**

### 🛠️ Technologies

- **HTML5** — interface structure.
- **CSS3** — styling (flex layout, color-coded states, CSS variables for the dark and light themes).
- **JavaScript (ES6+)** — all of the trainer's logic: keyboard event handling, statistics, state management; localStorage for settings; a home-grown localization (`js/i18n.js`) without libraries.

### 📖 How to use

1. On the first visit, choose which keyboard you use: **“Classic”** or **“Split”** (this opens the “Keyboard setup” page, where you can set the shape of your split and record your layout). You can get back to it with the **“Keyboard setup →”** link in the settings panel.
2. In the left **“Settings”** panel, pick the character sets you need and adjust the sliders if necessary. At the bottom of the panel are the theme switch and the language selector.
3. Click **“Apply”**. If the settings were changed but not applied, the button gets a red outline.
4. In the right panel, press the key shown in the prompt (Space or Enter).
5. After a countdown (3…2…1), the character to press appears on the screen.
6. Press the right keys. The trainer measures the time and marks mistakes.
7. You can stop the task with the **“Abort”** button. The **“Skip”** button next to it moves on to the next character — for example, if it isn't on your keyboard.
8. When all cycles are done, a “Mistakes” block appears with the keys you didn't hit on the first try, then a “Skipped characters” block (if you skipped any), and below them a collapsed “Detailed results” table (click to expand):
   - the target key;
   - the keys that were pressed (with times);
   - the number of mistakes;
   - the average press time.

### 🌍 Localization

Interface texts live in the `localization` folder: one `loc_<code>.js` file per language and the language list `languages.js`.
A translation file is a JSON object wrapped in a `JmakI18n.register({ … })` call: this way translations load even when `index.html` is opened straight from disk (a browser won't load a plain `.json` file from disk).

To add a language (for example, Chinese):

1. Copy `localization/loc_eng.js` to `localization/loc_chn.js` — the language code comes from the file name.
2. In the `meta` block, set the language name for the selector (`"name": "中文"`) and the browser language codes the translation is for (`"browser": ["zh"]`).
3. Translate the strings. Don't change the keys; keep the markup (`<b>`, `<code>`) and placeholders like `{key}` as they are.
4. Add the code to the list in `localization/languages.js`: `JmakI18n.load(['rus', 'eng', 'chn']);`

The list is needed because a browser can't read which files are in a folder. If a file from the list is missing, the language simply won't appear in the selector; strings missing from a translation are taken from English.

### 📂 Project structure

    Jmak_keys/
    ├── index.html          # Trainer page
    ├── key_settings.html   # Keyboard setup page (standard / split)
    ├── js/
    │   ├── script.js       # Trainer logic
    │   ├── keyboard.js     # On-screen keyboard: model (shape + layout by layers) and rendering, shared by both pages
    │   ├── key_settings.js # Keyboard setup page logic
    │   └── i18n.js         # Localization: loading translations, choosing the language, translating the page
    ├── localization/
    │   ├── languages.js    # Language list
    │   ├── loc_rus.js      # Russian translation
    │   └── loc_eng.js      # English translation
    ├── style/
    │   └── style.css       # Styles for both pages
    ├── .gitignore
    └── README.md           # This file

### 📄 License

This project is licensed under the **MIT** License.
License text:

MIT License

Copyright (c) 2025 Eternitegik

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Русский

**Тренажёр расположения клавиш и мышечной памяти.**

Интерактивный веб-тренажёр, который помогает запомнить расположение клавиш и натренировать мышечную память пальцев.
В первую очередь он задуман для тех, кто переходит с обычной QWERTY-клавиатуры на сплит-клавиатуру: первое время пальцы ищут клавиши не там, и их нужно заново научить правильным движениям.
Скорость нажатия вторична — время показывается, чтобы видеть прогресс, но главное — нажимать правильно, не глядя.
Проект написан на чистом HTML, CSS и JavaScript без использования сторонних библиотек и фреймворков.

### ✨ Возможности

- **Гибкая настройка наборов символов**:
  - буквы русского алфавита;
  - буквы английского алфавита;
  - цифры;
  - специальные символы (при выборе «Рус» — только те, что набираются в русской раскладке без переключения; при «Eng», «Все» или «Откл» — все);
  - F-клавиши (F1–F12);
  - управляющие клавиши (Shift, Ctrl, Alt, стрелки и т.д.).
- **Регулировка сложности**:
  - количество циклов — от 5 до 100;
  - «Весь набор» — вместо количества циклов в задание попадают все символы выбранных наборов, каждый по одному разу в случайном порядке;
  - количество повторений одной клавиши — от 1 до 10.
- **Экранная клавиатура**:
  - клавиши из выбранных наборов подсвечены синим, остальные — серым; подсветка меняется сразу при переключении флажков, ещё до «Применить»;
  - подписи на клавишах следуют выбранному набору букв (кириллица, латиница или обе сразу);
  - верное нажатие вспыхивает зелёным, ошибочное — красным;
  - на обычной клавиатуре ряд Esc и F1–F12 появляется при включённых «F клавишах» или «Управляющих клавишах», блок Insert/Home/PgUp/Delete/End/PgDn со стрелками — при «Управляющих клавишах»; на сплите с пятью рядами верхний ряд — F-клавиши, остальные клавиши (и F-клавиши сплита без этого ряда) обычно на слоях — на схеме их нет, но нажатие засчитывается;
  - «Отображение для рук»: цветная черта внизу клавиши подсказывает, чем её нажимать при слепой печати — «Разделение на половины» (фиолетовая — левая рука, бирюзовая — правая) или «Для каждого пальца» (у каждого пальца свой цвет, большие пальцы — серые).
- **Тренировка памяти**:
  - «Подсказка, где нажимать»: целевая клавиша и черта её пальца подсвечиваются «Сразу», «Если замешкался» (через 2 секунды) или «Никогда» (по умолчанию);
  - «Скрыть подписи клавиш»: на схеме только формы клавиш и засечки — расположение символов нужно помнить;
  - «Повторить ошибки»: задание из клавиш, нажатых не с первого раза, каждая по 3 раза.
- **Режим реального времени**:
  - замер времени реакции для каждого нажатия (показывается под клавиатурой).
- **Визуальная обратная связь**:
  - подсказка в две строки: сверху «Жми», снизу крупно символ, который нужно нажать;
  - при наборе букв «Все» рядом с «Жми» указана раскладка буквы — (Рус) или (Eng), чтобы не путать одинаковые на вид «с»/«c», «а»/«a»;
  - прогресс выполнения задания;
  - опциональная подсветка жёлтым всех клавиш задания (чекбокс «Отображение списка букв»).
- **Справка и советы**:
  - свёрнутый блок «Информация и советы» в тренажёре: как проходит задание, что значат цвета, настройки и слои сплита;
  - исходное положение рук: пальцы на «домашних» клавишах ФЫВА / ОЛДЖ (ASDF / JKL;), большие — на клавишах слоёв 1 и 2 (на обычной клавиатуре — на пробеле), после нажатия палец сразу возвращается на место;
  - порядок усложнения: подсказка «Сразу» → «Если замешкался» → «Никогда» → «Скрыть подписи клавиш».
- **Статистика по завершении**:
  - «Ошибки при нажатии» — клавиши, которые не удалось нажать с первого раза (или «Без ошибок, молодец!»), и кнопка «Повторить ошибки»;
  - «Пропущенные символы» — символы, пропущенные кнопкой «Пропустить»: обычно это те, что забыли записать в раскладку клавиатуры;
  - свёрнутая таблица «Подробные результаты»: целевая клавиша, нажатия, количество ошибок, среднее время нажатия.
- **Корректная работа с комбинациями клавиш**:
  - Alt, Ctrl, Shift и Win засчитываются только как одиночное нажатие (в момент отпускания);
  - комбинации (Alt+Shift для смены раскладки, Shift+1 для «!» и т.п.) пропускаются и не дают ошибок.
- **Индикация несохранённых изменений**:
  - кнопка «Применить» подсвечивается красной обводкой, если настройки были изменены, но ещё не применены.
- **Гарантированное разнообразие**:
  - если включено несколько наборов символов, каждый из них появится в задании хотя бы один раз.
- **Сохранение настроек**:
  - при нажатии «Применить» настройки сохраняются в localStorage браузера и автоматически подставляются при следующем открытии страницы;
  - если браузер не даёт сайту сохранять данные, на обеих страницах показывается предупреждение: тренажёр работает, но ничего не запоминает, а сплит со страницы «Вид клавиатуры» в тренажёр не попадает;
  - «Резервная копия» на странице «Вид клавиатуры»: все настройки — вид клавиатуры, записанная раскладка со слоями, настройки тренажёра, тема и язык — сохраняются в JSON-файл и загружаются из него, например в другом браузере или на другом компьютере.
- **Тёмная и светлая тема**:
  - переключатель «Тёмная тема» внизу панели настроек; по умолчанию — тёмная;
  - выбор запоминается и действует на обеих страницах, без мигания при загрузке.
- **Язык интерфейса** — русский и английский:
  - выбирается внизу панели настроек и меняется сразу, без перезагрузки; по умолчанию — язык браузера (если перевода для него нет — английский);
  - новому пользователю набор букв подбирается по языку: при русском интерфейсе «Рус», при остальных «Eng»;
  - другие языки добавляются файлом перевода — см. раздел «Локализация».
- **Сплит-клавиатуры**:
  - при первом открытии тренажёр спрашивает, какой клавиатурой вы пользуетесь: «Классическая» оставляет обычную клавиатуру, «Сплит» сразу открывает страницу «Вид клавиатуры», где уже выбран сплит;
  - страница «Вид клавиатуры»: стандартная или сплит-клавиатура; форма сплита — столбцы (5–7), ряды (3–5: 4 — с рядом цифр, 5 — ещё и с рядом F1–F12), клавиши под большой палец (0–6) и смещение столбцов, отдельно для каждой половины или одинаково для обеих;
  - пресеты популярных сплитов (Corne, Ferris Sweep, Iris, Lily58 / Sofle) и живой предпросмотр, в том числе с раскраской по пальцам;
  - настройки сохраняются сразу, тренажёр рисует сплит вместо обычной клавиатуры; по умолчанию буквы расставлены как на обычной QWERTY, а пятый ряд — F1–F12;
  - запись своей раскладки: страница по очереди подсвечивает клавиши, вы нажимаете их на своей клавиатуре, и тренажёр запоминает, что где находится (по коду клавиши, поэтому раскладка ОС не важна); клавиши слоёв и пустые клавиши отмечаются кнопками, отдельную клавишу можно перезаписать кликом по схеме;
  - слои: вкладки над предпросмотром, запись каждого слоя тем же способом, свои названия слоёв («Символы», «Цифры»), клавиши слоёв подписаны «L1», «L2»… и окрашены цветом слоя;
  - флажок «Цифры и спецсимволы на разных клавишах»: если Shift + цифра не даёт символ (символы на своём слое), символ показывается и подсвечивается только на своей клавише, а на клавишах цифр нет угловых Shift-символов;
  - слои в тренажёре: вкладки над клавиатурой, мелкие подписи слоёв 1 и 2 в углах клавиш; если символ задания лежит на другом слое, подсказка называет слой («Жми (Символы)»), клавиатура сама переключается на него, а клавиша слоя обводится.

### 🚀 Быстрый старт

Просто открой файл `index.html` в любом современном браузере.
Никаких дополнительных установок и сборки не требуется.

Клонируй репозиторий:

    git clone https://github.com/Eternitegik/Jmak_keys.git

Перейди в папку проекта:

    cd Jmak_keys

Открой index.html в браузере:

    open index.html      # macOS
    start index.html     # Windows
    xdg-open index.html  # Linux

Либо просто скачай ZIP-архив и распакуй его.

### 🌐 Живое демо

Демо проекта доступно по адресу:
**[Jmak_keys Demo](https://eternitegik.github.io/Jmak_keys/)**

### 🛠️ Технологии

- **HTML5** — структура интерфейса.
- **CSS3** — стилизация интерфейса (flex-раскладка, цветовая индикация состояний, CSS-переменные для тёмной и светлой темы).
- **JavaScript (ES6+)** — вся логика тренажёра: обработка событий клавиатуры, подсчёт статистики, управление состоянием; localStorage для настроек; собственная локализация (`js/i18n.js`) без библиотек.

### 📖 Как пользоваться

1. При первом открытии выбери, какой клавиатурой пользуешься: **«Классическая»** или **«Сплит»** (откроется страница «Вид клавиатуры», где можно задать форму сплита и записать раскладку). Вернуться к ней можно ссылкой **«Вид клавиатуры →»** в панели настроек.
2. В левой панели **«Настройки»** выбери нужные наборы символов и при необходимости настрой ползунки. Внизу панели — переключатель темы и выбор языка.
3. Нажми кнопку **«Применить»**. Если настройки были изменены, но не применены, кнопка подсвечивается красной обводкой.
4. В правой панели нажми клавишу, указанную в подсказке (Пробел или Enter).
5. После обратного отсчёта (3…2…1) на экране появится символ, который нужно нажать.
6. Нажимай правильные клавиши. Тренажёр будет засекать время и отмечать ошибки.
7. Задание можно остановить кнопкой **«Прервать»**. Кнопка **«Пропустить»** рядом с ней переходит к следующему символу — например, если его нет на твоей клавиатуре.
8. По завершении всех циклов появится блок «Ошибки при нажатии» со списком клавиш, которые не удалось нажать с первого раза, затем блок «Пропущенные символы» (если что-то пропускалось), а под ними — свёрнутая таблица «Подробные результаты» (раскрывается кликом):
   - какая клавиша была целевой;
   - какие клавиши нажимались (с указанием времени);
   - количество ошибок;
   - среднее время нажатия.

### 🌍 Локализация

Тексты интерфейса лежат в папке `localization`: по файлу `loc_<код>.js` на язык и список языков `languages.js`.
Файл перевода — это объект в формате JSON, обёрнутый в вызов `JmakI18n.register({ … })`: так переводы загружаются и при открытии `index.html` прямо с диска (обычный `.json` браузер с диска загрузить не даёт).

Как добавить язык (например, китайский):

1. Скопируй `localization/loc_eng.js` в `localization/loc_chn.js` — код языка берётся из имени файла.
2. В блоке `meta` укажи название языка для списка выбора (`"name": "中文"`) и коды языка браузера, для которых подходит перевод (`"browser": ["zh"]`).
3. Переведи строки. Ключи не меняй; строки с разметкой (`<b>`, `<code>`) и подстановки вида `{key}` оставь как есть.
4. Допиши код в список в `localization/languages.js`: `JmakI18n.load(['rus', 'eng', 'chn']);`

Список нужен потому, что браузер не может сам прочитать, какие файлы лежат в папке. Если файла из списка нет, язык просто не появится в выборе; строки, которых нет в переводе, берутся из английского.

### 📂 Структура проекта

    Jmak_keys/
    ├── index.html          # Страница тренажёра
    ├── key_settings.html   # Страница настройки вида клавиатуры (стандартная / сплит)
    ├── js/
    │   ├── script.js       # Логика тренажёра
    │   ├── keyboard.js     # Экранная клавиатура: модель (форма + раскладка по слоям) и отрисовка, общая для страниц
    │   ├── key_settings.js # Логика страницы настройки вида клавиатуры
    │   └── i18n.js         # Локализация: загрузка переводов, выбор языка, перевод страницы
    ├── localization/
    │   ├── languages.js    # Список языков
    │   ├── loc_rus.js      # Русский перевод
    │   └── loc_eng.js      # Английский перевод
    ├── style/
    │   └── style.css       # Стили обеих страниц
    ├── .gitignore
    └── README.md           # Этот файл

### 📄 Лицензия

Этот проект распространяется под лицензией **MIT**.
Полный текст лицензии — в [английской части](#-license) этого файла.
