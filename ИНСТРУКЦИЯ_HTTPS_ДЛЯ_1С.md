# ДОБАВЛЕНИЕ HTTPS НА 1С СЕРВЕР

## 🎯 ЦЕЛЬ
Настроить HTTPS для эндпоинта `http://45.154.116.216:3240/tt.json`

---

## 📋 ВАРИАНТ 1: NGINX КАК ОБРАТНЫЙ ПРОКСИ (РЕКОМЕНДУЕТСЯ)

Это самый простой способ добавить HTTPS не трогая настройки 1С.

### Шаг 1: Установка NGINX
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
```

### Шаг 2: Установка Certbot (для SSL)
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx -y
```

### Шаг 3: Настройка NGINX

Создайте файл `/etc/nginx/sites-available/1c-api`:

```nginx
server {
    listen 443 ssl;
    server_name 45.154.116.216;

    # SSL сертификаты (будут созданы Certbot)
    ssl_certificate /etc/letsencrypt/live/ДОМЕН/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ДОМЕН/privkey.pem;

    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Проксирование на 1С
    location /tt.json {
        proxy_pass http://127.0.0.1:3240/tt.json;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS заголовки
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}

# Редирект HTTP → HTTPS
server {
    listen 80;
    server_name 45.154.116.216;
    return 301 https://$server_name$request_uri;
}
```

### Шаг 4: Активация конфигурации
```bash
# Создать симлинк
sudo ln -s /etc/nginx/sites-available/1c-api /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезапустить NGINX
sudo systemctl restart nginx
```

### Шаг 5: Получение SSL сертификата

**ВАЖНО:** Для Let's Encrypt нужен домен. IP адреса не поддерживаются.

**Вариант А: С доменом**
```bash
# Привяжите домен к IP (например api.domain.com → 45.154.116.216)
# Затем:
sudo certbot --nginx -d api.domain.com
```

**Вариант Б: Без домена (самоподписанный сертификат)**
```bash
# Создать самоподписанный сертификат
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/selfsigned.key \
  -out /etc/nginx/ssl/selfsigned.crt

# В конфиге NGINX использовать:
ssl_certificate /etc/nginx/ssl/selfsigned.crt;
ssl_certificate_key /etc/nginx/ssl/selfsigned.key;
```

⚠️ **Примечание:** Самоподписанный сертификат вызовет предупреждение в браузере, но для API это не критично.

### Шаг 6: Проверка

Откройте в браузере:
```
https://45.154.116.216/tt.json
```

или (если домен):
```
https://api.domain.com/tt.json
```

---

## 📋 ВАРИАНТ 2: ПРЯМАЯ НАСТРОЙКА 1С (СЛОЖНЕЕ)

Если 1С использует стандартный веб-сервер:

### Для Apache (если 1С через Apache):
```bash
# Установить mod_ssl
sudo apt install apache2-ssl-certificate

# Настроить виртуальный хост с SSL
# Файл: /etc/apache2/sites-available/1c-ssl.conf
```

### Для IIS (если Windows):
1. Открыть IIS Manager
2. Выбрать сайт
3. Bindings → Add
4. Type: https
5. Port: 443
6. SSL Certificate: установить или импортировать

---

## 📋 ВАРИАНТ 3: STUNNEL (УНИВЕРСАЛЬНЫЙ)

Если ничего не помогает, используйте stunnel - обертку SSL для любого TCP сервиса.

```bash
# Установка
sudo apt install stunnel4 -y

# Конфиг /etc/stunnel/stunnel.conf
[1c-https]
accept = 443
connect = 127.0.0.1:3240
cert = /etc/stunnel/stunnel.pem
key = /etc/stunnel/stunnel.key

# Запуск
sudo systemctl enable stunnel4
sudo systemctl start stunnel4
```

---

## ✅ ПОСЛЕ НАСТРОЙКИ

Финальный URL будет:
```
https://45.154.116.216/tt.json
```

или (с доменом):
```
https://api.domain.com/tt.json
```

Этот URL использовать в `dataManager.js` на фронтенде.

---

## 🔧 ОТКРЫТИЕ ПОРТОВ

Не забудьте открыть порты в firewall:

```bash
# Ubuntu/Debian
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

---

## 📞 ВОЗМОЖНЫЕ ПРОБЛЕМЫ

### Проблема: Let's Encrypt не работает с IP
**Решение:** Привязать домен или использовать самоподписанный сертификат

### Проблема: 1С не отвечает через прокси
**Решение:** Проверить что 1С слушает на `127.0.0.1:3240` и доступен локально

### Проблема: CORS ошибки
**Решение:** Добавить CORS заголовки в NGINX (см. конфиг выше)

---

## ⏱️ ВРЕМЯ ВЫПОЛНЕНИЯ
- С доменом + Let's Encrypt: 15-20 минут
- Без домена + самоподписанный: 10 минут
- Через IIS (Windows): 5 минут

---

## 💰 СТОИМОСТЬ
- Let's Encrypt: **Бесплатно**
- Самоподписанный: **Бесплатно**
- Коммерческий SSL: от $50/год

