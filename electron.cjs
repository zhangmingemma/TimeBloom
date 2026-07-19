const { app, BrowserWindow, Menu, ipcMain, Notification, shell, powerMonitor, net, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');
const http = require('http');

// Load .env file without external dependencies
(function loadEnv() {
  const candidates = [
    path.join(__dirname, '.env'),
    path.join(app.getAppPath(), '.env'),
    path.join(app.getPath('userData'), '.env'),
  ];
  for (const envPath of candidates) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx === -1) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) process.env[key] = val;
        }
        break;
      }
    } catch (_) {}
  }
})();

const isDev = !app.isPackaged;
const APP_ICON = path.join(__dirname, 'build', 'icon.png');

app.commandLine.appendSwitch('force-gpu-mem-available-mb', '512');

app.setName('TimeBloom');

// ── File-based data store ─────────────────────────────────────────────────
const DATA_FILE = path.join(app.getPath('userData'), 'timebloom-data.json');

ipcMain.handle('store:load', () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[store:load] error:', e.message);
  }
  return null;
});

ipcMain.handle('store:save', (_, data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[store:save] error:', e.message);
    return false;
  }
});

ipcMain.handle('store:path', () => DATA_FILE);

// ── Activity Tracker ──────────────────────────────────────────────────────

const SCAN_ROOT = process.env.SCAN_ROOT || path.join(os.homedir(), 'Desktop');
const MAX_DEPTH = parseInt(process.env.SCAN_DEPTH, 10) || 3;

async function findGitRepos(dir, depth = 0) {
  if (depth > MAX_DEPTH) return [];
  const repos = [];
  try {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      try {
        await fsPromises.access(path.join(full, '.git'));
        repos.push(full);
      } catch (_) {
        repos.push(...await findGitRepos(full, depth + 1));
      }
    }
  } catch (_) { /* permission denied etc. */ }
  return repos;
}

async function getGitUser(repoPath) {
  try {
    const { stdout } = await execAsync('git config user.name', { cwd: repoPath, encoding: 'utf8' });
    return stdout.trim();
  } catch (_) { return null; }
}

function pad(n) { return String(n).padStart(2, '0'); }

async function collectTimeMarkers(repoPath, date) {
  const dayStart = new Date(`${date}T00:00:00`).getTime();
  const dayEnd   = new Date(`${date}T23:59:59`).getTime();
  const markers = [];

  try {
    const { stdout: reflog } = await execAsync(
      `git reflog --format="%ci" --all --since="${date} 00:00" --until="${date} 23:59"`,
      { cwd: repoPath, encoding: 'utf8', timeout: 5000 }
    );
    if (reflog.trim()) {
      for (const line of reflog.trim().split('\n')) {
        const t = new Date(line.trim()).getTime();
        if (t >= dayStart && t <= dayEnd) markers.push(t);
      }
    }
  } catch (_) { /* reflog may fail on shallow clones */ }

  try {
    const { stdout: dirty } = await execAsync(
      'git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null',
      { cwd: repoPath, encoding: 'utf8', timeout: 3000 }
    );
    if (dirty.trim()) {
      for (const f of [...new Set(dirty.trim().split('\n'))]) {
        try {
          const stat = await fsPromises.stat(path.join(repoPath, f));
          const mt = stat.mtime.getTime();
          if (mt >= dayStart && mt <= dayEnd) markers.push(mt);
        } catch (_) { /* deleted file */ }
      }
    }
  } catch (_) { /* no HEAD yet */ }

  return markers;
}

async function scanGitForDate(date) {
  const repos = await findGitRepos(SCAN_ROOT);

  const results = await Promise.allSettled(repos.map(async (repoPath) => {
    const author = await getGitUser(repoPath);
    if (!author) return null;

    let raw = '';
    try {
      const { stdout } = await execAsync(
        `git log --author="${author}" --since="${date} 00:00" --until="${date} 23:59" --format="%H|%aI|%s" --all`,
        { cwd: repoPath, encoding: 'utf8', timeout: 5000 }
      );
      raw = stdout.trim();
    } catch (_) { /* no commits is ok */ }

    const commits = raw
      ? raw.split('\n').map((line) => {
          const [hash, iso, ...msgParts] = line.split('|');
          return { hash, time: new Date(iso), message: msgParts.join('|') };
        }).sort((a, b) => a.time - b.time)
      : [];

    const extraMarkers = await collectTimeMarkers(repoPath, date);
    const commitMarkers = commits.map((c) => c.time.getTime());
    const allMarkers = [...new Set([...commitMarkers, ...extraMarkers])].sort((a, b) => a - b);

    if (allMarkers.length === 0) return null;

    const repoName = path.basename(repoPath);
    const earliest = new Date(allMarkers[0]);
    const latest   = new Date(allMarkers[allMarkers.length - 1]);

    if (latest.getTime() === earliest.getTime()) {
      latest.setMinutes(latest.getMinutes() + 10);
    }

    const notesLines = [];
    if (commits.length > 0) {
      notesLines.push(`Commits (${commits.length}):`);
      notesLines.push(...commits.map(
        (c) => `  ${pad(c.time.getHours())}:${pad(c.time.getMinutes())} ${c.message}`
      ));
    }
    const fileCount = allMarkers.length - commitMarkers.length;
    if (fileCount > 0) {
      notesLines.push(`文件编辑: ${fileCount} 个时间点`);
    }

    return {
      id: `git-${repoName}-${date}`,
      title: `${repoName} 开发`,
      date,
      startTime: `${pad(earliest.getHours())}:${pad(earliest.getMinutes())}`,
      endTime: `${pad(latest.getHours())}:${pad(latest.getMinutes())}`,
      notes: notesLines.join('\n'),
      source: 'git',
      sourceId: `git:${repoName}:${date}`,
      repoPath,
      commitCount: commits.length,
    };
  }));

  const activities = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      activities.push(result.value);
    }
  }
  return activities;
}

ipcMain.handle('tracker:scan', async (_, date) => {
  try {
    const activities = await scanGitForDate(date);
    return { ok: true, activities };
  } catch (e) {
    console.error('[tracker:scan] error:', e.message);
    return { ok: false, activities: [], error: e.message };
  }
});

// ── Window ────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 20 },
    backgroundColor: '#ffffff',
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  Menu.setApplicationMenu(null);
}

// ── Scheduled daily scan at 11:00 (polling-based, robust against sleep/wake) ──

const SCHEDULED_HOUR = 11;
const SCHEDULED_MINUTE = 0;

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const SCAN_STATE_FILE = path.join(app.getPath('userData'), 'scan-state.json');

function loadScanState() {
  try {
    if (fs.existsSync(SCAN_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(SCAN_STATE_FILE, 'utf8'));
    }
  } catch (_) {}
  return { lastScanDate: null };
}

function saveScanState(state) {
  try {
    fs.writeFileSync(SCAN_STATE_FILE, JSON.stringify(state), 'utf8');
  } catch (_) {}
}

let scanState = loadScanState();

function checkAndRunScan() {
  const now = new Date();
  const today = getToday();

  if (now.getHours() > SCHEDULED_HOUR ||
      (now.getHours() === SCHEDULED_HOUR && now.getMinutes() >= SCHEDULED_MINUTE)) {
    if (scanState.lastScanDate !== today) {
      scanState.lastScanDate = today;
      saveScanState(scanState);
      runScheduledScan();
    }
  }
}

let scanCheckInterval = null;

function startScanChecker() {
  checkAndRunScan();
  scanCheckInterval = setInterval(checkAndRunScan, 60_000);
}

async function runScheduledScan() {
  const yesterday = getYesterday();
  try {
    const activities = await scanGitForDate(yesterday);

    if (activities.length === 0) return;

    const notification = new Notification({
      title: 'TimeBloom - 昨日活动检测',
      body: `检测到 ${activities.length} 条 Git 工作记录，点击查看并导入`,
      silent: false,
    });

    notification.on('click', () => {
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0) {
        const win = wins[0];
        win.show();
        win.focus();
        win.webContents.send('tracker:open-import', yesterday);
      }
    });

    notification.show();
  } catch (e) {
    console.error('[scheduled-scan] error:', e.message);
  }
}

// ── Feishu Calendar Integration ─────────────────────────────────────────────

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_REDIRECT_PORT = 19876;
const FEISHU_REDIRECT_URI = `http://localhost:${FEISHU_REDIRECT_PORT}/callback`;

const TOKEN_FILE = path.join(app.getPath('userData'), 'feishu-token.json');

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    }
  } catch (_) {}
  return null;
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
}

function clearTokens() {
  try { fs.unlinkSync(TOKEN_FILE); } catch (_) {}
}

async function feishuRequest(method, urlPath, body, accessToken) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    // Electron's network stack follows the OS proxy configuration, unlike
    // Node's https module. This keeps Feishu working on proxied networks.
    const req = net.request({
      method,
      url: `https://open.feishu.cn${urlPath}`,
    });
    req.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (accessToken) req.setHeader('Authorization', `Bearer ${accessToken}`);
    if (data) req.setHeader('Content-Length', String(Buffer.byteLength(data)));

    req.on('response', (res) => {
      let chunks = '';
      res.on('data', (chunk) => { chunks += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); }
        catch (_) { reject(new Error(`Invalid JSON: ${chunks.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function refreshUserToken(refreshToken) {
  const resp = await feishuRequest('POST', '/open-apis/authen/v1/oidc/refresh_access_token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }, await getAppAccessToken());

  if (resp.code === 0 && resp.data) {
    const tokens = {
      access_token: resp.data.access_token,
      refresh_token: resp.data.refresh_token,
      expires_at: Date.now() + (resp.data.expires_in - 300) * 1000,
    };
    saveTokens(tokens);
    return tokens;
  }
  return null;
}

async function getAppAccessToken() {
  const resp = await feishuRequest('POST', '/open-apis/auth/v3/app_access_token/internal', {
    app_id: FEISHU_APP_ID,
    app_secret: FEISHU_APP_SECRET,
  });
  if (resp.code === 0) return resp.app_access_token;
  throw new Error(`Failed to get app_access_token: ${resp.msg}`);
}

async function getUserAccessToken() {
  const tokens = loadTokens();
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at) return tokens.access_token;
  const refreshed = await refreshUserToken(tokens.refresh_token);
  return refreshed ? refreshed.access_token : null;
}

ipcMain.handle('calendar:status', async () => {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    return { authed: false, reason: 'no_credentials' };
  }
  const token = await getUserAccessToken().catch(() => null);
  return { authed: !!token };
});

ipcMain.handle('calendar:auth', async () => {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    return { ok: false, error: '未配置飞书 App ID / Secret，请检查 .env 文件' };
  }

  return new Promise((resolve) => {
    let server;
    const timeout = setTimeout(() => {
      if (server) server.close();
      resolve({ ok: false, error: '授权超时，请重试' });
    }, 120_000);

    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${FEISHU_REDIRECT_PORT}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400);
        res.end('Missing code');
        resolve({ ok: false, error: 'Missing authorization code' });
        clearTimeout(timeout);
        server.close();
        return;
      }

      try {
        const appToken = await getAppAccessToken();
        const resp = await feishuRequest('POST', '/open-apis/authen/v1/oidc/access_token', {
          grant_type: 'authorization_code',
          code,
        }, appToken);

        if (resp.code === 0 && resp.data) {
          const tokens = {
            access_token: resp.data.access_token,
            refresh_token: resp.data.refresh_token,
            expires_at: Date.now() + (resp.data.expires_in - 300) * 1000,
          };
          saveTokens(tokens);

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body><h2>授权成功！</h2><p>请返回 TimeBloom 应用。</p><script>setTimeout(()=>window.close(),2000)</script></body></html>');
          resolve({ ok: true });
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body><h2>授权失败</h2><p>${resp.msg || '未知错误'}</p></body></html>`);
          resolve({ ok: false, error: resp.msg || 'Token exchange failed' });
        }
      } catch (e) {
        res.writeHead(500);
        res.end('Internal error');
        resolve({ ok: false, error: e.message });
      }

      clearTimeout(timeout);
      server.close();
    });

    server.listen(FEISHU_REDIRECT_PORT, () => {
      const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${FEISHU_APP_ID}&redirect_uri=${encodeURIComponent(FEISHU_REDIRECT_URI)}&scope=calendar:calendar:readonly`;
      shell.openExternal(authUrl);
    });

    server.on('error', (e) => {
      clearTimeout(timeout);
      resolve({ ok: false, error: `无法启动回调服务器: ${e.message}` });
    });
  });
});

ipcMain.handle('calendar:scan', async (_, date) => {
  try {
    const token = await getUserAccessToken();
    if (!token) return { ok: false, activities: [], error: '未授权，请先登录飞书' };

    const dayStartTs = Math.floor(new Date(`${date}T00:00:00`).getTime() / 1000);
    const dayEndTs = Math.floor(new Date(`${date}T23:59:59`).getTime() / 1000);

    // Use instance_view endpoint to get expanded recurring event instances
    let allEvents = [];
    let pageToken = '';
    let maxPages = 10;

    while (maxPages-- > 0) {
      const url = `/open-apis/calendar/v4/calendars/primary/events/instance_view?start_time=${dayStartTs}&end_time=${dayEndTs}&page_size=200${pageToken ? '&page_token=' + pageToken : ''}`;
      const resp = await feishuRequest('GET', url, null, token);

      if (resp.code !== 0) {
        // Fallback to regular events endpoint if instance_view not available
        if (resp.code === 99991400 || resp.code === 10003) {
          return await scanCalendarFallback(token, date, dayStartTs, dayEndTs);
        }
        return { ok: false, activities: [], error: resp.msg || '获取日历失败' };
      }

      const items = resp.data?.items || [];
      allEvents.push(...items);

      if (resp.data?.has_more && resp.data?.page_token) {
        pageToken = resp.data.page_token;
      } else {
        break;
      }
    }

    const activities = parseCalendarEvents(allEvents, date);

    // Debug log
    const debugFile = path.join(app.getPath('userData'), 'calendar-debug.json');
    try {
      fs.writeFileSync(debugFile, JSON.stringify({
        date, endpoint: 'instance_view', totalEvents: allEvents.length,
        activitiesCount: activities.length,
        sampleEvents: allEvents.slice(0, 5).map((ev) => ({
          summary: ev.summary, start_time: ev.start_time, event_id: ev.event_id,
        })),
      }, null, 2), 'utf8');
    } catch (_) {}

    return { ok: true, activities };
  } catch (e) {
    console.error('[calendar:scan] error:', e.message);
    return { ok: false, activities: [], error: e.message };
  }
});

async function scanCalendarFallback(token, date, dayStartTs, dayEndTs) {
  // Fallback: use regular events endpoint
  let allEvents = [];
  let pageToken = '';
  let maxPages = 10;

  while (maxPages-- > 0) {
    const url = `/open-apis/calendar/v4/calendars/primary/events?start_time=${dayStartTs}&end_time=${dayEndTs}&page_size=200${pageToken ? '&page_token=' + pageToken : ''}`;
    const resp = await feishuRequest('GET', url, null, token);
    if (resp.code !== 0) {
      return { ok: false, activities: [], error: resp.msg || '获取日历失败' };
    }
    const items = resp.data?.items || [];
    allEvents.push(...items);
    if (resp.data?.has_more && resp.data?.page_token) {
      pageToken = resp.data.page_token;
    } else {
      break;
    }
  }

  return { ok: true, activities: parseCalendarEvents(allEvents, date) };
}

function parseCalendarEvents(allEvents, date) {
  return allEvents
    .filter((ev) => {
      if (!ev.summary) return false;
      if (!ev.start_time) return false;
      if (ev.start_time.date) {
        return ev.start_time.date === date;
      }
      if (ev.start_time.timestamp) {
        const ts = Number(ev.start_time.timestamp);
        if (!ts || isNaN(ts)) return false;
        const ms = ts > 9999999999 ? ts : ts * 1000;
        const d = new Date(ms);
        const evDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        return evDate === date;
      }
      return false;
    })
    .map((ev) => {
      let start, end;

      if (ev.start_time.date) {
        start = new Date(`${ev.start_time.date}T00:00:00`);
      } else {
        const ts = Number(ev.start_time.timestamp);
        start = new Date((ts > 9999999999 ? ts : ts * 1000));
      }

      if (ev.end_time?.date) {
        end = new Date(`${ev.end_time.date}T23:59:00`);
      } else if (ev.end_time?.timestamp) {
        const ets = Number(ev.end_time.timestamp);
        end = new Date((ets > 9999999999 ? ets : ets * 1000));
      } else {
        end = new Date(start.getTime() + 30 * 60 * 1000);
      }

      return {
        id: `cal-${ev.event_id}`,
        title: ev.summary,
        date,
        startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        notes: ev.description || '',
        source: 'calendar',
        sourceId: `calendar:${ev.event_id}`,
      };
    });
}

ipcMain.handle('calendar:logout', () => {
  clearTokens();
  return { ok: true };
});

// ── App lifecycle ─────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const icon = nativeImage.createFromPath(APP_ICON);
  if (!icon.isEmpty() && process.platform === 'darwin') {
    app.dock.setIcon(icon);
  }

  createWindow();
  startScanChecker();
  powerMonitor.on('resume', () => {
    checkAndRunScan();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
