/* Seed Connection — only public, non-sensitive Web Push messages.
 * This worker cannot access login tokens, session data, or Supabase. */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const safePaths = ["/tarefas", "/agenda", "/configuracoes"];
  const path = safePaths.includes(payload.url) ? payload.url : "/tarefas";
  const tag = typeof payload.tag === "string" ? payload.tag.slice(0, 140) : "seed-push";
  event.waitUntil(self.registration.showNotification("Seed Connection", {
    body: "Há uma atualização que precisa da sua atenção.",
    icon: "/favicon.png", badge: "/favicon.png",
    tag, renotify: false,
    data: { path },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const path = event.notification.data?.path || "/tarefas";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(path);
      await existing.focus();
      return;
    }
    await self.clients.openWindow(path);
  })());
});
