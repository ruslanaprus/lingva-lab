# Запуск, перевірка та публікація lingva.lab

Цей довідник призначений для тих, хто запускає сайт на своєму комп’ютері, змінює завдання або публікує сайт для групи. Про навчальну мету та роботу з вправами читайте в [README](../README.md).

Сайт написаний на HTML, CSS і JavaScript без фреймворків. Для його роботи не потрібні пакетні залежності, зовнішні шрифти, API-ключі або серверна база даних.

## Локальний запуск


```sh
pnpm dev
```

Відкрийте <http://127.0.0.1:4173>. Потрібні pnpm 10.28.2, Node.js, Python 3 і сучасний браузер. Сайт не має пакетних залежностей. Відкривати `index.html` через `file://` не рекомендовано: модулі JavaScript і Worker потребують HTTP.

## Cloudflare Pages

```sh
pnpm build
```

Команда очищує згенерований каталог `dist/` цього проєкту та копіює лише необхідні статичні файли. Попередні звіти, резервні копії та інші зайві файли у `dist/` видаляються перед збіркою. Залежності та мережеві запити для збірки не потрібні.

Для [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) у Cloudflare Pages завантажте вміст `dist/` через панель керування. Для інтеграції з Git виберіть framework preset **None**, build command `pnpm build`, output directory `dist`. Сайт не використовує Functions, бази даних або платні API.

Cloudflare підтримує [статичні HTML-сайти](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/). Конкретні актуальні квоти дивіться в [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

### Автодеплой через GitHub Actions

Workflow [`.github/workflows/deploy-cloudflare.yml`](../.github/workflows/deploy-cloudflare.yml) запускається після кожного push у `main`: встановлює pnpm із версії в `package.json`, виконує `pnpm test`, збирає `dist/` і публікує його в Cloudflare Pages. Якщо тести або збірка завершуються помилкою, деплой не виконується. Запуск вручну доступний через **Actions → Deploy to Cloudflare Pages → Run workflow** для гілки `main`.

Одноразове налаштування:

1. Створіть у своєму Cloudflare account проєкт Pages із назвою `lingva-lab` і production branch `main`. Для Direct Upload це можна зробити локально:

   ```sh
   pnpm dlx wrangler@4 login
   pnpm dlx wrangler@4 pages project create lingva-lab --production-branch=main
   ```

2. Створіть Cloudflare API token із дозволом **Account → Cloudflare Pages → Edit**, обмеженим відповідним account.
3. У GitHub-репозиторії відкрийте **Settings → Secrets and variables → Actions** і додайте repository secrets:

   | Secret | Значення |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | API token із попереднього кроку |
   | `CLOUDFLARE_ACCOUNT_ID` | ID account, у якому створено проєкт Pages |

4. Якщо проєкт має іншу назву, додайте repository variable `CLOUDFLARE_PAGES_PROJECT_NAME` із точною назвою цього проєкту. Без цієї змінної використовується `lingva-lab`. Його production branch також має бути `main`.
5. Закомітьте й надішліть workflow у `main`. Наступні push у `main` автоматично оновлюватимуть сайт після успішних перевірок.

Якщо проєкт Pages уже має Git integration, вимкніть його автоматичні збірки, щоб уникнути подвійних деплоїв. Деталі: [Cloudflare Pages CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/) і [керування Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/).

Файл `_headers` задає політику джерел контенту та інші заголовки для Pages. Звичайний Python HTTP-сервер їх не застосовує; браузерні QA-перевірки запускають тестовий сервер із цими заголовками.

## Перевірка

```sh
pnpm test
pnpm build
```

Тести перевіряють досяжність результату всіх 180 варіантів завдань, незалежність траєкторій, облік помилок і повторів, одноразове нарахування XP, Unicode, regex, знімки Git, семантику копіювання, WER та імпорт. Регресійні перевірки відхиляють сторонні поля у резервних копіях, перевіряють безпечне форматування відповідей і видалення зайвих файлів лише з `dist/` цього проєкту. Формат версії 1 приймає тільки визначені поля; довільні додаткові поля не підтримуються.

Додаткова браузерна перевірка використовує окремо встановлений Playwright і Chrome:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/@playwright/test/index.mjs node tests/browser.mjs
```

Вона проходить завдання через інтерфейс, перевіряє завантаження/імпорт і адаптивність. Браузерні інструменти не є залежністю самого сайту. Артефакти QA за замовчуванням зберігаються в `/tmp/lingva-lab-qa`.

## Структура

| Файл | Призначення |
| --- | --- |
| `index.html` | Каркас сторінки, навігація, профіль |
| `styles.css` | Дизайн за наданими скриншотами, адаптивність |
| `course.js` | Програма, три мовні набори, завдання, терміни та джерела |
| `engine.js` | Перевірки, прогрес, XP, симулятори, WER, резервні копії |
| `regex-worker.js` | Ізольований пошук і заміна регулярними виразами |
| `app.js` | Інтерфейс, маршрути, збереження, звіти й завантаження |
| `docs/curriculum.md` | Узгодження з outline та лабораторними №1–3 |

Для зміни завдань редагуйте `course.js`. Зміна схеми збережених даних потребує міграції або нової версії ключа у `engine.js`. Не змінюйте значення стабільного ID завдання без продуманої міграції попередніх спроб.
