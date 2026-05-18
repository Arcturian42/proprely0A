'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface CsvColumn {
  key: string
  label: string
  required?: boolean
}

export interface CsvImportRow {
  /** Raw values keyed by column label (whatever the user's header was). */
  raw: Record<string, string>
  /** Normalized row keyed by our CsvColumn.key. */
  data: Record<string, string>
  /** 1-indexed (header is line 1). */
  lineNumber: number
}

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  columns: CsvColumn[]
  /** Called after user confirms — receives only validated rows. */
  onImport: (rows: CsvImportRow[]) => Promise<{ inserted: number; errors?: string[] }>
}

const MAX_PREVIEW_ROWS = 20

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

/**
 * Generic CSV importer with header mapping + per-row error preview.
 * Auto-matches header columns to schema keys (case-insensitive, accent-free,
 * underscores). Required columns missing → row errored.
 */
export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  description,
  columns,
  onImport,
}: CsvImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CsvImportRow[]>([])
  const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map())
  const [fileName, setFileName] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  function reset() {
    setRows([])
    setRowErrors(new Map())
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  function handleFile(file: File) {
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => normalizeHeader(h),
      complete: (result) => {
        const headerByKey = new Map<string, string>()
        const fields = result.meta.fields ?? []
        for (const col of columns) {
          const k = normalizeHeader(col.key)
          const lbl = normalizeHeader(col.label)
          const match = fields.find((f) => f === k || f === lbl)
          if (match) headerByKey.set(col.key, match)
        }

        const parsedRows: CsvImportRow[] = []
        const errs = new Map<number, string>()

        result.data.forEach((rawRow, idx) => {
          const lineNumber = idx + 2 // +1 for header, +1 because 1-indexed
          const data: Record<string, string> = {}
          const missingRequired: string[] = []

          for (const col of columns) {
            const headerKey = headerByKey.get(col.key)
            const value = headerKey ? (rawRow[headerKey] ?? '').trim() : ''
            data[col.key] = value
            if (col.required && !value) missingRequired.push(col.label)
          }

          if (missingRequired.length > 0) {
            errs.set(lineNumber, `Champs requis manquants : ${missingRequired.join(', ')}`)
          }

          parsedRows.push({ raw: rawRow, data, lineNumber })
        })

        setRows(parsedRows)
        setRowErrors(errs)
      },
      error: (err) => {
        toast.error(`Lecture CSV échouée : ${err.message}`)
      },
    })
  }

  async function handleConfirm() {
    const validRows = rows.filter((r) => !rowErrors.has(r.lineNumber))
    if (validRows.length === 0) {
      toast.error('Aucune ligne valide à importer.')
      return
    }
    setImporting(true)
    try {
      const res = await onImport(validRows)
      toast.success(`${res.inserted} ligne(s) importée(s).`)
      if (res.errors?.length) {
        toast.error(`${res.errors.length} échec(s). Voir détails dans le rapport.`)
      }
      handleClose(false)
    } catch (err) {
      toast.error((err as Error).message ?? "Échec de l'import.")
    } finally {
      setImporting(false)
    }
  }

  const validCount = rows.length - rowErrors.size
  const preview = rows.slice(0, MAX_PREVIEW_ROWS)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-[13px] text-slate-500">{description}</p>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[12px] font-medium text-slate-700 mb-2">
              Colonnes attendues
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {columns.map((c) => (
                <li
                  key={c.key}
                  className={[
                    'inline-flex items-center text-[11px] rounded-full px-2 py-0.5',
                    c.required
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-white text-slate-500 border border-slate-200',
                  ].join(' ')}
                >
                  {c.label}
                  {c.required && <span className="ml-1 text-rose-500">*</span>}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 mt-2">
              <span className="text-rose-500">*</span> obligatoire. Les colonnes
              sont détectées automatiquement (insensible à la casse / aux accents).
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <Upload className="h-8 w-8 text-slate-400 mb-3" aria-hidden />
              <p className="text-[13px] text-slate-600 mb-3">
                Glisse un fichier CSV ou choisis-le
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <FileUp className="h-4 w-4" />
                Choisir un fichier
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-slate-600">
                  <strong>{fileName}</strong> · {rows.length} ligne(s) ·{' '}
                  <span className="text-emerald-700">{validCount} valide(s)</span>
                  {rowErrors.size > 0 && (
                    <span className="text-rose-600 ml-1">
                      · {rowErrors.size} en erreur
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={reset}
                  disabled={importing}
                >
                  Changer de fichier
                </Button>
              </div>

              <div className="rounded-lg border border-slate-200 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 w-8">#</th>
                      {columns.map((c) => (
                        <th
                          key={c.key}
                          className="text-left px-3 py-2 font-medium text-slate-600"
                        >
                          {c.label}
                        </th>
                      ))}
                      <th className="text-left px-3 py-2 font-medium text-slate-600">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r) => {
                      const err = rowErrors.get(r.lineNumber)
                      return (
                        <tr
                          key={r.lineNumber}
                          className={[
                            'border-t border-slate-100',
                            err ? 'bg-rose-50/40' : '',
                          ].join(' ')}
                        >
                          <td className="px-3 py-1.5 text-slate-400 tabular-nums">
                            {r.lineNumber}
                          </td>
                          {columns.map((c) => (
                            <td key={c.key} className="px-3 py-1.5 text-slate-700 truncate max-w-[200px]">
                              {r.data[c.key] || (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          ))}
                          <td className="px-3 py-1.5">
                            {err ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-700">
                                <AlertCircle className="h-3 w-3" />
                                {err}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Prête
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {rows.length > MAX_PREVIEW_ROWS && (
                  <p className="text-center text-[11px] text-slate-400 py-2 border-t border-slate-100">
                    + {rows.length - MAX_PREVIEW_ROWS} lignes supplémentaires non affichées
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={importing || rows.length === 0 || validCount === 0}
            className="gap-2"
          >
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Importer {validCount > 0 ? `${validCount} ligne(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
