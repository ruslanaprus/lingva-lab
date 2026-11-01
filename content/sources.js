export const SOURCES = {
  "search-language-uk": {
    title: "Google – фільтр мов результатів (українською)",
    url: "https://support.google.com/websearch/answer/13485060?hl=uk",
    note: "Мова результатів налаштовується окремо від меню; фільтр має обмеження. Назви й доступність елементів можуть змінюватися.",
  },
  "search-archive-uk": {
    title: "ЦДІАК України – е-ресурс архіву (українською)",
    url: "https://archium.cdiak.archives.gov.ua/",
    note: "Пошук у довідковому апараті й оцифрованих матеріалах: опис справи не є транскрипцією всього документа.",
  },
  "search-dataset-google": {
    title: "Google Dataset Search – про пошук наборів даних",
    url: "https://datasetsearch.research.google.com/help",
    note: "Пошук описів наборів із різних сховищ. Для перевірки переходьте до видавця та документації конкретного набору.",
  },
  "search-dataset-entry": {
    title: "Google Dataset Search – пошукова сторінка",
    url: "https://datasetsearch.research.google.com/",
    note: "Почніть із теми, мови й типу даних. Наявність запису не гарантує доступності файлів.",
  },
  "search-hf-cards": {
    title: "Hugging Face – Dataset Cards",
    url: "https://huggingface.co/docs/hub/datasets-cards",
    note: "Паспорт набору: походження, мови, використання й обмеження. Незаповнені поля залишаються невідомими.",
  },
  "search-hf": {
    title: "Hugging Face – каталог Datasets",
    url: "https://huggingface.co/datasets",
    note: "Виберіть Datasets, мову й модальність. Для цієї майстерні потрібне читання карток, без коду, моделей або великих завантажень.",
  },
  "search-kaggle-docs": {
    title: "Kaggle – документація Datasets",
    url: "https://www.kaggle.com/docs/datasets",
    note: "Опис файлів і перегляду даних. CSV та JSON із розділу 3 допомагають зрозуміти, що містить набір.",
  },
  "search-kaggle": {
    title: "Kaggle – каталог Datasets",
    url: "https://www.kaggle.com/datasets",
    note: "Перевіряйте автора завантаження, початкове джерело, версію й умови конкретного набору; популярність не замінює перевірки.",
  },
  "search-vlo": {
    title: "CLARIN – Virtual Language Observatory",
    url: "https://vlo.clarin.eu/",
    note: "Пошук мовних ресурсів за метаданими. Запис веде до установи-постачальника; доступ і умови визначаються ресурсом.",
  },
  "search-vlo-help": {
    title: "CLARIN – як VLO пов’язує описи з постачальниками даних",
    url: "https://forum.clarin.eu/t/mozilla-data-collective-datasets-can-now-be-explored-through-clarins-virtual-language-observatory-vlo/1476",
    note: "Приклад того, чому пошуковий каталог і місце зберігання набору виконують різні ролі.",
  },
  "search-bas": {
    title: "BAS CLARIN – довідка до архіву мовленнєвих корпусів",
    url: "https://clarin.phonetik.uni-muenchen.de/BASRepository/Public/FAQ.php",
    note: "Записи, сеанси, стійкі ідентифікатори й різні умови доступу. Відкриті метадані не означають необмеженого поширення записів.",
  },
  "search-dgd": {
    title: "IDS Mannheim – Datenbank für Gesprochenes Deutsch",
    url: "https://dgd.ids-mannheim.de/",
    note: "Інформація про усні корпуси, зокрема FOLK. Для роботи з даними потрібна реєстрація; у майстерні можна обмежитися публічним описом.",
  },
  "search-dwds": {
    title: "DWDS – корпуси та пошук",
    url: "https://www.dwds.de/r",
    note: "Початкова точка для пошуку німецькомовних контекстів. Перевіряйте склад, період і умови окремого корпусу.",
  },
  "search-ortolang": {
    title: "ORTOLANG – каталог мовних ресурсів",
    url: "https://www.ortolang.fr/fr/explorer/",
    note: "Пошук корпусів і їхньої документації; доступ до окремих матеріалів може відрізнятися.",
  },
  "search-eslo": {
    title: "ORTOLANG – документація підкорпусу ESLO-MD",
    url: "https://repository.ortolang.fr/api/content/eslo-md/3/Documentation/Presentation_sous_corpus_ESLO_MD.pdf",
    note: "Реальний приклад опису усного матеріалу, часових зрізів і добору інтерв’ю. Читаємо документацію; завантажувати аудіокорпус не потрібно.",
  },
  "search-bnc": {
    title: "University of Oxford – British National Corpus",
    url: "https://www.natcorp.ox.ac.uk/",
    note: "Почніть з опису складу корпусу, перш ніж використовувати його як доказ сучасного або регіонального вживання.",
  },
  "search-audio-bnc": {
    title: "University of Oxford – Audio BNC",
    url: "https://www.phon.ox.ac.uk/AudioBNC",
    note: "Приклад зв’язку між записом, транскриптом і TextGrid. Дата випуску відрізняється від дат запису й оцифрування; автоматичне вирівнювання потребує перевірки.",
  },
  "search-gallica": {
    title: "BnF Gallica – довідка з пошуку",
    url: "https://gallica.bnf.fr/accueil/fr/html/aide-a-la-recherche",
    note: "Пошук історичних документів, фільтри й OCR. Мова довідки французька; пояснення завдань українське, за потреби скористайтеся альтернативним архівом.",
  },
  "windows-input-uk": {
    title: "Microsoft – мова та розкладка клавіатури у Windows (українською)",
    url: "https://support.microsoft.com/uk-ua/windows/hardware/input-devices/manage-the-language-and-keyboard-input-layout-settings-in-windows",
    note: "Джерела вводу й мова інтерфейсу виконують різні функції; назви меню залежать від версії.",
  },
  "office-language-uk": {
    title: "Microsoft Office – мова меню та перевірки правопису (українською)",
    url: "https://support.microsoft.com/uk-ua/office/languages/change-the-language-office-uses-in-its-menus-and-proofing-tools",
    note: "Налаштування редагування та мовної перевірки окремо від інтерфейсу.",
  },
  "mac-accents-uk": {
    title: "Apple – введення діакритичних символів на Mac (українською)",
    url: "https://support.apple.com/uk-ua/guide/mac-help/mh27474/mac",
    note: "Утримання клавіші, послідовності та переглядач символів; доступність залежить від розкладки й програми.",
  },
  "diacritics-uk": {
    title: "Українська Вікіпедія – Діакритичний знак",
    url: "https://uk.wikipedia.org/wiki/Діакритичний_знак",
    note: "Додатковий вступ українською. Технічні правила послідовностей перевіряємо за Unicode.",
  },
  "nbsp-uk": {
    title: "Українська Вікіпедія – Нерозривний пробіл",
    url: "https://uk.wikipedia.org/wiki/Нерозривний_пробіл",
    note: "Призначення нерозривних проміжків; конкретний тип пробілу в майстерні задає бриф.",
  },
  "ipa-uk": {
    title: "Українська Вікіпедія – Міжнародний фонетичний алфавіт",
    url: "https://uk.wikipedia.org/wiki/Міжнародний_фонетичний_алфавіт",
    note: "Український вступ до МФА; точні символи звіряємо з офіційною IPA-таблицею.",
  },
  "unicode-normalization": {
    title: "Unicode – UAX #15: Normalization Forms",
    url: "https://www.unicode.org/reports/tr15/",
    note: "Першоджерело для NFC/NFD та суміснісних форм. Англійською; читання алгоритму не є вимогою.",
  },
  "unicode-norm-faq": {
    title: "Unicode – запитання про нормалізацію",
    url: "https://www.unicode.org/faq/normalization.html",
    note: "Канонічна еквівалентність і межі суміснісного зіставлення. Англійською.",
  },
  "unicode-segmentation": {
    title: "Unicode – UAX #29: Text Segmentation",
    url: "https://www.unicode.org/reports/tr29/",
    note: "Графемні кластери та відмінність від кодових точок. Англійською; потрібна лише концепція.",
  },
  "unicode-fonts": {
    title: "Unicode – Fonts and Keyboards FAQ",
    url: "https://www.unicode.org/faq/font_keyboard.html",
    note: "Шрифт, символи та введення – різні компоненти. Англійською.",
  },
  "ipa-fonts": {
    title: "International Phonetic Association – фонетичні шрифти й введення",
    url: "https://www.internationalphoneticassociation.org/content/other-ipa-font-resources",
    note: "Unicode-шрифти, комбіновані знаки та способи введення. Англійською; установлення не потрібне.",
  },
  "keyman-ipa": {
    title: "Keyman – IPA (SIL): спробувати клавіатуру та відкрити довідку",
    url: "https://keyman.com/keyboards/sil_ipa",
    note: "Справжня Unicode-клавіатура з Try this keyboard і Keyboard help. Англійською; на сайті практикуму є альтернативна мала панель без зовнішнього сервісу.",
  },
  charis: {
    title: "SIL – Charis, Unicode-шрифт",
    url: "https://software.sil.org/charis/",
    note: "Розширена латинка й кирилиця. Англійською; шрифт не перекодовує файл.",
  },
  "chrome-console": {
    title: "Google Chrome DevTools – Console",
    url: "https://developer.chrome.com/docs/devtools/console/reference#open-console",
    note: "Необов’язковий спосіб перевірки через консоль браузера. Англійською; основна вправа використовує інспектор на самому сайті.",
  },
  "js-code-point": {
    title: "MDN – String.prototype.codePointAt()",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt",
    note: "Що повертає codePointAt(0): першу кодову точку, а не аналіз усього слова. Англійською; писати програму для вправи не потрібно.",
  },
  "elan-eaf": {
    title: "ELAN – EAF Annotation Format",
    url: "https://www.mpi.nl/tools/elan/EAF_Annotation_Format_3.0_and_ELAN.pdf",
    note: "Офіційний опис XML-структури .eaf. PDF англійською; тут потрібно лише впізнати призначення файла анотації.",
  },
  "elan-media": {
    title: "ELAN – Media Files and Annotation Files",
    url: "https://www.mpi.nl/tools/elan/docs/manual/Sec_Media_Files_and_Annotation_Files.html",
    note: "Анотації, часові зв’язки та окремі медіафайли. Англійською; приклад пояснює, навіщо передавати узгоджений набір файлів.",
  },
  "ascii-uk": {
    title: "Українська Вікіпедія – ASCII",
    url: "https://uk.wikipedia.org/wiki/ASCII",
    note: "Вступ українською й таблиця кодів. Розрізняйте базовий ASCII (128 позицій) і різні історичні розширення.",
  },
  "code-point-uk": {
    title: "Українська Вікіпедія – Кодова точка",
    url: "https://uk.wikipedia.org/wiki/Кодова_точка",
    note: "Пояснення терміна українською. Для точних визначень кодових одиниць і діапазонів є також першоджерело Unicode.",
  },
  "unicode-code-points": {
    title: "Unicode – Characters, Encoding and Encoding Forms",
    url: "https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-3/",
    note: "Первинне джерело: кодові точки, кодові одиниці, UTF-8 і UTF-16. Англійською; у вправах є пояснення без заучування формул.",
  },
  "utf8-standard": {
    title: "RFC 3629 – UTF-8",
    url: "https://www.rfc-editor.org/rfc/rfc3629",
    note: "Правило перетворення допустимих номерів Unicode на послідовності від одного до чотирьох байтів. Англійською; достатньо розглянути готовий приклад у вправі.",
  },
  "anki-import": {
    title: "Anki – Importing Text Files",
    url: "https://docs.ankiweb.net/manual/importing/text-files",
    note: "Імпорт полів із текстових файлів: UTF-8, роздільник, обрамлення й попередній перегляд. Англійською; встановлювати Anki для цього розділу не обов’язково.",
  },
  "languagetool-json": {
    title: "LanguageTool – HTTP API",
    url: "https://languagetool.org/http-api/swagger-ui/",
    note: "Структура відповіді з масивом matches, поясненнями та replacements. Англійською; аналізуємо підготовлений фрагмент, запити й ключі API не потрібні.",
  },
  "tei-dictionaries": {
    title: "TEI Guidelines – Dictionaries",
    url: "https://tei-c.org/release/doc/tei-p5-doc/en/html/DI.html",
    note: "XML-розмітка словників: entry, form, orth, sense, def. Англійською; читання структури без написання розмітки.",
  },
  "unicode-punctuation": {
    title: "Unicode – General Punctuation",
    url: "https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-6/",
    note: "Кодові точки й різні символи пунктуації, зокрема прямі та типографічні лапки. Англійською; таблиці – для довідки, не для заучування.",
  },
  "csv-import": {
    title: "Microsoft Excel – Import or export text files",
    url: "https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files",
    note: "Імпорт тексту/CSV, вибір роздільника й експорт. Англійською; команди залежать від версії програми.",
  },
  "calc-import": {
    title: "LibreOffice Calc – Text Import",
    url: "https://help.libreoffice.org/latest/en-US/text/shared/00/00000208.html",
    note: "Кодування, роздільник, текстове обрамлення та типи стовпців у вікні імпорту. Англійською.",
  },
  xml: {
    title: "W3C – Extensible Markup Language (XML)",
    url: "https://www.w3.org/XML/",
    note: "Призначення XML та посилання на специфікації. Англійською; потрібні лише розпізнавання елементів, атрибутів і вкладення.",
  },
  "google-search": {
    title: "Google – Як уточнювати пошукові запити",
    url: "https://support.google.com/websearch/answer/2466433?hl=uk",
    note: "Точні фрази, site:, виключення, тип файла й часові обмеження. Довідка сервісу; результати живого пошуку можуть змінюватися.",
  },
  zotero: {
    title: "Zotero — Quick Start Guide",
    url: "https://www.zotero.org/support/quick_start_guide",
    note: "Збирання джерел, нотатки та бібліографічні дані. Англійською; використання Zotero в курсі добровільне.",
  },
  dwds: {
    title: "BBAW — Digitales Wörterbuch der deutschen Sprache",
    url: "https://www.bbaw.de/forschung/digitales-woerterbuch-der-deutschen-sprache",
    note: "Опис німецького лексичного ресурсу DWDS та його даних. Німецькою.",
  },
  cnrtl: {
    title: "CNRTL — Portail lexical",
    url: "https://www.cnrtl.fr/definition/",
    note: "Лексичний портал для французької; звертайте увагу на дату джерел, позначки й окремі значення. Французькою.",
  },
  cambridge: {
    title: "Cambridge Dictionary — English dictionary",
    url: "https://dictionary.cambridge.org/dictionary/english/",
    note: "Англійські словникові статті зі значеннями, прикладами й позначками. Англійською.",
  },
  reverso: {
    title: "Reverso Context — About",
    url: "https://context.reverso.net/translation/about",
    note: "Опис контекстних перекладних прикладів і перевірки вирівнювання. Англійською; це ресурс для критичного зіставлення.",
  },
  antconc: {
    title: "Laurence Anthony – AntConc",
    url: "https://www.laurenceanthony.net/software/antconc/",
    note: "Офіційна сторінка інструмента конкордансів і аналізу текстів. Англійською; для описів курсу встановлення не потрібне.",
  },
  "word-sketch": {
    title: "Sketch Engine — Word Sketch lesson",
    url: "https://www.sketchengine.eu/quick-start-guide/word-sketch-lesson/",
    note: "Зв’язок узагальнень сполучуваності з прикладами. Англійською; платний акаунт для читання опису курсу не потрібний.",
  },
  ipa: {
    title: "International Phonetic Association – IPA Chart",
    url: "https://www.internationalphoneticassociation.org/content/ipa-chart",
    note: "Офіційна фонетична таблиця. Спочатку використовуємо символи, потрібні для обраної мови.",
  },
  textgrid: {
    title: "Praat manual — TextGrid",
    url: "https://www.fon.hum.uva.nl/praat/manual/TextGrid.html",
    note: "Інтервальні та точкові рівні анотації. Англійською.",
  },
  "unicode-encodings": {
    title: "Unicode Consortium – UTF-8, UTF-16, UTF-32 & BOM",
    url: "https://www.unicode.org/faq/utf_bom.html",
    note: "Кодування, символи й кодові одиниці. Англійською; базові пояснення ASCII та UTF-8 є в описі розділу.",
  },
  "word-headings": {
    title: "Microsoft Word — Add a heading",
    url: "https://support.microsoft.com/en-us/word/add-a-heading",
    note: "Застосування стилів заголовків. Додаткове читання англійською; основні кроки пояснено українською у вправі.",
  },
  "word-contents": {
    title: "Microsoft Word — Insert a table of contents",
    url: "https://support.microsoft.com/en-us/word/training/insert-a-table-of-contents",
    note: "Автоматичний зміст на основі заголовків і його оновлення. Англійською.",
  },
  "word-footnotes": {
    title: "Microsoft Word — Add footnotes and endnotes",
    url: "https://support.microsoft.com/en-us/word/add-footnotes-and-endnotes",
    note: "Зноски та зв’язок із основним текстом. Англійською.",
  },
  "word-changes": {
    title: "Microsoft Word — Accept or reject tracked changes",
    url: "https://support.microsoft.com/en-us/word/accept-or-reject-tracked-changes-in-word",
    note: "Прийняття й відхилення змін; приховування розмітки не видаляє правок. Англійською.",
  },
  "word-feedback": {
    title: "Microsoft Word — Give and receive feedback",
    url: "https://support.microsoft.com/en-us/word/give-and-receive-feedback-in-word",
    note: "Коментарі, відповіді та пропозиції. Англійською.",
  },
  "docs-suggestions": {
    title: "Google Документи — Як запропонувати зміни",
    url: "https://support.google.com/docs/answer/6033474?hl=uk",
    note: "Режим пропонування та розгляд правок. Українською.",
  },
  "docs-sharing": {
    title: "Google Диск — Як ділитися файлами",
    url: "https://support.google.com/docs/answer/2494822?hl=uk",
    note: "Ролі читача, коментатора й редактора та доступ до документа. Українською.",
  },
  "docs-history": {
    title: "Google Документи — Як переглянути зміни у файлі",
    url: "https://support.google.com/docs/answer/190843?hl=uk",
    note: "Історія та попередні версії; потрібні відповідні права доступу. Українською.",
  },
  "docs-pages": {
    title: "Google Docs — Pages or pageless",
    url: "https://support.google.com/docs/answer/11528737?hl=uk",
    note: "Режим сторінок для номерів, колонтитулів і макета. Доступна українська локалізація.",
  },
  "writer-changes": {
    title: "LibreOffice Writer — Record Changes",
    url: "https://help.libreoffice.org/latest/en-US/text/shared/01/02230100.html",
    note: "Локальна робота з відстеженням змін у Writer. Англійською; українські орієнтири є у наборі.",
  },
  memory: {
    title: "Intel — What Is Computer and Laptop RAM?",
    url: "https://www.intel.com/content/www/us/en/tech-tips-and-tricks/computer-ram.html",
    note: "Пояснення RAM і довготривалого зберігання. Додаткове читання англійською; купувати обладнання для вправи не потрібно.",
  },
  aliases: {
    title: "Apple Support — Create and remove aliases on Mac",
    url: "https://support.apple.com/guide/mac-help/create-and-remove-aliases-on-mac-mchlp1046/mac",
    note: "Різниця між alias і початковим об’єктом. Додаткове читання англійською.",
  },
  organization: {
    title: "DataONE — Describe the overall organization of your dataset",
    url: "https://dataoneorg.github.io/Education/bestpractices/describe-the-overall",
    note: "Опис організації та зв’язків між файлами. Додаткове читання англійською; необхідні пояснення є у вправах українською.",
  },
  readme: {
    title: "Cornell Data Services — Writing READMEs for Research Data",
    url: "https://data.research.cornell.edu/data-management/sharing/readme/",
    note: "Призначення супровідного README та орієнтири для документації. Додаткове читання англійською.",
  },
  downloads: {
    title: "Google Chrome Довідка — Як завантажити файл",
    url: "https://support.google.com/chrome/answer/95759?hl=uk",
    note: "Список завантажень, показ у папці та місце збереження. Українською; для іншого браузера знайдіть аналогічне меню.",
  },
  shell: {
    title: "Software Carpentry — The Unix Shell",
    url: "https://swcarpentry.github.io/shell-novice/",
    note: "Файли, шляхи, конвеєри та пошук. Англійською.",
  },
  unicode: {
    title: "Unicode Consortium — Normalization FAQ",
    url: "https://www.unicode.org/faq/normalization.html",
    note: "Канонічна еквівалентність, NFC і NFD. Англійською.",
  },
  regex: {
    title: "MDN — Regular expressions",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions",
    note: "Синтаксис JavaScript regex і відмінності класів символів. Англійською.",
  },
  git: {
    title: "Pro Git — Recording Changes",
    url: "https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository",
    note: "Індекс, коміти, status і diff. Англійською.",
  },
  praat: {
    title: "Praat manual — Annotation",
    url: "https://www.fon.hum.uva.nl/praat/manual/Intro_7__Annotation.html",
    note: "Sound, TextGrid, інтервальні та точкові рівні. Англійською.",
  },
  audio: {
    title: "Praat manual — Sound",
    url: "https://www.fon.hum.uva.nl/praat/manual/Sound.html",
    note: "Цифровий звук та його аналіз. Англійською.",
  },
  ud: {
    title: "Universal Dependencies — Tokenization",
    url: "https://universaldependencies.org/u/overview/tokenization.html",
    note: "Різниця між орфографічним токеном і синтаксичним словом. Англійською.",
  },
  csv: {
    title: "RFC 4180 – CSV",
    url: "https://www.rfc-editor.org/rfc/rfc4180",
    note: "Рядки, роздільники й екранування лапок у CSV. Англійською.",
  },
  json: {
    title: "MDN – Working with JSON",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON",
    note: "Об’єкти, ключі та значення. Англійською.",
  },
  docs: {
    title: "Google Docs — Add a title, heading or table of contents",
    url: "https://support.google.com/docs/answer/116338",
    note: "Структура академічного документа. Доступна локалізація.",
  },
  wer: {
    title: "Hugging Face Evaluate — Word Error Rate",
    url: "https://huggingface.co/spaces/evaluate-metric/wer/blob/main/README.md",
    note: "Означення WER та обмеження метрики. Англійською.",
  },
  ethics: {
    title: "UNESCO — Guidance for generative AI in education and research",
    url: "https://unesdoc.unesco.org/ark:/48223/pf0000386693",
    note: "Людський контроль, приватність і критичне використання ШІ. Англійською.",
  },
};
