# Jmak_keys — Тренажёр скорости нажатия клавиш

Интерактивный веб-тренажёр для развития скорости и точности нажатия клавиш на клавиатуре.  
Проект написан на чистом HTML, CSS и JavaScript без использования сторонних библиотек и фреймворков.

## ✨ Возможности

- **Гибкая настройка наборов символов**:
  - буквы русского алфавита;
  - буквы английского алфавита;
  - цифры;
  - специальные символы;
  - F-клавиши (F1–F12);
  - управляющие клавиши (Shift, Ctrl, Alt, стрелки и т.д.).
- **Регулировка сложности**:
  - количество циклов — от 5 до 100;
  - количество повторений одной клавиши — от 1 до 10.
- **Режим реального времени**:
  - отображение нажатой клавиши с цветовой индикацией (зелёный — верно, красный — ошибка, серый — ожидание);
  - замер времени реакции для каждого нажатия.
- **Визуальная обратная связь**:
  - прогресс выполнения задания;
  - опциональный вывод последовательности символов (чекбокс «Отображение списка букв»).
- **Статистика по завершении**:
  - таблица с результатами: целевая клавиша, количество ошибок, среднее время нажатия.
- **Индикация несохранённых изменений**:
  - кнопка «Применить» подсвечивается красной обводкой, если настройки были изменены, но ещё не применены.
- **Гарантированное разнообразие**:
  - если включено несколько наборов символов, каждый из них появится в задании хотя бы один раз.

## 🚀 Быстрый старт

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

## 🌐 Живое демо

Демо проекта доступено по адресу:  
**[Jmak_keys Demo](https://eternitegik.github.io/Jmak_keys/)**  

## 🛠️ Технологии

- **HTML5** — структура интерфейса.
- **CSS3** — стилизация, адаптивная вёрстка, кастомные ползунки и чекбоксы.
- **JavaScript (ES6+)** — вся логика тренажёра: обработка событий клавиатуры, подсчёт статистики, управление состоянием.

## 📖 Как пользоваться

1. В левой панели **«Настройки»** выбери нужные наборы символов и при необходимости настрой ползунки.
2. Нажми кнопку **«Применить»**.  
   Если настройки были изменены, но не применены, кнопка подсвечивается красной обводкой.
3. В правой панели **«Жмяк»** нажми клавишу, указанную в подсказке (Пробел или Enter).
4. После обратного отсчёта (5…4…3…2…1) на экране появится символ, который нужно нажать.
5. Нажимай правильные клавиши. Тренажёр будет засекать время и отмечать ошибки.
6. По завершении всех циклов появится таблица с результатами:
   - какая клавиша была целевой;
   - какие клавиши нажимались (с указанием времени);
   - количество ошибок;
   - среднее время нажатия.

## 📂 Структура проекта

    Jmak_keys/
    ├── index.html      # Основной HTML-файл
    ├── style.css       # Стили проекта
    ├── script.js       # Логика тренажёра
    └── README.md       # Этот файл

## 📄 Лицензия

Этот проект распространяется под лицензией **MIT**.  
Подробности смотри в файле [LICENSE](LICENSE) (если он добавлен) или ниже:

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
