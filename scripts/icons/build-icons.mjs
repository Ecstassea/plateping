#!/usr/bin/env node
// Builds every home-screen, favicon and notification icon from one plate drawing.
//
//   npm run icons
//
// Needs librsvg and Inkscape on PATH (brew install librsvg inkscape). Inkscape
// converts the plate lettering to outlines so the shipped SVG never depends on
// a font the phone may not have; rsvg-convert rasterises the outlined SVG.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(here, "../../public");
const APP_DIR = resolve(here, "../../src/app");
const work = mkdtempSync(join(tmpdir(), "plateping-icons-"));

const COLORS = {
  bg: "#07140e",
  glow: "#13381f",
  rim: "#0b1b13",
  faceTop: "#f9f6ea",
  faceBottom: "#e9e3cf",
  band: "#1f8f4b",
  ink: "#0f1a14",
  gold: "#f0c14b",
};

const FONT = "'DIN Alternate', 'DIN Condensed', 'Arial Narrow', Arial, sans-serif";

function arc(cx, cy, r, fromDeg, toDeg) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(fromDeg));
  const y1 = cy - r * Math.sin(rad(fromDeg));
  const x2 = cx + r * Math.cos(rad(toDeg));
  const y2 = cy - r * Math.sin(rad(toDeg));
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 0 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** The plate itself, drawn on a 512 canvas around (256, 256). */
function plate({ ping }) {
  const pingMark = ping
    ? `
    <path d="${arc(436, 146, 50, 12, 78)}" fill="none" stroke="${COLORS.gold}" stroke-width="13" stroke-linecap="round"/>
    <path d="${arc(436, 146, 72, 18, 72)}" fill="none" stroke="${COLORS.gold}" stroke-width="13" stroke-linecap="round" opacity="0.72"/>
    <circle cx="436" cy="146" r="31" fill="${COLORS.gold}" stroke="${COLORS.bg}" stroke-width="12"/>`
    : "";

  return `
    <rect x="66" y="152" width="380" height="240" rx="28" fill="#000" opacity="0.38" filter="url(#shadow)"/>
    <rect x="66" y="136" width="380" height="240" rx="28" fill="${COLORS.rim}"/>
    <g clip-path="url(#face)">
      <rect x="76" y="146" width="360" height="220" fill="url(#face-fill)"/>
      <rect x="76" y="146" width="60" height="220" fill="${COLORS.band}"/>
      <text x="106" y="352" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="26" fill="#ffffff">ZW</text>
      <text x="286" y="244" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="112" fill="${COLORS.ink}">ADX</text>
      <text x="286" y="346" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="112" fill="${COLORS.ink}">5897</text>
    </g>
    <rect x="76" y="146" width="360" height="220" rx="20" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
    ${pingMark}`;
}

/**
 * rounded  – bake the app-icon squircle into the PNG (transparent corners).
 * scale    – shrink the plate towards the centre (maskable safe zone is 80%).
 * ping     – show the gold "ping" mark on the corner of the plate.
 */
function iconSvg({ rounded, scale, ping }) {
  const radius = rounded ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg-fill" cx="50%" cy="-10%" r="120%">
      <stop offset="0%" stop-color="${COLORS.glow}"/>
      <stop offset="55%" stop-color="${COLORS.bg}"/>
    </radialGradient>
    <linearGradient id="face-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.faceTop}"/>
      <stop offset="100%" stop-color="${COLORS.faceBottom}"/>
    </linearGradient>
    <clipPath id="face"><rect x="76" y="146" width="360" height="220" rx="20"/></clipPath>
    <clipPath id="tile"><rect width="512" height="512" rx="${radius}"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="512" height="512" rx="${radius}" fill="url(#bg-fill)"/>
    <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${plate({ ping })}</g>
  </g>
</svg>
`;
}

/** Android notification badge: alpha silhouette only, so a plain white plate with the lettering cut out. */
function badgeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <defs>
    <mask id="cut">
      <rect width="96" height="96" fill="#000"/>
      <rect x="8" y="20" width="80" height="56" rx="9" fill="#fff"/>
      <text x="52" y="45" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="24" fill="#000">ADX</text>
      <text x="52" y="69" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="24" fill="#000">5897</text>
      <rect x="8" y="20" width="12" height="56" fill="#000"/>
      <rect x="8" y="20" width="12" height="56" rx="9" fill="#fff" opacity="0.55"/>
    </mask>
  </defs>
  <rect width="96" height="96" fill="#fff" mask="url(#cut)"/>
</svg>
`;
}

function outline(name, svg) {
  const src = join(work, `${name}.src.svg`);
  const out = join(work, `${name}.svg`);
  writeFileSync(src, svg);
  try {
    execFileSync(
      "inkscape",
      ["--export-type=svg", "--export-plain-svg", "--export-text-to-path", `--export-filename=${out}`, src],
      { stdio: "pipe" },
    );
    return out;
  } catch (error) {
    console.warn(`inkscape failed for ${name}; shipping text as text.`, String(error).split("\n")[0]);
    return src;
  }
}

function png(svgPath, size, target) {
  execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), svgPath, "-o", target], { stdio: "pipe" });
  return target;
}

/** Windows/desktop favicon container holding PNG frames, which every current browser reads. */
function writeIco(target, frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  const entries = [];
  const blobs = [];
  let offset = 6 + 16 * frames.length;
  for (const { size, path } of frames) {
    const data = readFileSync(path);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    blobs.push(data);
    offset += data.length;
  }
  writeFileSync(target, Buffer.concat([header, ...entries, ...blobs]));
}

const anySvg = outline("any", iconSvg({ rounded: true, scale: 1, ping: true }));
const maskableSvg = outline("maskable", iconSvg({ rounded: false, scale: 0.78, ping: true }));
const appleSvg = outline("apple", iconSvg({ rounded: false, scale: 0.94, ping: true }));
const smallSvg = outline("small", iconSvg({ rounded: true, scale: 1.16, ping: false }));
const badge = outline("badge", badgeSvg());

writeFileSync(join(PUBLIC, "icon.svg"), readFileSync(anySvg));
png(anySvg, 192, join(PUBLIC, "icon-192.png"));
png(anySvg, 512, join(PUBLIC, "icon-512.png"));
png(maskableSvg, 192, join(PUBLIC, "icon-maskable-192.png"));
png(maskableSvg, 512, join(PUBLIC, "icon-maskable-512.png"));
png(appleSvg, 180, join(PUBLIC, "apple-touch-icon.png"));
png(badge, 96, join(PUBLIC, "badge-96.png"));

writeIco(
  join(APP_DIR, "favicon.ico"),
  [16, 32, 48].map((size) => ({ size, path: png(smallSvg, size, join(work, `fav-${size}.png`)) })),
);

console.log(`Icons written to ${PUBLIC} and ${join(APP_DIR, "favicon.ico")} (scratch: ${work})`);
