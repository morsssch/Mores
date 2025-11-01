# Развёртывание Mores (краткий гайд)

Этот документ содержит несколько вариантов деплоя: напрямую на сервере (systemd / pm2) и через Docker. Внимание: у сервера ограничено 500 MB RAM — все инструкции оптимизированы под низкую память.

Основные рекомендации перед развёртыванием
- Создайте пользователя/каталог для бота, например `/opt/mores` и каталог данных `/opt/mores/data`.
- Убедитесь, что у вас установлены: Node.js 18+, npm, git.
- Настройте переменные окружения: `BOT_TOKEN`, `ADMIN_CHAT_ID`/`ADMIN_USERNAME`, `MASTER_DB_PATH` (опционально). Лучше хранить в `.env` (не коммитить).
- В production используйте собранную версию (`npm run build`) и запускайте `node dist/bot.js`, а не `ts-node`.

Особенности по памяти (500 MB RAM)
- Рекомендуется ограничить Node.js heap: `NODE_OPTIONS=--max-old-space-size=256`.
- В PM2 можно задать `max_memory_restart: '300M'`.
- В Dockerfile по умолчанию установлен `NODE_OPTIONS` как выше.
- Отключите ненужные devDependencies при установке на сервере: `npm ci --omit=dev`.

Вариант A — Docker (рекомендуется для простоты)
1. На сервере установите Docker.
2. Скопируйте проект и файл `.env` в сервер (или клонируйте репозиторий).
3. Постройте образ и запустите контейнер с volume для данных:

```powershell
# в каталоге проекта
docker build -t mores:latest .
docker run -d --name mores \
  --restart unless-stopped \
  -e BOT_TOKEN="$env:BOT_TOKEN" \
  -e ADMIN_CHAT_ID="$env:ADMIN_CHAT_ID" \
  -v C:\path\to\host\mores_data:/data \
  mores:latest
```

Замените `C:\path\to\host\mores_data` на реальный путь на сервере (в Linux это `/opt/mores/data`).

Вариант B — systemd (прямой запуск на хосте)
1. Установите зависимости и соберите проект:

```bash
cd /opt/mores
npm ci --omit=dev
npm run build
mkdir -p /opt/mores/data
chown -R mores:mores /opt/mores
```

2. Скопируйте `mores.service` в `/etc/systemd/system/mores.service` и адаптируйте `ExecStart` и пути.
3. Запустите и включите сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mores
sudo journalctl -u mores -f
```

Вариант C — PM2
1. Установите pm2: `npm i -g pm2`.
2. Запустите приложение через `ecosystem.config.js`:

```bash
pm ci --omit=dev
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup # выполните команду из вывода, если нужно
```

Backup и безопасное хранение данных
- SQLite файлы находятся в папке `data/` (по умолчанию). Настройте резервные копии (например `rsync` или `cron` для архивации раз в день).
- Перед восстановлением убедитесь, что сервис остановлен (чтобы избежать повреждения файла).

Мониторинг и логирование
- Смотрите логи через `journalctl -u mores` (systemd) или `pm2 logs`.
- Настройте внешнее логирование/alerting при необходимости.

Тонкие настройки и советы
- Устанавливайте `NODE_ENV=production` и `NODE_OPTIONS=--max-old-space-size=256`.
- При проблемах с памятью можно снизить `--max-old-space-size` ещё ниже, но внимательно наблюдайте за поведением (GC).
- Не ставьте слишком много фоновых задач; reminders/summaries уже оптимизированы для итерации по пользователям.

Если хотите — могу подготовить готовый `Docker Compose` или настроить CI/CD pipeline для автоматического билда и деплоя.
