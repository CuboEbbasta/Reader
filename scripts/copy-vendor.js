/**
 * Copia i file "plugin.js" (bundle IIFE, senza bisogno di un bundler tipo Webpack/Vite)
 * di Capacitor dentro www/js/vendor, cosi' index.html puo' includerli con normali <script>.
 *
 * Va eseguito automaticamente ad ogni "npm install" (vedi "postinstall" in package.json),
 * e puo' anche essere lanciato a mano con: npm run sync:vendor
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const destDir = path.join(root, 'www', 'js', 'vendor');

fs.mkdirSync(destDir, { recursive: true });

const files = [
  ['@capacitor/core/dist/capacitor.js', 'capacitor-core.js'],
  ['@capacitor/local-notifications/dist/plugin.js', 'plugin-local-notifications.js'],
  ['@capacitor/preferences/dist/plugin.js', 'plugin-preferences.js'],
  ['@capacitor/filesystem/dist/plugin.js', 'plugin-filesystem.js'],
  ['@capacitor/share/dist/plugin.js', 'plugin-share.js'],
];

let copiati = 0;
for (const [src, destName] of files) {
  const srcPath = path.join(root, 'node_modules', src);
  const destPath = path.join(destDir, destName);
  if (!fs.existsSync(srcPath)) {
    console.warn(`[copy-vendor] ATTENZIONE: non trovato ${srcPath} (hai lanciato "npm install"?)`);
    continue;
  }
  fs.copyFileSync(srcPath, destPath);
  copiati++;
}

console.log(`[copy-vendor] Copiati ${copiati}/${files.length} file in www/js/vendor`);
