export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        --bg: #F8F9FA;
        --fg: #212529;
        --muted: #6C757D;
        --border: #ADB5BD;
        --primary: #1A5FA8;
        --primary-dark: #0D3F75;
        --card: #ffffff;
      }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #212529; --fg: #F8F9FA; --muted: #ADB5BD; --border: rgba(255,255,255,0.15); --card: #343A40; }
      }
      body { font: 15px/1.5 "DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--fg); display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-family: "Playfair Display", ui-serif, Georgia, serif; font-size: 1.5rem; margin: 0 0 0.5rem; letter-spacing: -0.01em; }
      p { color: var(--muted); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 12px; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: var(--primary); color: #fff; }
      .primary:hover { background: var(--primary-dark); }
      .secondary { background: var(--card); color: var(--fg); border-color: var(--border); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
