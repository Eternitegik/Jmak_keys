// English interface translation. The object passed to register is JSON; the language code
// comes from the file name (loc_eng.js → eng). To add a language, copy this file to
// loc_<code>.js, change "meta", translate the strings and add the code to languages.js.
// Strings missing from a translation are taken from this file.
JmakI18n.register({
  "meta": {
    "name": "English",
    "browser": ["en"]
  },
  "common": {
    "space": "Space"
  },
  "keyboard": {
    "baseLayer": "Base",
    "layer": "Layer {n}"
  },
  "welcome": {
    "title": "Which keyboard do you use?",
    "standard": "Classic",
    "split": "Split"
  },
  "storage": {
    "trainer": "<b>Your browser doesn't allow saving data.</b> The trainer works, but settings, theme and language won't be remembered until next time, and the split keyboard from the “Keyboard setup” page won't get here. Allow this site to store cookies and site data in your browser settings and reload the page.",
    "keySettings": "<b>Your browser doesn't allow saving data.</b> Changes on this page won't reach the trainer and will be lost on reload. Allow this site to store cookies and site data in your browser settings and reload the page.",
    "close": "Hide warning"
  },
  "trainer": {
    "title": "Jmak — key location trainer",
    "settings": {
      "title": "Settings",
      "letterSet": "Letter set",
      "letterSetRu": "Russian",
      "letterSetEn": "English",
      "letterSetAll": "All",
      "off": "Off",
      "special": "Special characters",
      "digits": "Digits",
      "fkeys": "F keys",
      "control": "Control keys",
      "fullSet": "Full set",
      "showSequence": "Show letter list",
      "blind": "Hide key labels",
      "hands": "Hand guides",
      "handsHalves": "Split into halves",
      "handsFingers": "For each finger",
      "hint": "Where-to-press hint",
      "hintNever": "Never",
      "hintDelay": "If I hesitate (after 2 s)",
      "hintInstant": "Immediately",
      "cycles": "Number of cycles",
      "repeats": "Repeats per key",
      "apply": "Apply",
      "keyboardLink": "Keyboard setup →",
      "darkTheme": "Dark theme",
      "language": "Language"
    },
    "info": {
      "summary": "About and tips",
      "intro": "Jmak helps you learn where the keys are and train your fingers' muscle memory — especially when moving from a regular keyboard to a split one, when at first your fingers reach for keys in the wrong places. Press times are shown so you can see your progress, but what matters most is pressing the right key without looking.",
      "split": "You can set the shape of your split keyboard (columns, rows, thumb keys) on the “Keyboard setup” page — the trainer will draw it instead of the regular one. There you can also record your own layout with layers: the page highlights the keys one by one, and you press them on your keyboard. If your digits and symbols are on different keys (Shift + 9 doesn't give a parenthesis), turn on “Digits and symbols on different keys” there — symbols will then be shown only on their own keys. All settings (keyboard, layout with layers, trainer settings, theme and language) can be saved to a file and loaded in another browser — see the “Backup” card on the same page.",
      "layers": "<b>Split layers.</b> Layer tabs appear above the keyboard — while idle, you can use them to see what is where. On the base layer, small labels in the key corners show what the key does on layers 1 and 2. If a task character is on another layer, the prompt names the layer (“Press (Symbols)”), the keyboard switches to it by itself, and the key that turns it on is outlined in the layer's color.",
      "steps": {
        "apply": "Choose the character sets on the left and click <b>“Apply”</b>.",
        "start": "Press the key shown in the prompt (Space or Enter).",
        "countdown": "After a 3…1 countdown a character appears — press it on your keyboard.",
        "layoutTag": "With the “All” letter set, the letter's layout is shown next to “Press” — <b>(Rus)</b> or <b>(Eng)</b>: Cyrillic “с” and Latin “c”, for example, look the same.",
        "cycles": "<b>Number of cycles</b> — how many different characters the task contains (from 5 to 100).",
        "repeats": "<b>Repeats per key</b> — how many times in a row you press the same character.",
        "fullSet": "<b>“Full set”</b> — the task includes every character of the selected sets, each once, in random order; the number of cycles can't be set then (the number of characters in the task is shown next to it), repeats work as usual.",
        "everySet": "If several sets are enabled, each of them is guaranteed to appear in the task at least once.",
        "colors": "Keys from the selected sets are blue on the keyboard, the rest are gray. The highlight changes as soon as you toggle the options, even before “Apply”.",
        "showSequence": "With “Show letter list” on, the keys that will come up in the task are highlighted yellow once it starts.",
        "flashes": "A correct press flashes green on the keyboard, a wrong one flashes red; the press time is shown below the keyboard.",
        "hands": "<b>“Hand guides”</b> — a stripe at the bottom of a key shows what to press it with when touch typing. “Split into halves”: purple — left hand, teal — right hand. “For each finger”: each finger has its own color, from pink (left pinky) to crimson (right pinky); gray — thumbs (Space, Alt).",
        "extraKeys": "On a regular keyboard, the Esc and F1–F12 row appears when “F keys” or “Control keys” are on, and the Insert/Home/PgUp/Delete/End/PgDn block with arrows when “Control keys” are on. A split keyboard has no such keys — they're usually on layers; the task accepts them but doesn't show them on the diagram.",
        "hint": "<b>“Where-to-press hint”</b> — the target key is highlighted on the diagram together with its finger stripe: “Immediately” or “If I hesitate” (after 2 seconds if the key hasn't been pressed yet). By default there's no hint — you have to find the key yourself.",
        "blind": "<b>“Hide key labels”</b> — only the key shapes stay on the diagram (and the bumps on F/J): you have to remember where each character is.",
        "mistakes": "At the end, a “Mistakes” block appears — the keys you didn't hit on the first try: they deserve extra attention. The <b>“Retry mistakes”</b> button starts a task with just these keys (3 times each). Below it is a collapsed “Detailed results” table: key, all presses, mistakes, average press time."
      },
      "layout": "Characters are typed in the layout selected in the settings (Russian / English).",
      "special": "<b>Special characters depend on the letter set:</b> with “Russian”, only characters typed in the Russian layout come up (<code>! \" % : ; ? * ( ) _ + - = \\ / , .</code>); with “English” and “All”, and when the letter set is “Off”, all special characters do (for those not available in the Russian layout, switch to English). Letter case is ignored.",
      "combos": "<b>Key combinations</b> (for example, Alt+Shift to switch layouts, Shift+1 for “!”) don't count. A single press of Alt, Ctrl, Shift or Win counts when the key is released; the reaction time is measured from the moment it was pressed.",
      "abort": "You can stop the task with the “Abort” button.",
      "saved": "Settings are saved in the browser when you click “Apply” and are restored automatically the next time you open the page.",
      "language": "The interface language is chosen at the bottom of the settings; by default it follows your browser's language.",
      "tipsTitle": "Tips",
      "tips": {
        "handsIntro": "<b>Home position.</b> Before you start, place your fingers on the “home” keys:",
        "handsLeft": "left hand — pinky, ring, middle and index fingers on <b>A S D F</b> (Ф Ы В А in the Russian layout), thumb on the layer 1 key;",
        "handsRight": "right hand — index, middle, ring fingers and pinky on <b>J K L ;</b> (О Л Д Ж), thumb on the layer 2 key.",
        "handsOutro": "On a regular keyboard, your thumbs rest on the space bar. To press a key, reach for it with the right finger and return the finger right after the press — every movement starts from the same point, so your fingers learn it faster.",
        "noMistakes": "First get to “No mistakes, well done!”, and only then speed up: speed comes by itself once your fingers know the way.",
        "gradual": "Raise the difficulty gradually: hint “Immediately” → “If I hesitate” → “Never” → “Hide key labels”.",
        "noLooking": "Try not to look at your own keyboard — look for the key on the on-screen one.",
        "fingers": "Turn on “Hand guides” → “For each finger” and watch which finger you press with.",
        "retry": "Your fingers haven't learned the keys from the “Mistakes” block yet — practice them with the “Retry mistakes” button."
      }
    },
    "status": {
      "start": "Press {key} to start",
      "ready": "Get ready",
      "press": "Press",
      "done": "Task complete!"
    },
    "abort": "Abort",
    "progress": "Cycle {cycle}/{cycles}, repeat {repeat}/{repeats}",
    "feedback": {
      "time": "{time} ms",
      "wrong": "✗ {key} · {time} ms"
    },
    "layoutTag": {
      "ru": "Rus",
      "en": "Eng"
    },
    "results": {
      "mistakesTitle": "Mistakes",
      "noMistakes": "No mistakes, well done!",
      "mistakes": "Keys you didn't hit on the first try: {keys}. Give them some extra attention.",
      "retry": "Retry mistakes",
      "details": "Detailed results",
      "colNumber": "#",
      "colTarget": "Target key",
      "colPresses": "Presses",
      "colErrors": "Mistakes",
      "colAvgTime": "Average time (ms)",
      "press": "{key} ({time} ms)"
    }
  },
  "keySettings": {
    "title": "Jmak — keyboard setup",
    "back": "← Back to trainer",
    "heading": "Keyboard setup",
    "note": "Settings are saved right away and used in the trainer.",
    "saved": "Saved",
    "saveFailed": "Couldn't save: browser storage is unavailable",
    "quoted": "“{name}”",
    "type": {
      "title": "Keyboard type",
      "standard": "Standard QWERTY",
      "split": "Split keyboard"
    },
    "shape": {
      "title": "Split shape",
      "preset": "Preset",
      "custom": "Custom shape",
      "stagger": "Column stagger",
      "staggerNone": "None (ortholinear)",
      "staggerModerate": "Moderate",
      "staggerStrong": "Strong",
      "same": "Identical halves",
      "left": "Left half",
      "right": "Right half",
      "cols": "Columns (6 — with the outer one, 7 — with the inner one too)",
      "rows": "Rows (4 — with the number row)",
      "thumbs": "Thumb keys"
    },
    "preview": {
      "title": "Preview",
      "titleSplit": "Preview and layout",
      "fingers": "Show fingers",
      "splitNote": "On the base layer, small labels in the key corners show what the key does on layers 1 and 2. In the trainer, if a character is on another layer, the prompt names the layer (“Press (Symbols)”), the keyboard shows that layer by itself, and the layer key is outlined — give your layers clear names."
    },
    "layout": {
      "separateSymbols": "Digits and symbols on different keys (Shift + digit doesn't give a symbol)",
      "learn": "Record layer {layer}",
      "addLayer": "+ Layer",
      "rename": "Rename layer",
      "remove": "Delete layer",
      "reset": "Reset layout",
      "note": "“Record layer” highlights the keys of the diagram one by one — press them on your keyboard, and the trainer will remember what is where. To re-record a single key, click it on the diagram. Unrecorded keys of the base layer stay as on a regular QWERTY. Dashed keys are unassigned (on any layer); faded keys of a layer are the same as on the base layer. With “Digits and symbols on different keys”, a character like “)” is looked up only where it's recorded — record your own symbol layer.",
      "renamePrompt": "Layer name (for example, “Symbols” or “Numbers”):",
      "removeConfirm": "Delete layer {layer} and everything recorded on it?",
      "resetConfirm": "Reset the recorded layout? Keys will go back to regular QWERTY, and layers will be deleted.",
      "recorded": "Layer {layer} recorded"
    },
    "wizard": {
      "titleWalk": "Layer {layer} — key {index} of {total}",
      "titleSingle": "Layer {layer} — single key",
      "textBase": "Press the highlighted key on your keyboard. If it doesn't type anything, it's a layer switch or an empty key: choose “This is a layer key…” or “Empty”.",
      "textLayer": "Turn on this layer (hold its key — it's outlined in the layer's color) and press the highlighted key. If it's the same on this layer as on the base layer, choose “Same as base”; if it's unassigned, choose “Empty”.",
      "recorded": "Recorded: {what}",
      "empty": "empty",
      "same": "same as base",
      "layerKey": "layer key {layer}",
      "back": "← Back",
      "sameButton": "Same as base",
      "emptyButton": "Empty",
      "layerSelect": "This is a layer key…",
      "layerSelectLabel": "The key turns on a layer",
      "newLayer": "{layer} (new)",
      "done": "Done"
    },
    "backup": {
      "title": "Backup",
      "note": "Save your settings to a file to move them to another browser or computer: keyboard view, recorded layout with layers, trainer settings, theme and language.",
      "export": "Save to file",
      "import": "Load from file",
      "exported": "Saved to {file}",
      "notBackup": "This isn't a Jmak settings file — nothing was changed",
      "importConfirm": "Replace the current keyboard settings, layout and trainer settings with the data from the file?",
      "imported": "Settings loaded from the file",
      "importSaveFailed": "Couldn't save the settings: browser storage is unavailable",
      "readFailed": "Couldn't read the file"
    }
  }
});
