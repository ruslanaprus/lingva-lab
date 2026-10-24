# Запуск, перевірка та публікація lingva.lab

Про навчальну мету читайте в [README](../README.md), про внесення змін — у [CONTRIBUTING](../CONTRIBUTING.md), про модулі — в [архітектурі](architecture.md).

Сайт написаний на HTML, CSS і JavaScript без фреймворків. Його робота не потребує пакетних залежностей, зовнішніх шрифтів, API-ключів або серверної бази даних. ESLint, Prettier і Playwright використовуються лише під час розробки.

## Локальний запуск

Потрібні pnpm 10.28.2, Node.js 24 або новіший, Python 3 і сучасний браузер.

```sh
pnpm dev
```

Відкрийте <http://127.0.0.1:4173>. Для цього простого запуску встановлення пакетів не потрібне. Не відкривайте `index.html` через `file://`: модулі JavaScript і Worker потребують HTTP. Зупинення сервера — `Ctrl+C`.

Для розробки та перевірок установіть пакети з lock-файла:

```sh
pnpm install --frozen-lockfile
pnpm format
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
```

`pnpm check` виконує перевірку матеріалів, ESLint, Prettier, модульні тести та збірку. Окремо можна запустити `pnpm check:content`, `pnpm lint`, `pnpm format:check`, `pnpm test` або `pnpm build`.

Браузерна перевірка використовує готовий `dist/`, застосовує заголовки з `_headers`, проходить вправи через інтерфейс і перевіряє звіти, імпорт, облік часу, відгуки та адаптивність. Вона запускає власний тимчасовий сервер і закриває його після перевірки. Для встановленого Chrome: `PLAYWRIGHT_CHANNEL=chrome pnpm test:browser`. Артефакти за замовчуванням зберігаються в `/tmp/lingva-lab-qa`.

Модульні тести перевіряють усі 180 поточних варіантів вправ, незалежність мовних прикладів, різну структуру маршрутів, необов’язкові вправи, точні відповіді та індекси вибору, повтори, XP, знімки історичних умов, імпорт і відновлення даних. Перевірки збірки контролюють, що очищення не виходить за межі `dist/` цього проєкту.

## Збірка

```sh
pnpm build
```

Команда очищує згенерований `dist/` і копіює лише `index.html`, `_headers`, `src/`, `content/`, `styles/` та `assets/`. Вона також записує версію продукту в модуль версії готового сайту. Тести, документація, пакети для розробки й студентські експорти не входять до збірки. Збірка використовує тільки вбудовані можливості Node.js.

## Pull requests і публікація

Усі зміни надходять через окремі гілки та PR до `main`. Workflow [ci.yml](../.github/workflows/ci.yml) перевіряє кожен PR: установлює пакети з lock-файла, виконує `pnpm check` і браузерні тести Chromium. Він не використовує секрети Cloudflare і не публікує сайт.

Після злиття PR workflow [deploy-cloudflare.yml](../.github/workflows/deploy-cloudflare.yml) для `main` повторно виконує `pnpm check` і публікує готовий сайт. Ручний запуск деплою теж обмежений `main`. Для серверного захисту `main` у GitHub увімкніть вимогу PR та успішного check `validate`; для одного розробника не встановлюйте обов’язкове схвалення іншою людиною, якщо такої людини немає.

## Cloudflare Pages

Поточний проєкт Pages — `lingva-lab`. Сайт залишається статичним: без Functions, бази даних і платних API.

GitHub Actions використовує repository secrets:

| Secret                  | Значення                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Токен із дозволом Account → Cloudflare Pages → Edit для потрібного account |
| `CLOUDFLARE_ACCOUNT_ID` | ID account із проєктом Pages                                               |

Необов’язкова repository variable `CLOUDFLARE_PAGES_PROJECT_NAME` змінює назву проєкту; типове значення — `lingva-lab`. Production branch має бути `main`. Секрети не записуються у файли або PR.

Для [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) можна завантажити вміст `dist/` через Cloudflare. Для Git integration: framework preset **None**, build command `pnpm build`, output directory `dist`. Якщо GitHub Actions вже публікує сайт, вимкніть дублюючі автоматичні збірки Git integration. Деталі: [Pages CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/) і [керування Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/).

Підтримка статичних сайтів описана в [документації Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/), актуальні квоти — у [Pages limits](https://developers.cloudflare.com/pages/platform/limits/). `_headers` задає політику джерел контенту та інші заголовки. Звичайний Python-сервер їх не застосовує; браузерні тести застосовують.

## Прогрес і відгуки

Прогрес формату 2 зберігається в `lingva-lab:v2`. Старий тестовий ключ формату 1 залишається доступним для відновлення, але не імпортується в новий формат. Правила майбутніх міграцій, revision та архівних записів описані в [versioning.md](versioning.md).

Чернетки відгуків використовують окремий ключ `lingva-lab:feedback:v2` і не входять до звітів або резервних копій прогресу. У сховищі відгуків немає імені, групи або точних дат. Експорт доступний лише після обов’язкових вправ розділу; ім’я та група додаються лише за явного вибору студента. Персональні дані, які студент сам вписав у коментар, автоматично не видаляються. Онлайн-надсилання не підключене.
