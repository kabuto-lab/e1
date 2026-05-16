# RF Rufo — fonts placement

В эту папку нужно положить файлы шрифта **RF Rufo** в формате WOFF2 (+ опционально WOFF для расширенной совместимости со старыми браузерами).

## Откуда брать

RF Rufo — коммерческий шрифт. Получить файлы можно у правообладателя по лицензии. **Не клади в репозиторий файлы, на которые нет лицензии.**

## Ожидаемые имена файлов

`@font-face` декларации в `apps/web/src/app/globals.css` (и в `dashboard-2077.html`) ссылаются на:

```
RFRufo-Regular.woff2   ← weight 400
RFRufo-Medium.woff2    ← weight 500
RFRufo-SemiBold.woff2  ← weight 600  (опционально)
RFRufo-Bold.woff2      ← weight 700
```

Опционально, для покрытия старых браузеров — продублировать каждый файл в `.woff`:

```
RFRufo-Regular.woff
RFRufo-Medium.woff
RFRufo-Bold.woff
```

Если у тебя другие имена файлов — либо переименуй их под этот шаблон, либо обнови пути в `globals.css` / `dashboard-2077.html`.

## Что произойдёт когда файлы будут на месте

- Next.js (`apps/web`) автоматически отдаст их по `/fonts/rf-rufo/<file>`
- Dashboard (`barbie/SITE1/dashboard-2077.html`) подхватит их по относительному пути `./apps/web/public/fonts/rf-rufo/<file>` при открытии через `file://` или http-server
- CSS-переменные `--font-admin` и Tailwind-класс `font-admin` начнут использовать RF Rufo
- Fallback-цепочка: **RF Rufo → Inter → system-ui → sans-serif** — пока файлов нет, все админ-интерфейсы рендерятся через Inter (без визуального разрыва)

## Браузерная совместимость

- `.woff2` — все современные браузеры (Chrome 36+, Firefox 39+, Safari 12+, Edge 17+, Opera 26+), iOS Safari 10+, Android Browser 105+ — это ~96% траффика
- `.woff` (опциональный fallback) — добавляет IE9-11 и старые Android Browser

Если нужно полное покрытие до IE6 — потребуются ещё `.eot` и `.ttf`, но это обычно избыточно для современного админ-интерфейса.

## Структура `@font-face`

Используем `font-display: swap` — текст рендерится сразу через fallback, потом подменяется на RF Rufo как только шрифт загружен. Это даёт лучший perceived-performance (нет FOIT).

## Лицензия

Не коммитить .woff2 / .woff в git без подтверждения, что лицензия RF Rufo разрешает распространение в данном репозитории. Для приватного репозитория сетевого проекта обычно достаточно user-license. Уточни условия у правообладателя.
