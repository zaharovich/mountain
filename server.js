/**
 * Store Locator Backend Server
 * Node.js + Express для локального тестирования
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// IP Location Cache - для перевірки та обмеження запитів
const ipLocationCache = new Map();
const IP_LOCATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 години
const MAX_LOCATIONS_PER_IP = 3;
const LOCATION_RADIUS = 1; // км

// Функція для отримання IP адреси клієнта
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.socket.remoteAddress ||
           'unknown';
}

// Функція для розрахунку відстані (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Радіус Землі в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Перевірка IP Protection
function checkIPLocationLimit(ip, latitude, longitude) {
    if (!ipLocationCache.has(ip)) {
        ipLocationCache.set(ip, []);
    }

    const locations = ipLocationCache.get(ip);
    
    // Очищуємо застарілі записи
    const now = Date.now();
    locations.forEach((loc, index) => {
        if (now - loc.timestamp > IP_LOCATION_CACHE_TTL) {
            locations.splice(index, 1);
        }
    });

    // Перевіряємо чи є вже локації в радіусі
    let foundLocations = 0;
    locations.forEach(loc => {
        const distance = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
        if (distance <= LOCATION_RADIUS) {
            foundLocations++;
        }
    });

    if (foundLocations >= MAX_LOCATIONS_PER_IP) {
        return {
            allowed: false,
            reason: 'Забагато запитів з Вашої IP адреси з поблизу. Спробуйте пізніше.'
        };
    }

    // Додаємо нову локацію
    locations.push({
        latitude,
        longitude,
        timestamp: now
    });

    ipLocationCache.set(ip, locations);

    return { allowed: true };
}

// ========== API ENDPOINTS ==========

/**
 * GET /api/tt.json
 * Отдаёт зашифрованные данные магазинов
 */
const path = require('path');
app.get('/api/tt.json', (req, res) => {
    const filePath = path.join(__dirname, 'assets', 'tt.json');
    res.sendFile(filePath);
});

/**
 * GET /api/remote-tt.json
 * Прокси для удаленного JSON (обход CORS) с авторизацией
 */
app.get('/api/remote-tt.json', async (req, res) => {
    try {
        const https = require('https');
        const http = require('http');
        
        const remoteUrl = 'http://45.154.116.216:3240/tt.json';
        console.log('[PROXY] Запрос к:', remoteUrl);
        
        // Basic Auth credentials
        const username = 'ItsLogin!#%Motherfucker';
        const password = 'ThatIs%Passoword99123~';
        const auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
        
        const protocol = remoteUrl.startsWith('https') ? https : http;
        
        const options = {
            headers: {
                'Authorization': auth
            }
        };
        
        protocol.get(remoteUrl, options, (response) => {
            const chunks = [];
            
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            response.on('end', () => {
                try {
                    // Собираем все chunks в Buffer
                    const buffer = Buffer.concat(chunks);
                    
                    // Удаляем BOM если есть (UTF-8 BOM: EF BB BF)
                    let data = buffer;
                    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                        console.log('[PROXY] Обнаружен и удален BOM');
                        data = buffer.slice(3);
                    }
                    
                    // Конвертируем в строку UTF-8
                    const jsonString = data.toString('utf8');
                    const jsonData = JSON.parse(jsonString);
                    
                    console.log('[PROXY] Успешно загружено:', {
                        shops: jsonData.shops?.length || 0,
                        products: jsonData.products?.length || 0,
                        cities: jsonData.cities?.length || 0
                    });
                    res.json(jsonData);
                } catch (error) {
                    console.error('[PROXY] Ошибка парсинга JSON:', error);
                    res.status(500).json({ error: 'Ошибка парсинга JSON: ' + error.message });
                }
            });
        }).on('error', (error) => {
            console.error('[PROXY] Ошибка запроса:', error);
            res.status(500).json({ error: 'Ошибка загрузки данных с удаленного сервера' });
        });
        
    } catch (error) {
        console.error('[PROXY] Критическая ошибка:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/health
 * Перевірка стану сервера
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/check-ip-location
 * Перевірка IP Protection
 */
app.post('/api/check-ip-location', (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const clientIP = getClientIP(req);

        console.log(`[IP CHECK] IP: ${clientIP}, Coords: ${latitude}, ${longitude}`);

        if (!latitude || !longitude) {
            return res.status(400).json({
                allowed: false,
                reason: 'Не задані координати'
            });
        }

        const result = checkIPLocationLimit(clientIP, latitude, longitude);
        res.json(result);
    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({
            allowed: true, // На помилку дозволяємо
            reason: 'Помилка сервера'
        });
    }
});

/**
 * POST /api/location-request
 * Запит про новий магазин / Telegram notification
 */
app.post('/api/location-request', (req, res) => {
    try {
        const { latitude, longitude, feedback, timestamp } = req.body;
        const clientIP = getClientIP(req);

        console.log('[LOCATION REQUEST]');
        console.log(`  IP: ${clientIP}`);
        console.log(`  Coords: ${latitude}, ${longitude}`);
        console.log(`  Feedback: ${feedback}`);
        console.log(`  Timestamp: ${timestamp}`);

        // Тут була б відправка повідомлення на Telegram
        // Для демо просто логуємо

        res.json({
            success: true,
            message: 'Запит прийнятий',
            requestId: Math.random().toString(36).substr(2, 9)
        });
    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Помилка обробки запиту'
        });
    }
});

/**
 * POST /api/send-partner-request
 * Відправка запиту на партнерство в Telegram
 */
app.post('/api/send-partner-request', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Координати не надано'
            });
        }

        const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '5674730866:AAGER4TXhXndbTTbca7BPw8L27tph9KWgSE';
        const chatId = process.env.TELEGRAM_CHAT_ID || '-866954983';
        
        const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        const message = `🚨 ЗАПИТ НА ПАРТНЕРСТВО

Клієнт шукав солодощі але нічого не було неподалік

📍 Координати:
${latitude}, ${longitude}

🗺 Google Maps:
${googleMapsUrl}

⏰ ${new Date().toLocaleString('uk-UA')}`;

        const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        
        const https = require('https');
        const url = require('url');
        
        const params = new URLSearchParams({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        
        const fullUrl = `${telegramUrl}?${params.toString()}`;
        
        https.get(fullUrl, (telegramRes) => {
            let data = '';
            
            telegramRes.on('data', (chunk) => {
                data += chunk;
            });
            
            telegramRes.on('end', () => {
                console.log('[TELEGRAM] Повідомлення відправлено:', {
                    latitude,
                    longitude,
                    googleMapsUrl
                });
                
                res.json({
                    success: true,
                    message: 'Запит успішно відправлено'
                });
            });
        }).on('error', (error) => {
            console.error('[TELEGRAM ERROR]', error);
            res.status(500).json({
                success: false,
                message: 'Помилка відправки в Telegram'
            });
        });
        
    } catch (error) {
        console.error('[ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Помилка сервера'
        });
    }
});

/**
 * GET /
 * Serve index.html
 */
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// ========== ERROR HANDLER ==========

app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({
        error: err.message,
        timestamp: new Date().toISOString()
    });
});

// ========== SERVER START ==========

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  Store Locator Backend Server          ║
║  Запущено на http://localhost:${PORT}  ║
║  API доступно по http://localhost:${PORT}/api/*
║  Frontend: http://localhost:${PORT}     ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM отримано. Завершення роботи...');
    process.exit(0);
});
