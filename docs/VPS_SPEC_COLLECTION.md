# Сбор спецификации VPS (для отладки и документации)

Цель: один раз снять **несекретный** снимок окружения (ОС, ресурсы, порты, Node, PM2, Nginx, Docker, git), без значений из `.env`.

**Зафиксированный срез (апрель 2026):** см. `docs/VPS_SERVER_SPEC.md` — Ubuntu 24.04, 2 vCPU, **~3.8 GB RAM**, **40 GB** disk, ядро **6.8.0-107**, swap **0**; в файле **нет** публичного IP. Версии Node/Docker переснимите на сервере после апгрейда ВМ.

## Вариант A — скрипт из репозитория

На VPS после `cd ~/e1` и `git pull`:

```bash
cd ~/e1
bash scripts/collect-vps-spec.sh | tee ~/vps-spec.txt
```

Если репозиторий не в `~/e1`:

```bash
REPO_ROOT=/path/to/repo bash /path/to/repo/scripts/collect-vps-spec.sh | tee ~/vps-spec.txt
```

Пришлите содержимое `~/vps-spec.txt` в чат или приложите к задаче — его можно внести в локальную заметку/док без коммита секретов.

## Вариант B — одна длинная команда без скрипта

Скопируйте целиком (пути `~/e1` при необходимости поправьте):

```bash
echo "=== UTC ===" && date -u && echo "=== OS ===" && (hostnamectl || true) && uname -a && echo "=== CPU/RAM ===" && (nproc; lscpu | head -25; free -h) && echo "=== DISK ===" && df -hT && echo "=== PORTS ===" && (ss -tlnp || netstat -tlnp) && echo "=== NODE ===" && node -v && npm -v && echo "=== PM2 ===" && pm2 list && pm2 describe escort-api 2>/dev/null && echo "=== NGINX ===" && nginx -v 2>&1 && ls -la /etc/nginx/sites-enabled 2>/dev/null && echo "=== DOCKER ===" && docker --version && docker ps -a && echo "=== GIT ~/e1 ===" && git -C ~/e1 rev-parse --short HEAD && git -C ~/e1 status -sb && echo "=== .env KEYS ONLY ===" && grep -E '^[A-Za-z_][A-Za-z0-9_]*=' ~/e1/.env 2>/dev/null | cut -d= -f1 | sort -u
```

Часть команд (`ss -p`, `nginx -v`, `docker`) может потребовать прав; если что-то упало с «Permission denied», повторите отдельно с `sudo` только для этой строки.

## Чего не делать

- Не вставляйте в чат полный `.env`, `DATABASE_URL` с паролем, JWT-секреты, SMTP-пароли.
- Не публикуйте вывод с реальными IP/доменами, если не хотите света — замажьте вручную.

## Где это лежит в репо

- Скрипт: `scripts/collect-vps-spec.sh`
- Эта инструкция: `docs/VPS_SPEC_COLLECTION.md`
