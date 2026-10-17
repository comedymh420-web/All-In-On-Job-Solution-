
const CACHE_NAME = "job-solution-v2";
const OFFLINE_PAGE = "./offline.html";

const APP_SHELL = [
  "./",
  "./offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // মূল পেজ ও অফলাইন পেজ ক্যাশ করার চেষ্টা
    await Promise.all(
      APP_SHELL.map(async (url) => {
        try {
          const response = await fetch(url, { cache: "reload" });

          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          console.log("Precache failed:", url);
        }
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) =>
          key.startsWith("job-solution-") &&
          key !== CACHE_NAME
        )
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // অন্য ওয়েবসাইটের রিকোয়েস্ট এই নিয়মে ক্যাশ হবে না
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        const cachedPage = await cache.match(request);

        if (cachedPage) return cachedPage;

        const homePage = await cache.match("./");

        if (homePage) return homePage;

        const offlinePage = await cache.match(OFFLINE_PAGE);

        if (offlinePage) return offlinePage;

        return new Response(
          "ইন্টারনেট সংযোগ নেই। আগে পেজটি অনলাইনে খুলে নিন।",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      }
    })());

    return;
  }

  // একই সাইটের CSS, JavaScript, ছবি ইত্যাদির ক্যাশ
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) return cachedResponse;

    try {
      const response = await fetch(request);

      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      return new Response("", { status: 503 });
    }
  })());
});
