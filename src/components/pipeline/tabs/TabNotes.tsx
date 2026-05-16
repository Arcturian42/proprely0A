'use client'

import { useState, useCallback } from 'react'
import { PipelineLead, PipelineNote } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface TabNotesProps {
  lead: PipelineLead
}

function NoteCard({ note, onDelete }: { note: PipelineNote; onDelete: (id: string) => void }) {
  const [content, setContent] = useState(note.content)
  const updateNote = usePipelineStore(s => s.updateNote)

  const handleBlur = useCallback(() => {
    if (content !== note.content) {
      updateNote(note.id, { content })
    }
  }, [content, note.content, note.id, updateNote])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
            {note.author[0]}
          </span>
          <span className="text-xs font-medium text-slate-700">{note.author}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(note.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={() => onDelete(note.id)} className="text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        onBlur={handleBlur}
        className="border-0 bg-transparent p-0 text-sm text-slate-700 resize-none focus-visible:ring-0 min-h-0"
        rows={Math.max(2, content.split('\n').length)}
      />
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs py-0 h-4 px-1.5 text-slate-500">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function TabNotes({ lead }: TabNotesProps) {
  const { notes, addNote, deleteNote } = usePipelineStore()
  const leadNotes = notes.filter(n => n.lead_id === lead.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const [newContent, setNewContent] = useState('')
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags(t => [...t, newTag])
      setNewTag('')
    }
  }

  const handleCreate = () => {
    if (!newContent.trim()) return
    addNote({
      id: `n-${Date.now()}`,
      lead_id: lead.id,
      company_id: lead.company_id,
      content: newContent.trim(),
      author: 'Marie Dupont',
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setNewContent('')
    setTags([])
    toast.success('Note ajoutée')
  }

  const handleDelete = (id: string) => {
    deleteNote(id)
    toast.success('Note supprimée')
  }

  return (
    <div className="space-y-4 p-1">
      {/* New note form */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
        <Textarea
          placeholder="Écrire une note... (auto-sauvegarde en 2s)"
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          rows={3}
          className="bg-white text-sm"
        />
        <div className="flex gap-2">
          <Input
            placeholder="Ajouter un tag..."
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
            className="h-8 text-xs bg-white"
          />
          <Button size="sm" variant="outline" onClick={handleAddTag} className="h-8">Tag</Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setTags(t => t.filter(x => x !== tag))}>
                {tag} ✕
              </Badge>
            ))}
          </div>
        )}
        <Button size="sm" onClick={handleCreate} className="gap-1 w-full" disabled={!newContent.trim()}>
          <Plus className="w-3 h-3" /> Ajouter la note
        </Button>
      </div>

      {/* Notes list */}
      {leadNotes.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">Aucune note pour ce lead</div>
      ) : (
        <div className="space-y-3">
          {leadNotes.map(note => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
