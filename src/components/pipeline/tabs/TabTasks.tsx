'use client'

import { useState } from 'react'
import { PipelineLead, PipelineTask } from '@/types/pipeline'
import { usePipelineStore } from '@/lib/pipeline-store'
import { TASK_TEMPLATES } from '@/lib/pipeline-actions'
import { uid } from '@/lib/uid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TabTasksProps {
  lead: PipelineLead
}

function groupTasks(tasks: PipelineTask[], now: number) {
  const overdue = tasks.filter(t => t.status === 'todo' && t.due_date && new Date(t.due_date).getTime() < now)
  const thisWeek = tasks.filter(t => {
    if (t.status !== 'todo') return false
    if (!t.due_date) return false
    const d = new Date(t.due_date).getTime()
    if (d < now) return false
    return d < now + 7 * 86400000
  })
  const later = tasks.filter(t => {
    if (t.status !== 'todo') return false
    if (!t.due_date) return true
    return new Date(t.due_date).getTime() >= now + 7 * 86400000
  })
  const done = tasks.filter(t => t.status === 'done')
  return { overdue, thisWeek, later, done }
}

function TaskItem({ task, now, onComplete, onDelete }: { task: PipelineTask; now: number; onComplete: (id: string) => void; onDelete: (id: string) => void }) {
  const isOverdue = task.status === 'todo' && task.due_date && new Date(task.due_date).getTime() < now
  return (
    <div className={cn('flex items-start gap-3 py-2.5 px-3 rounded-lg border', task.status === 'done' ? 'bg-slate-50 border-slate-100' : isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200')}>
      <Checkbox
        checked={task.status === 'done'}
        onCheckedChange={() => task.status === 'todo' && onComplete(task.id)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', task.status === 'done' && 'line-through text-slate-400')}>{task.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {task.due_date && (
            <span className={cn('text-xs flex items-center gap-1', isOverdue ? 'text-red-600 font-medium' : 'text-slate-400')}>
              <Clock className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full', task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600')}>
            {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
          </span>
          <span className="text-xs text-slate-400">{task.assigned_to}</span>
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function TabTasks({ lead }: TabTasksProps) {
  const { tasks, addTask, completeTask, deleteTask } = usePipelineStore()
  const [nowSnapshot] = useState(() => Date.now())
  const leadTasks = tasks.filter(t => t.lead_id === lead.id)
  const { overdue, thisWeek, later, done } = groupTasks(leadTasks, nowSnapshot)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'medium' as PipelineTask['priority'], assigned_to: 'Marie Dupont' })

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error('Titre requis'); return }
    addTask({
      id: uid('t'),
      lead_id: lead.id,
      company_id: lead.company_id,
      title: form.title,
      description: form.description || undefined,
      due_date: form.due_date || undefined,
      status: 'todo',
      priority: form.priority,
      assigned_to: form.assigned_to,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setForm({ title: '', description: '', due_date: '', priority: 'medium', assigned_to: 'Marie Dupont' })
    setShowForm(false)
    toast.success('Tâche créée')
  }

  const handleComplete = (id: string) => { completeTask(id); toast.success('Tâche complétée ✅') }
  const handleDelete = (id: string) => { deleteTask(id); toast.success('Tâche supprimée') }

  const renderSection = (title: string, sectionTasks: PipelineTask[], Icon: React.ElementType, color: string) => {
    if (sectionTasks.length === 0) return null
    return (
      <div>
        <div className={cn('flex items-center gap-2 mb-2', color)}>
          <Icon className="w-4 h-4" />
          <p className="text-xs font-semibold uppercase tracking-wide">{title} ({sectionTasks.length})</p>
        </div>
        <div className="space-y-1">
          {sectionTasks.map(t => <TaskItem key={t.id} task={t} now={nowSnapshot} onComplete={handleComplete} onDelete={handleDelete} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1">
      {/* Templates + Create */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
          <Plus className="w-3 h-3" /> Nouvelle tâche
        </Button>
        {TASK_TEMPLATES.map(t => (
          <Button
            key={t.label}
            size="sm"
            variant="outline"
            onClick={() => {
              setForm(f => ({ ...f, title: t.title, priority: t.priority }))
              setShowForm(true)
            }}
            className="text-xs h-7"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Titre *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-8 bg-white" placeholder="Ex: Relancer M. Dupont" />
            </div>
            <div>
              <Label className="text-xs">Échéance</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-8 bg-white" />
            </div>
            <div>
              <Label className="text-xs">Priorité</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as PipelineTask['priority'] }))}>
                <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 Haute</SelectItem>
                  <SelectItem value="medium">🟡 Moyenne</SelectItem>
                  <SelectItem value="low">🔵 Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Assigné à</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Marie Dupont">Marie Dupont</SelectItem>
                  <SelectItem value="Paul Moreau">Paul Moreau</SelectItem>
                  <SelectItem value="Jean Durand">Jean Durand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} className="flex-1">Créer</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Task groups */}
      <div className="space-y-4">
        {renderSection('En retard', overdue, AlertTriangle, 'text-red-600')}
        {renderSection('Cette semaine', thisWeek, Clock, 'text-yellow-600')}
        {renderSection('Plus tard', later, Clock, 'text-slate-500')}
        {renderSection('Terminées', done, CheckCircle, 'text-green-600')}
        {leadTasks.length === 0 && <p className="text-center text-sm text-slate-400 py-6">Aucune tâche</p>}
      </div>
    </div>
  )
}
