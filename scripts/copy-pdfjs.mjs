// Copia os ficheiros do pdf.js (worker, fontes, cmaps, wasm) para public/pdfjs.
// Corre automaticamente antes de `npm run dev` e `npm run build`.
import { cpSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const pkgDir = dirname(require.resolve('pdfjs-dist/package.json'))
const out = join(process.cwd(), 'public', 'pdfjs')

mkdirSync(out, { recursive: true })
cpSync(join(pkgDir, 'legacy/build/pdf.worker.min.mjs'), join(out, 'pdf.worker.min.mjs'))
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(join(pkgDir, dir), join(out, dir), { recursive: true })
}
console.log('pdf.js copiado para public/pdfjs')
