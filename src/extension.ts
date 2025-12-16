import * as vscode from "vscode";

/* ================== STATE ================== */

let codingSeconds = 0;
let isPaused = false;

let pomodoroSeconds = 25 * 60;
let pomodoroRunning = false;

let codingInterval: NodeJS.Timeout;
let pomodoroInterval: NodeJS.Timeout;

let statusBar: vscode.StatusBarItem;

/* ================== ACTIVATE ================== */

export function activate(context: vscode.ExtensionContext) {
  codingSeconds = context.globalState.get<number>("codingSeconds", 0);
  pomodoroSeconds = context.globalState.get<number>("pomodoroSeconds", 25 * 60);
  pomodoroRunning = context.globalState.get<boolean>("pomodoroRunning", false);

  /* ---------- STATUS BAR ---------- */
  statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBar.text = `⏱ ${format(codingSeconds)}`;
  statusBar.show();
  context.subscriptions.push(statusBar);

  /* ---------- CODING TIMER ---------- */
  codingInterval = setInterval(() => {
    if (!isPaused) {
      codingSeconds++;
      statusBar.text = `⏱ ${format(codingSeconds)}`;
      context.globalState.update("codingSeconds", codingSeconds);
      updateDailyStats(context);
    }
  }, 1000);

  /* ---------- POMODORO TIMER ---------- */
  pomodoroInterval = setInterval(() => {
    if (pomodoroRunning && pomodoroSeconds > 0) {
      pomodoroSeconds--;
      context.globalState.update("pomodoroSeconds", pomodoroSeconds);
    }

    if (pomodoroRunning && pomodoroSeconds === 0) {
      pomodoroRunning = false;
      context.globalState.update("pomodoroRunning", false);
      vscode.window.showInformationMessage("🍅 Pomodoro complete!");
    }
  }, 1000);

  /* ---------- SIDEBAR VIEW ---------- */
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "codingTrackerView",
      new CodingViewProvider(context)
    )
  );
}

/* ================== DEACTIVATE ================== */

export function deactivate() {
  clearInterval(codingInterval);
  clearInterval(pomodoroInterval);
}

/* ================== VIEW PROVIDER ================== */

class CodingViewProvider implements vscode.WebviewViewProvider {
  constructor(private context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = { enableScripts: true };

    view.webview.onDidReceiveMessage((msg) => {
      if (msg.command === "pause") isPaused = true;
      if (msg.command === "resume") isPaused = false;

      if (msg.command === "startPomodoro") {
        pomodoroRunning = true;
        this.context.globalState.update("pomodoroRunning", true);
      }

      if (msg.command === "resetPomodoro") {
        pomodoroRunning = false;
        pomodoroSeconds = 25 * 60;
        this.context.globalState.update("pomodoroSeconds", pomodoroSeconds);
        this.context.globalState.update("pomodoroRunning", false);
      }
    });

    const sendUpdate = () => {
      view.webview.postMessage({
        codingSeconds,
        pomodoroSeconds,
        stats: getStats(this.context),
        rawStats: this.context.globalState.get<Record<string, number>>(
          "stats",
          {}
        ),
      });
    };

    setInterval(sendUpdate, 1000);
    sendUpdate();

    view.webview.html = getHtml();
  }
}

/* ================== STATS ================== */

function updateDailyStats(context: vscode.ExtensionContext) {
  const today = new Date().toISOString().slice(0, 10);
  const stats = context.globalState.get<Record<string, number>>("stats", {});
  stats[today] = (stats[today] || 0) + 1;
  context.globalState.update("stats", stats);
}

function getStats(context: vscode.ExtensionContext) {
  const stats = context.globalState.get<Record<string, number>>("stats", {});
  const today = new Date().toISOString().slice(0, 10);

  const todaySeconds = stats[today] || 0;

  const weekSeconds = Object.entries(stats)
    .filter(([d]) => isThisWeek(d))
    .reduce((a, [, v]) => a + v, 0);

  const totalSeconds = Object.values(stats).reduce((a, v) => a + v, 0);

  return {
    today: format(todaySeconds),
    week: format(weekSeconds),
    total: format(totalSeconds),
  };
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  return d >= weekAgo && d <= now;
}

/* ================== HELPERS ================== */

function format(sec: number): string {
  return new Date(sec * 1000).toISOString().substr(11, 8);
}

/* ================== HTML ================== */

function getHtml(): string {
  return `
<!DOCTYPE html>
<html>
  <head>
  <style>
  :root {
    --card-bg: var(--vscode-editorWidget-background);
    --muted: var(--vscode-descriptionForeground);
    --accent: var(--vscode-button-background);
  }

  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont;
    padding: 12px;
    color: var(--vscode-foreground);
    background: transparent;
  }

  .section {
    margin-bottom: 16px;
  }

  .card {
    background: var(--card-bg);
    border-radius: 10px;
    padding: 12px;
    box-shadow: inset 0 0 0 1px var(--vscode-widget-border);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 6px;
  }

  .value {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  button {
    flex: 1;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 12px;
    cursor: pointer;
  }

  button.primary {
    background: var(--accent);
    color: var(--vscode-button-foreground);
  }

  button:hover {
    opacity: 0.9;
  }

  /* ===== STATS ===== */

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 8px;
  }

  .stat {
    text-align: center;
  }

  .stat .label {
    font-size: 11px;
    color: var(--muted);
  }

  .stat .number {
    font-size: 14px;
    font-weight: 600;
  }

  /* ===== HEATMAP ===== */

  .heatmap {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
    margin-top: 10px;
  }

  .day {
    aspect-ratio: 1;
    border-radius: 3px;
    background: var(--vscode-editor-background);
  }

  .day[data-level="1"] { background: rgba(0, 200, 0, 0.25); }
  .day[data-level="2"] { background: rgba(0, 200, 0, 0.45); }
  .day[data-level="3"] { background: rgba(0, 200, 0, 0.7); }
  </style>
  </head>

  <body>

  <!-- CODING SESSION -->
  <div class="section card">
    <div class="header">
      <span>⏱ Coding Session</span>
    </div>
    <div id="session" class="value">00:00:00</div>
    <div class="actions">
      <button onclick="pause()">Pause</button>
      <button onclick="resume()">Resume</button>
    </div>
  </div>

  <!-- POMODORO -->
  <div class="section card">
    <div class="header">
      <span>🍅 Pomodoro</span>
    </div>
    <div id="pomodoro" class="value">25:00</div>
    <div class="actions">
      <button class="primary" onclick="startPomodoro()">Start</button>
      <button onclick="resetPomodoro()">Reset</button>
    </div>
  </div>

  <!-- STATS -->
  <div class="section card">
    <div class="header">
      <span>📊 Stats</span>
    </div>
    <div class="stats">
      <div class="stat">
        <div class="label">Today</div>
        <div id="today" class="number">00:00</div>
      </div>
      <div class="stat">
        <div class="label">Week</div>
        <div id="week" class="number">00:00</div>
      </div>
      <div class="stat">
        <div class="label">Total</div>
        <div id="total" class="number">00:00</div>
      </div>
    </div>
  </div>

  <!-- HEATMAP -->
  <div class="section card">
    <div class="header">
      <span>🔥 Last 30 Days</span>
    </div>
    <div id="heatmap" class="heatmap"></div>
  </div>

  <script>
  const vscode = acquireVsCodeApi();

  window.addEventListener("message", (event) => {
    const { codingSeconds, pomodoroSeconds, stats, rawStats } = event.data;

    document.getElementById("session").textContent =
      new Date(codingSeconds * 1000).toISOString().substr(11,8);

    const m = Math.floor(pomodoroSeconds / 60);
    const s = pomodoroSeconds % 60;
    document.getElementById("pomodoro").textContent =
      String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");

    today.textContent = stats.today;
    week.textContent = stats.week;
    total.textContent = stats.total;

    renderHeatmap(rawStats);
  });

  function renderHeatmap(stats) {
    heatmap.innerHTML = "";
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0,10);
      const sec = stats[key] || 0;

      let level = 0;
      if (sec > 0) level = 1;
      if (sec > 1800) level = 2;
      if (sec > 3600) level = 3;

      const el = document.createElement("div");
      el.className = "day";
      el.dataset.level = level;
      heatmap.appendChild(el);
    }
  }

  function pause(){ vscode.postMessage({command:"pause"}); }
  function resume(){ vscode.postMessage({command:"resume"}); }
  function startPomodoro(){ vscode.postMessage({command:"startPomodoro"}); }
  function resetPomodoro(){ vscode.postMessage({command:"resetPomodoro"}); }
  </script>

  </body>
</html>
`;
}

