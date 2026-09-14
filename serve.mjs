import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const PORT         = 3000;
const PROJECTS_DIR = path.join(__dirname, 'brand_assets', 'projects');

const MIME = {
  '.html': 'text/html', '.css': 'text/css',
  '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.mov': 'video/quicktime', '.mp4': 'video/mp4',
};

function isDir(p)   { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function isImage(f) { return /\.(jpe?g|png|webp)$/i.test(f); }
function isVideo(f) { return /\.(mov|mp4|webm|m4v)$/i.test(f); }
function isMedia(f) { return isImage(f) || isVideo(f); }

// Folder name to display title: "Ardha Road_Tarneit" → "Ardha Road, Tarneit"
function toTitle(name) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Folder name to URL-safe slug for tab filtering
function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Scan brand_assets/projects/{project}/ — one folder per project
function scanPhotos() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  return fs.readdirSync(PROJECTS_DIR)
    .filter(proj => isDir(path.join(PROJECTS_DIR, proj)))
    .sort()
    .map(proj => {
      const projPath = path.join(PROJECTS_DIR, proj);
      const allMedia = fs.readdirSync(projPath).filter(isMedia).sort();

      // cover.jpg/mp4 first, then the rest alphabetically
      const coverFile = allMedia.find(f => /^cover\./i.test(f));
      const rest      = allMedia.filter(f => !/^cover\./i.test(f));
      const ordered   = coverFile ? [coverFile, ...rest] : allMedia;

      const cat    = toSlug(proj);
      const title  = toTitle(proj);
      const photos = ordered.map(f => ({
        src:  `/brand_assets/projects/${encodeURIComponent(proj)}/${encodeURIComponent(f)}`,
        type: isVideo(f) ? 'video' : 'image',
      }));

      return { cat, label: title, title, photos };
    })
    .filter(p => p.photos.length > 0);
}

http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // Live photo scan — no cache so hard refresh always picks up new files
  if (url === '/api/photos') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(scanPhotos()));
    return;
  }

  if (url === '/' || url.endsWith('/')) url += 'index.html';
  const filePath = path.join(__dirname, decodeURIComponent(url));
  const ext      = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
