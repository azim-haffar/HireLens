export function startKeepalive() {
  const BACKEND_URL = import.meta.env.VITE_API_URL;
  // Ping every 10 minutes to prevent Render free tier sleep
  setInterval(() => {
    fetch(`${BACKEND_URL}/health`).catch(() => {});
  }, 10 * 60 * 1000);
}
