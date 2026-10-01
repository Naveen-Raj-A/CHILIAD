/**
 * Generates the Chiliad icon set into public/.
 *
 * Draws the Chiliad mark - a flame-like chevron on the obsidian background -
 * without any image dependency, so `npm run build` works from a clean clone
 * and the branding can never drift from the source of truth.
 *
 * Emits the sidebar/tab brand mark, a multi-size .ico, the Apple touch icon,
 * and the PWA raster sizes.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(HERE, '..', 'public')

const BG = [0x0e, 0x0e, 0x0e] // Obsidian
const FLAME = [0x38, 0xbd, 0xf8] // Sky accent

/** CRC-32 table for PNG chunk checksums. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

/**
 * Signed distance to a line segment, used to draw the flame strokes with
 * smooth antialiasing instead of hard pixel edges.
 */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

/**
 * Render the mark to a PNG buffer.
 *
 * `padding` shrinks the mark inside the canvas as a fraction per side. Small
 * sizes need it most: at 16px an unpadded stroke bleeds into its neighbours,
 * and the OS tab strip and Apple both mask their own shapes anyway.
 */
function renderIcon(size, { padding = 0 } = {}) {
  const s = size
  const offset = s * padding
  const scale = (s - offset * 2) / 512
  const rgba = Buffer.alloc(s * s * 4)

  // Flame chevron geometry, in 512-space then scaled.
  const strokes = [
    [256, 140, 180, 290],
    [256, 140, 332, 290],
    [180, 290, 256, 372],
    [332, 290, 256, 372],
  ].map(([ax, ay, bx, by]) => [ax * scale + offset, ay * scale + offset, bx * scale + offset, by * scale + offset])

  const thickness = 26 * scale

  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      const px = x + 0.5
      const py = y + 0.5
      let minDist = Infinity
      for (const [ax, ay, bx, by] of strokes) {
        minDist = Math.min(minDist, distanceToSegment(px, py, ax, ay, bx, by))
      }
      // 1px band around the stroke edge gives a clean antialiased line.
      const alpha = Math.max(0, Math.min(1, thickness / 2 - minDist + 1))

      const offset = (y * s + x) * 4
      const mix = alpha
      rgba[offset] = Math.round(BG[0] * (1 - mix) + FLAME[0] * mix)
      rgba[offset + 1] = Math.round(BG[1] * (1 - mix) + FLAME[1] * mix)
      rgba[offset + 2] = Math.round(BG[2] * (1 - mix) + FLAME[2] * mix)
      rgba[offset + 3] = 255
    }
  }

  // Raw deflate stream (zlib) for the IDAT payload.
  const raw = Buffer.alloc(s * (s * 4 + 1))
  for (let y = 0; y < s; y += 1) {
    raw[y * (s * 4 + 1)] = 0 // filter type: none
    rgba.copy(raw, y * (s * 4 + 1) + 1, y * s * 4, (y + 1) * s * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(s, 0)
  ihdr.writeUInt32BE(s, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * Pack PNGs into a Windows .ico container.
 *
 * Uses PNG-compressed entries, which every browser and Windows version since
 * Vista reads. The alternative 32-bit BMP entries roughly double the file for
 * no visible gain at favicon sizes.
 */
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)

  const directory = Buffer.alloc(16 * entries.length)
  // Data starts right after the header and the directory.
  let offset = header.length + directory.length

  entries.forEach(({ size, png }, index) => {
    const at = index * 16
    // 0 means 256 in the ICO directory; anything else is the literal size.
    directory.writeUInt8(size >= 256 ? 0 : size, at + 0)
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1)
    directory.writeUInt8(0, at + 2) // palette size
    directory.writeUInt8(0, at + 3) // reserved
    directory.writeUInt16LE(1, at + 4) // colour planes
    directory.writeUInt16LE(32, at + 6) // bits per pixel
    directory.writeUInt32LE(png.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += png.length
  })

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)])
}

mkdirSync(PUBLIC_DIR, { recursive: true })

const emit = (name, buffer) => {
  writeFileSync(resolve(PUBLIC_DIR, name), buffer)
  console.log(`wrote public/${name} (${buffer.length} bytes)`)
}

// Brand mark used by the sidebar and the browser tab.
emit('chiliad-logo.png', renderIcon(256, { padding: 0.08 }))

// Apple masks the touch icon to a rounded square, so the mark sits inside it.
emit('apple-touch-icon.png', renderIcon(180, { padding: 0.14 }))

// PWA install icons are unmasked and full-bleed.
for (const size of [192, 512]) {
  emit(`pwa-${size}x${size}.png`, renderIcon(size))
}

emit(
  'favicon.ico',
  buildIco(
    [16, 32, 48].map((size) => ({ size, png: renderIcon(size, { padding: 0.04 }) })),
  ),
)
