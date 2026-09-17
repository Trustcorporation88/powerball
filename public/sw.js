/**
 * Service worker do app de loterias.
 *
 * Estratégias, por tipo de recurso:
 *  - navegação: rede primeiro, cache como rede de segurança. Evita servir um
 *    index.html velho apontando para bundles que não existem mais.
 *  - assets com hash no nome: cache primeiro, porque o nome muda a cada build.
 *  - histórico das loterias: cache primeiro com revalidação em segundo plano,
 *    já que a base só cresce no fim.
 *
 * O `CACHE_VERSION` precisa mudar a cada alteração deste arquivo para que os
 * caches antigos sejam descartados na ativação.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `loterias-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `loterias-assets-${CACHE_VERSION}`;

const SHELL_URLS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves
            .filter((chave) => chave !== SHELL_CACHE && chave !== ASSET_CACHE)
            .map((chave) => caches.delete(chave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Deep link offline ainda deve abrir o app: o roteamento é do cliente.
    if (request.mode === 'navigate') {
      const shell = await caches.match('/');
      if (shell) return shell;
    }

    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});

/** Aviso de novo resultado disparado pela aba aberta. */
self.addEventListener('message', (event) => {
  const dados = event.data;
  if (!dados || dados.type !== 'NOVO_RESULTADO') return;

  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: dados.tag ?? 'resultado-loteria',
      data: { url: dados.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      for (const cliente of clientes) {
        if ('focus' in cliente) {
          cliente.navigate(destino);
          return cliente.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
