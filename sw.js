/* Service worker do site da LAAUSP.

   Objetivo principal: a carteirinha abrir no ginásio, onde quase nunca há
   sinal. As páginas e os dados ficam em cache; as leituras seguem online. */

const CACHE = "laausp-v4";

const ESSENCIAIS = [
  "./",
  "index.html",
  "atleta.html",
  "jogos.html",
  "calendario.html",
  "regulamento.html",
  "contato.html",
  "manifest.webmanifest",
  "assets/css/style.css",
  "assets/favicon.svg",
  "assets/js/liga.js",
  "assets/js/atletas.js",
  "assets/js/carteirinha.js",
  "assets/js/cores.js",
  "assets/js/cartao-imagem.js",
  "assets/js/fidelidade.js",
  "assets/js/feedback.js",
  "assets/js/config.js",
  "assets/vendor/zxing.js",
  "assets/vendor/qrcode.js",
  "data/atleticas.json",
  "data/liga.json",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ESSENCIAIS).catch(() => undefined))
      .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  // Dados: rede primeiro, para a tabela e a filiação chegarem atualizadas.
  if (request.url.includes("/data/")) {
    evento.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
          return resposta;
        })
        .catch(() => caches.match(request)));
    return;
  }

  // Páginas e código: cache primeiro, revalidando em segundo plano.
  evento.respondWith(
    caches.match(request).then((emCache) => {
      const daRede = fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
          return resposta;
        })
        .catch(() => emCache);
      return emCache || daRede;
    }));
});
