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
};

const CAT_LABELS = {
  kitchen: 'Kitchen', bathroom: 'Bathroom', builtin: 'Built-Ins',
  commercial: 'Commercial', office: 'Office', robe: 'Robes', laundry: 'Laundry',
};

function isDir(p)   { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function isImage(f) { return /\.(jpe?g|png|webp)$/i.test(f); }

// Slug to Title: "riverside-modern-kitchen" → "Riverside Modern Kitchen"
function toTitle(slug) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Scan brand_assets/projects/{category}/{project}/ and return structured data
function scanPhotos() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  return fs.readdirSync(PROJECTS_DIR)
    .filter(cat => isDir(path.join(PROJECTS_DIR, cat)))
    .sort()
    .flatMap(cat => {
      const catPath = path.join(PROJECTS_DIR, cat);
      const label   = CAT_LABELS[cat] ?? toTitle(cat);

      return fs.readdirSync(catPath)
        .filter(proj => isDir(path.join(catPath, proj)))
        .sort()
        .map(proj => {
          const projPath = path.join(catPath, proj);
          const allImgs  = fs.readdirSync(projPath).filter(isImage).sort();

          // cover.jpg first, then the rest alphabetically
          const coverFile = allImgs.find(f => /^cover\./i.test(f));
          const rest      = allImgs.filter(f => !/^cover\./i.test(f));
          const ordered   = coverFile ? [coverFile, ...rest] : allImgs;

          const photos = ordered.map(f => `/brand_assets/projects/${cat}/${proj}/${f}`);

          return { cat, label, title: toTitle(proj), photos };
        })
        .filter(p => p.photos.length > 0);
    });
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
  const filePath = path.join(__dirname, url);
  const ext      = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
