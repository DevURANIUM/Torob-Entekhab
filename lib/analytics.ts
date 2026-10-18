export async function track(name: string, value?: string): Promise<boolean> {
  return fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, value }),
    keepalive: true,
  })
    .then((response) => response.ok)
    .catch(() => false);
}
