/**
 * Polyfill cho một số thư viện crypto/browser (ví dụ: `sockjs-client` -> `browser-crypto.js`)
 * kỳ vọng biến toàn cục `global` như trong môi trường Node.js.
 *
 * Quan trọng: file này phải được import ở đầu entrypoint (`src/main.ts`) để chạy trước khi
 * `sockjs-client`/`browser-crypto.js` được eval.
 */

const g = globalThis as unknown as { global?: unknown };
if (typeof g.global === 'undefined') {
  g.global = g;
}

if (typeof window !== 'undefined') {
  const w = window as unknown as { global?: unknown };
  if (typeof w.global === 'undefined') {
    w.global = g;
  }
}

// Một số bundle đọc trực tiếp identifier `global` (free variable).
// Indirect eval tạo binding ở global scope (nếu trình duyệt cho phép).
try {
  (0, eval)('var global = globalThis;');
} catch {
  // ignore
}

