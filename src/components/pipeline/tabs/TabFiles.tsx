'use client'

import { useState, useRef, useCallback } from 'react'
import { PipelineLead, PipelineFile } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { formatFileSize } from '@/lib/pipeline-actions'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, File, FileText, Image, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TabFilesProps {
  lead: PipelineLead
}

const CATEGORY_LABELS: Record<string, string> = {
  company: 'Société',
  contact: 'Contact',
  quote: 'Devis',
  contract: 'Contrat',
  other: 'Autre',
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />
  if (type === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />
  return <File className="w-8 h-8 text-slate-400" />
}

export function TabFiles({ lead }: TabFilesProps) {
  const { files, addFile, deleteFile } = usePipelineStore()
  const leadFiles = files.filter(f => f.lead_id === lead.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const inputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<PipelineFile['category']>('company')
  const [dragging, setDragging] = useState(false)
  // Track object URLs to revoke on delete to prevent memory leaks
  const objectUrls = useRef<Map<string, string>>(new Map())

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return
    Array.from(fileList).forEach(file => {
      const id = `f-${Date.now()}-${Math.random()}`
      const url = URL.createObjectURL(file)
      objectUrls.current.set(id, url)
      addFile({
        id,
        lead_id: lead.id,
        company_id: lead.company_id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url,
        category,
        uploader: 'Marie Dupont',
        created_at: new Date().toISOString(),
      })
    })
    toast.success(`${fileList.length} fichier${fileList.length > 1 ? 's' : ''} ajouté${fileList.length > 1 ? 's' : ''}`)
  }, [addFile, category, lead.company_id, lead.id])

  const handleDelete = useCallback((id: string) => {
    const url = objectUrls.current.get(id)
    if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(id) }
    deleteFile(id)
    toast.success('Fichier supprimé')
  }, [deleteFile])

  return (
    <div className="space-y-4 p-1">
      {/* Upload zone */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <Select value={category} onValueChange={v => setCategory(v as PipelineFile['category'])}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => inputRef.current?.click()} className="gap-1">
            <Upload className="w-3 h-3" /> Ajouter
          </Button>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        <div
          className={cn('border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer', dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300')}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Glissez vos fichiers ici ou cliquez pour parcourir</p>
          <p className="text-xs text-slate-400 mt-1">PDF, images, documents...</p>
        </div>
      </div>

      {/* Files list */}
      <div className="space-y-2">
        {leadFiles.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400">Aucun fichier</div>
        ) : (
          leadFiles.map(f => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <FileIcon type={f.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400">{formatFileSize(f.size)}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{CATEGORY_LABELS[f.category]}</span>
                  <span className="text-xs text-slate-400">{f.uploader}</span>
                  <span className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a href={f.url} download={f.name} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
