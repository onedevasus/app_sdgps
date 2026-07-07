const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Kill any process on port 4205
console.log('Killing process on port 4205...');
try {
  const ns = execSync('cmd /c "netstat -ano | findstr :4205 | findstr LISTENING"', { encoding: 'utf8', timeout: 5000 });
  const lines = ns.trim().split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    const pid = lines[0].trim().split(/\s+/).pop();
    if (pid && pid !== '0') {
      execSync(`cmd /c "taskkill /F /PID ${pid}"`, { stdio: 'ignore' });
      console.log(`Killed PID ${pid}`);
    }
  }
} catch (e) {
  console.log('Port 4205 is free');
}

// 2. Clear all Angular caches
const frontendDir = 'D:\\BOULMANE\\PycharmProjects\\perso\\ancfcc\\app-sdgps\\frontend';
const cachePath = path.join(frontendDir, '.angular');
if (fs.existsSync(cachePath)) {
  fs.rmSync(cachePath, { recursive: true, force: true });
  console.log('Cleared .angular cache');
}

// 3. Clear dist (stale builds)
const distPath = path.join(frontendDir, 'dist');
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
  console.log('Cleared dist folder');
}

// 4. Wait for cleanup
execSync('cmd /c "timeout /t 2 /nobreak >nul"', { stdio: 'ignore' });

// 5. Start ng serve
console.log('Starting ng serve...');
const ngPath = path.join(frontendDir, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
execSync(`cmd /c "cd /d ${frontendDir} && start /B node ${ngPath} serve --host 0.0.0.0 --port 4205 --poll 500"`, {
  stdio: 'ignore',
  timeout: 10000,
});
console.log('ng serve started. Waiting for compilation...');

// 6. Wait for server
const maxWait = 90;
for (let i = 0; i < maxWait; i++) {
  try {
    const code = execSync('cmd /c "curl -s -o NUL -w %{http_code} http://localhost:4205/"', {
      encoding: 'utf8',
      timeout: 5000,
    }).trim();
    if (code === '200') {
      console.log(`Dev server ready after ${i + 1}s`);
      process.exit(0);
    }
  } catch (e) {
    // server not ready yet
  }
  execSync('cmd /c "timeout /t 1 /nobreak >nul"', { stdio: 'ignore' });
}
console.error('Dev server failed to start within ' + maxWait + 's');
process.exit(1);
