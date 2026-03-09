/**
 * Convert a cat sprite sheet PNG into petSprites.ts SpriteData arrays.
 *
 * Usage:  npx tsx scripts/convert-pet-sprites.ts [path-to-png]
 *
 * Default input: ~/Downloads/sprite_sheet.png
 * Output: writes webview-ui/src/office/sprites/petSprites.ts
 *
 * Sprite sheet layout (animation-based, not direction-based):
 *   Row 0 (4f): Sitting, tail wagging → idle
 *   Row 4 (8f): Running/jumping → walk
 *   Row 6 (4f): Lying down sleeping → sleep
 *   Row 9 (8f): Bristled/attack mode → scared
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { PNG } from 'pngjs'

const CELL_W = 32
const CELL_H = 32
const GRID_COLS = 8

// --- Read PNG ---
const inputPath = process.argv[2]
  || join(process.env.HOME!, 'Downloads', 'sprite_sheet.png')
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
      if (a < 128) {
        rowArr.push('')
      } else {
        const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
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

// --- Animation row mapping ---
// Each entry: [animName, row, frameCount]
const ANIM_ROWS: Array<[string, number, number]> = [
  ['idle',    0, 4],  // Row 0: sitting, tail wag
  ['walk',    4, 8],  // Row 4: running/jumping
  ['sleep',   6, 4],  // Row 6: lying down
  ['scared',  9, 8],  // Row 9: bristled/attack
]

// --- Extract all frames ---
interface FrameInfo {
  anim: string
  frameIdx: number
  row: number
  col: number
  trimmed: ReturnType<typeof trimSprite>
}

const allFrames: FrameInfo[] = []
for (const [anim, row, frameCount] of ANIM_ROWS) {
  for (let col = 0; col < frameCount && col < GRID_COLS; col++) {
    const raw = extractCell(col, row)
    const trimmed = trimSprite(raw)
    if (trimmed.w > 0) {
      allFrames.push({ anim, frameIdx: col, row, col, trimmed })
    }
  }
}

console.log(`Found ${allFrames.length} frames:`)
for (const f of allFrames) {
  console.log(`  ${f.anim}[${f.frameIdx}] [${f.row},${f.col}]: ${f.trimmed.w}×${f.trimmed.h}`)
}

// --- Find uniform output size ---
let maxW = 0, maxH = 0
for (const f of allFrames) {
  if (f.trimmed.w > maxW) maxW = f.trimmed.w
  if (f.trimmed.h > maxH) maxH = f.trimmed.h
}
console.log(`\nMax sprite bounds: ${maxW}×${maxH}`)

// Pad each frame to maxW × maxH, centered horizontally, bottom-aligned
function padSprite(trimmed: ReturnType<typeof trimSprite>, targetW: number, targetH: number): SpriteData {
  const { data, w, h } = trimmed
  const padLeft = Math.floor((targetW - w) / 2)
  const padTop = targetH - h // bottom-align

  const result: SpriteData = []
  for (let y = 0; y < targetH; y++) {
    const row: string[] = new Array(targetW).fill('')
    const srcY = y - padTop
    if (srcY >= 0 && srcY < h) {
      for (let x = 0; x < w; x++) {
        row[padLeft + x] = data[srcY][x]
      }
    }
    result.push(row)
  }
  return result
}

// --- Collect unique colors ---
const colorSet = new Set<string>()
for (const f of allFrames) {
  for (const row of f.trimmed.data) {
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

// --- Generate petSprites.ts ---
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

const _ = '' // transparent

// Auto-generated from sprite_sheet.png by scripts/convert-pet-sprites.ts
// ${maxW}x${maxH} pixel sprites

// ── Color palette ──
${colorList.map((hex, i) => `const C${i} = '${hex}'`).join('\n')}

`

// Generate frame constants grouped by animation
const animVarNames = new Map<string, string[]>()
for (const [anim, frames] of animFrames) {
  const varNames: string[] = []
  for (const f of frames) {
    const varName = `CAT_${anim.toUpperCase()}_${f.frameIdx}`
    varNames.push(varName)
    const padded = padSprite(f.trimmed, maxW, maxH)
    output += `// ── ${varName} ──\n`
    output += spriteToCode(padded, varName) + '\n\n'
  }
  animVarNames.set(anim, varNames)
}

// Export interface and data
output += `export interface PetSprites {
  idle: SpriteData[]     // Sitting, tail wagging
  walk: SpriteData[]     // Running/jumping
  sleep: SpriteData[]    // Lying down
  scared: SpriteData[]   // Bristled/attack mode
}

export const CAT_SPRITES: PetSprites = {
  idle: [${(animVarNames.get('idle') ?? []).join(', ')}],
  walk: [${(animVarNames.get('walk') ?? []).join(', ')}],
  sleep: [${(animVarNames.get('sleep') ?? []).join(', ')}],
  scared: [${(animVarNames.get('scared') ?? []).join(', ')}],
}
`

const outPath = join(__dirname, '..', 'webview-ui', 'src', 'office', 'sprites', 'petSprites.ts')
writeFileSync(outPath, output)
console.log(`\nWrote ${outPath}`)
console.log(`Sprite size: ${maxW}×${maxH}`)
