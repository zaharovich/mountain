/**
 * Cloudflare Worker - HTTPS Proxy для 1С API
 * 
 * ІНСТРУКЦІЯ:
 * 1. Зайди на https://workers.cloudflare.com/
 * 2. Створи новий Worker
 * 3. Скопіюй цей код
 * 4. Замінь USERNAME та PASSWORD на свої креди
 * 5. Deploy
 * 6. Отримаєш URL типу: https://store-proxy.твій-subdomain.workers.dev
 */

// ════════════════════════════════════════════════
// 🔐 КРЕДИ ВСТАВЛЕНІ
// ════════════════════════════════════════════════
const USERNAME = 'ItsLogin!#%Motherfucker';
const PASSWORD = 'ThatIs%Passoword99123~';
// ════════════════════════════════════════════════

const API_URL = 'http://45.154.116.216:3240/tt.json';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Дозволяємо CORS для всіх доменів
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }

  try {
    // Створюємо Basic Auth заголовок
    const auth = btoa(`${USERNAME}:${PASSWORD}`)
    
    // Запит до 1С API з авторизацією
    const response = await fetch(API_URL, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'Mozilla/5.0 (compatible; StoreLocator/1.0)',
      }
    })

    // Отримуємо дані
    const data = await response.text()

    // Перевіряємо чи це JSON
    try {
      JSON.parse(data)
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Отримані дані не є валідним JSON',
        status: response.status,
        data: data.substring(0, 500)
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Все ОК - повертаємо дані з CORS
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // Кеш на 5 хвилин
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Помилка підключення до 1С',
      message: error.message
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}

