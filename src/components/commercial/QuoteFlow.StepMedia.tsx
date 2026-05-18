import { ChevronRight, ImageIcon, Upload, VideoIcon, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { STEP_TITLES } from './QuoteFlow.constants'
import { StepHeader } from './QuoteFlow.shared'

// Step 3 — drag-and-drop upload for photos + videos (file names only,
// no actual storage upload in the mock). Extracted from QuoteFlow.tsx.

interface Props {
  uploadedFiles: string[]
  isDragging: boolean
  photoInputRef: React.RefObject<HTMLInputElement | null>
  videoInputRef: React.RefObject<HTMLInputElement | null>
  onFilesAdded: (files: FileList | null) => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onRemoveFile: (name: string) => void
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}

export function StepMedia({
  uploadedFiles,
  isDragging,
  photoInputRef,
  videoInputRef,
  onFilesAdded,
  onDrop,
  onDragOver,
  onDragLeave,
  onRemoveFile,
  onBack,
  onNext,
  onSkip,
}: Props) {
  return (
    <div className="space-y-5">
      <StepHeader title={STEP_TITLES[3]} step={3} total={5} onBack={onBack} />

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`}
      >
        <Upload
          className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-slate-300'}`}
        />
        <p className="text-sm font-medium text-slate-600">Glissez-déposez vos fichiers ici</p>
        <p className="text-xs text-slate-400 mt-1">ou utilisez les boutons ci-dessous</p>
      </div>

      {/* Upload buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => photoInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
        >
          <ImageIcon className="w-4 h-4 text-blue-500" /> Photos
        </button>
        <button
          onClick={() => videoInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
        >
          <VideoIcon className="w-4 h-4 text-violet-500" /> Vidéos
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFilesAdded(e.target.files)}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => onFilesAdded(e.target.files)}
        />
      </div>

      {/* File chips */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full"
            >
              {name}
              <button
                onClick={() => onRemoveFile(name)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Button
        onClick={onNext}
        className="w-full gap-2 h-10 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
      >
        Calculer le devis <ChevronRight className="w-4 h-4 ml-auto" />
      </Button>
      <button
        onClick={onSkip}
        className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
      >
        Passer cette étape →
      </button>
    </div>
  )
}
