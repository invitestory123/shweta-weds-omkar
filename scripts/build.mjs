import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const read = file => readFile(resolve(root, file), 'utf8');
const config = JSON.parse(await read('invitation.json'));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let html = await read('index.html');
html = html.replace(/(<[^>]+data-copy="([^"]+)"[^>]*>)[^<]*(<\/[^>]+>)/g, (_, open, key, close) => {
  const value = key.split('.').reduce((object, part) => object?.[part], config);
  if (typeof value !== 'string') throw new Error(`Missing invitation value: ${key}`);
  return open + escape(value) + close;
});
html = html.replace(/(<a\b[^>]*\bdata-directions\b[^>]*\bhref=")[^"]+/g, (_, prefix) => prefix + escape(config.venue.directions));
const css = await read('styles.css');
const js = await read('app.js');
const serialized = JSON.stringify(config, null, 2) + '\n';
const version = createHash('sha256').update(html + css + js + serialized).digest('hex').slice(0, 12);
html = html.replace('href="styles.css"', `href="styles.css?v=${version}"`).replace('src="app.js"', `src="app.js?v=${version}"`);
const builtJS = js.replace("fetch('invitation.json')", `fetch('invitation.json?v=${version}')`);
// Rebuild from an allowlist: chats, payment screenshots and old PDFs never ship.
const assets = new Set([...html.matchAll(/assets\/[\w.-]+/g)].map(match => match[0]));
if (config.music?.src) assets.add(config.music.src);
for (const asset of assets) {
  if (!/^assets\/[\w.-]+$/.test(asset)) throw new Error(`Expected a local asset filename: ${asset}`);
  await readFile(resolve(root, asset));
}
await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, 'assets'), { recursive: true });
await writeFile(resolve(dist, 'index.html'), html);
await writeFile(resolve(dist, 'styles.css'), css);
await writeFile(resolve(dist, 'app.js'), builtJS);
await writeFile(resolve(dist, 'invitation.json'), serialized);
for (const asset of assets) await cp(resolve(root, asset), resolve(dist, asset));
const calendarEscape = value => value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
const start = config.events[0].time.match(/(\d+):(\d+)\s*(AM|PM)/);
if (!start) throw new Error('Vidhi start time must include AM or PM');
const hour = Number(start[1]) % 12 + (start[3] === 'PM' ? 12 : 0);
const local = `${config.weddingDateISO}T${String(hour).padStart(2, '0')}:${start[2]}:00+05:30`;
const stamp = new Date(local).toISOString().replace(/[-:]/g, '').replace('.000', '');
const description = config.events.map(event => `${event.name}: ${event.time}`).join('\n');
const foldCalendarLine = line => {
  let result = '';
  let column = 0;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    if (column + bytes > 75) { result += '\r\n '; column = 1; }
    result += char; column += bytes;
  }
  return result;
};
const calendar = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//InviteStory//Omkar and Shweta//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:omkar-shweta-20261218@inviteby.top', 'DTSTAMP:20261006T000000Z', `DTSTART:${stamp}`, 'SUMMARY:Omkar & Shweta’s wedding', `LOCATION:${calendarEscape(config.venue.name + ', ' + config.venue.location)}`, `DESCRIPTION:${calendarEscape(description)}`, 'END:VEVENT', 'END:VCALENDAR', ''].map(foldCalendarLine).join('\r\n');
await writeFile(resolve(root, 'wedding.ics'), calendar);
await writeFile(resolve(dist, 'wedding.ics'), calendar);
await writeFile(resolve(dist, '_headers'), '/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/invitation.json\n  Cache-Control: no-cache\n');
console.log(`Built dist/ · version ${version} · ${assets.size} public assets`);
