const fs = require('fs');
const path = require('path');

const domWebviewPath = path.join(process.cwd(), 'node_modules', '@expo', 'dom-webview');

try {
  fs.rmSync(domWebviewPath, { recursive: true, force: true });

  if (fs.existsSync(domWebviewPath)) {
    throw new Error(`${domWebviewPath} still exists after removal`);
  }

  console.log('[postinstall] Ensured @expo/dom-webview is absent.');
} catch (error) {
  console.error(
    '[postinstall] Failed to remove @expo/dom-webview:',
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
}
