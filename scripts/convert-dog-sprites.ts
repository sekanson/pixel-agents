/**
 * Convert a dog sprite sheet PNG into dogSprites.ts SpriteData arrays.
 *
 * Usage:  npx tsx scripts/convert-dog-sprites.ts [path-to-png]
 *
 * Default input: ~/Downloads/ dog.png
 * Output: writes webview-ui/src/office/sprites/dogSprites.ts
 *
 * Sprite sheet layout (4 cols × 9 rows, 96×96 cells):
 *   Row 0 (4f): Walk down
 *   Row 1 (4f): Walk right
 *   Row 2 (4f): Walk up
 *   Row 3 (4f): Walk left
 *   Row 4 (4f): Idle
 *   Row 5-6: SKIP
 *   Row 7 (3f): Sleep
 *   Row 8 (3f): Scared
 *
 * 3x nearest-neighbor downscale after trim.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { PNG } from 'pngjs'

const CELL_W = 96
const CELL_H = 96
const GRID_COLS = 4
const DOWNSCALE = 3
/** Round each RGB channel to nearest step for color quantization */
const COLOR_STEP = 32

function quantize(val: number): number {
  return Math.min(255, Math.round(val / COLOR_STEP) * COLOR_STEP)
}

// --- Read PNG ---
const inputPath = process.argv[2]
  || join(process.env.HOME!, 'Downloads', ' dog.png')
const pngBuf = readFileSync(resolve(inputPath))
const png = PNG.sync.read(pngBuf)
console.log(`PNG: ${png.width}×${png.height}`)

type SpriteData = string[][]

function extractCell(col: number, row: number): SpriteData {
  const x0 = col * CELL_W
  const y0 = row * CELL_H
  const sprite: SpriteData = []
  for (let y = 0; y < CELL_H; y++) {
    const rowArr: string[] = []
    for (let x = 0; x < CELL_W; x++) {
      const idx = ((y0 + y) * png.width + (x0 + x)) * 4
      const r = png.data[idx]
      const g = png.data[idx + 1]
      const b = png.data[idx + 2]
      const a = png.data[idx + 3]
      if (a < 200) {
        rowArr.push('')
      } else {
        const hex = '#' + [quantize(r), quantize(g), quantize(b)].map(c => c.toString(16).padStart(2, '0')).join('')
        rowArr.push(hex)
      }
    }
    sprite.push(rowArr)
  }
  return sprite
}

function trimSprite(sprite: SpriteData): { data: SpriteData; w: number; h: number; xOff: number; yOff: number } {
  let minX = CELL_W, maxX = -1, minY = CELL_H, maxY = -1
  for (let y = 0; y < sprite.length; y++) {
    for (let x = 0; x < sprite[y].length; x++) {
      if (sprite[y][x] !== '') {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return { data: [[]], w: 0, h: 0, xOff: 0, yOff: 0 }
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const data: SpriteData = []
  for (let y = minY; y <= maxY; y++) {
    data.push(sprite[y].slice(minX, maxX + 1))
  }
  return { data, w, h, xOff: minX, yOff: minY }
}

/** 3x nearest-neighbor downscale: sample every 3rd pixel */
function downscale3x(sprite: SpriteData): SpriteData {
  const h = sprite.length
  const w = sprite[0]?.length ?? 0
  const outH = Math.ceil(h / DOWNSCALE)
  const outW = Math.ceil(w / DOWNSCALE)
  const result: SpriteData = []
  for (let y = 0; y < outH; y++) {
    const row: string[] = []
    for (let x = 0; x < outW; x++) {
      const srcY = y * DOWNSCALE + 1 // center sample
      const srcX = x * DOWNSCALE + 1
      if (srcY < h && srcX < w) {
        row.push(sprite[srcY][srcX])
      } else {
        row.push('')
      }
    }
    result.push(row)
  }
  return result
}

// --- Animation row mapping ---
// Each entry: [animName, row, frameCount]
const ANIM_ROWS: Array<[string, number, number]> = [
  ['walkDown',  0, 4],
  ['walkRight', 1, 4],
  ['walkUp',    2, 4],
  ['walkLeft',  3, 4],
  ['idle',      5, 4],  // Rows 5-6 together form idle animation
  ['idle',      6, 4],
  ['sleep',     7, 3],
  ['scared',    8, 3],
]

// --- Extract all frames ---
interface FrameInfo {
  anim: string
  frameIdx: number
  row: number
  col: number
  trimmed: ReturnType<typeof trimSprite>
  downscaled: SpriteData
}

const allFrames: FrameInfo[] = []
const animFrameCounter = new Map<string, number>()
for (const [anim, row, frameCount] of ANIM_ROWS) {
  const startIdx = animFrameCounter.get(anim) ?? 0
  for (let col = 0; col < frameCount && col < GRID_COLS; col++) {
    const raw = extractCell(col, row)
    const trimmed = trimSprite(raw)
    if (trimmed.w > 0) {
      const downscaled = downscale3x(trimmed.data)
      const frameIdx = startIdx + col
      allFrames.push({ anim, frameIdx, row, col, trimmed, downscaled })
    }
  }
  animFrameCounter.set(anim, startIdx + frameCount)
}

console.log(`Found ${allFrames.length} frames:`)
for (const f of allFrames) {
  const dw = f.downscaled[0]?.length ?? 0
  const dh = f.downscaled.length
  console.log(`  ${f.anim}[${f.frameIdx}] [${f.row},${f.col}]: ${f.trimmed.w}×${f.trimmed.h} → ${dw}×${dh}`)
}

// --- Find uniform output size (post-downscale) ---
let maxW = 0, maxH = 0
for (const f of allFrames) {
  const dw = f.downscaled[0]?.length ?? 0
  const dh = f.downscaled.length
  if (dw > maxW) maxW = dw
  if (dh > maxH) maxH = dh
}
console.log(`\nMax downscaled sprite bounds: ${maxW}×${maxH}`)

// Pad each frame to maxW × maxH, centered horizontally, bottom-aligned
function padSprite(sprite: SpriteData, targetW: number, targetH: number): SpriteData {
  const h = sprite.length
  const w = sprite[0]?.length ?? 0
  const padLeft = Math.floor((targetW - w) / 2)
  const padTop = targetH - h // bottom-align

  const result: SpriteData = []
  for (let y = 0; y < targetH; y++) {
    const row: string[] = new Array(targetW).fill('')
    const srcY = y - padTop
    if (srcY >= 0 && srcY < h) {
      for (let x = 0; x < w; x++) {
        row[padLeft + x] = sprite[srcY][x]
      }
    }
    result.push(row)
  }
  return result
}

// --- Collect unique colors ---
const colorSet = new Set<string>()
for (const f of allFrames) {
  for (const row of f.downscaled) {
    for (const px of row) {
      if (px !== '') colorSet.add(px)
    }
  }
}

const colorList = [...colorSet].sort()
const colorNames = new Map<string, string>()
colorList.forEach((hex, i) => {
  colorNames.set(hex, `C${i}`)
})

console.log(`\nUnique colors: ${colorList.length}`)
colorList.forEach((hex, i) => console.log(`  C${i} = '${hex}'`))

// --- Generate dogSprites.ts ---
function spriteToCode(sprite: SpriteData, varName: string): string {
  const lines: string[] = []
  lines.push(`const ${varName}: SpriteData = [`)
  for (const row of sprite) {
    const cells = row.map(px => px === '' ? '_' : colorNames.get(px)!)
    lines.push(`  [${cells.join(',')}],`)
  }
  lines.push(']')
  return lines.join('\n')
}

// Group frames by animation
const animFrames = new Map<string, FrameInfo[]>()
for (const f of allFrames) {
  if (!animFrames.has(f.anim)) animFrames.set(f.anim, [])
  animFrames.get(f.anim)!.push(f)
}

let output = `import type { SpriteData } from '../types.js'
import type { PetSprites } from './petSprites.js'

const _ = '' // transparent

// Auto-generated from dog.png by scripts/convert-dog-sprites.ts
// ${maxW}x${maxH} pixel sprites (3x downscaled from 96×96 cells)

// ── Color palette ──
${colorList.map((hex, i) => `const C${i} = '${hex}'`).join('\n')}

`

// Generate frame constants grouped by animation
const animVarNames = new Map<string, string[]>()
for (const [anim, frames] of animFrames) {
  const varNames: string[] = []
  for (const f of frames) {
    const varName = `DOG_${anim.toUpperCase()}_${f.frameIdx}`
    varNames.push(varName)
    const padded = padSprite(f.downscaled, maxW, maxH)
    output += `// ── ${varName} ──\n`
    output += spriteToCode(padded, varName) + '\n\n'
  }
  animVarNames.set(anim, varNames)
}

// Export data
output += `export const DOG_SPRITES: PetSprites = {
  idle: [${(animVarNames.get('idle') ?? []).join(', ')}],
  walk: [${(animVarNames.get('walkRight') ?? []).join(', ')}],
  sleep: [${(animVarNames.get('sleep') ?? []).join(', ')}],
  scared: [${(animVarNames.get('scared') ?? []).join(', ')}],
  walkDown: [${(animVarNames.get('walkDown') ?? []).join(', ')}],
  walkUp: [${(animVarNames.get('walkUp') ?? []).join(', ')}],
  walkLeft: [${(animVarNames.get('walkLeft') ?? []).join(', ')}],
  walkRight: [${(animVarNames.get('walkRight') ?? []).join(', ')}],
}
`

const outPath = join(__dirname, '..', 'webview-ui', 'src', 'office', 'sprites', 'dogSprites.ts')
writeFileSync(outPath, output)
console.log(`\nWrote ${outPath}`)
console.log(`Sprite size: ${maxW}×${maxH}`)
