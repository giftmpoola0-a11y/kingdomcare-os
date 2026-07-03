'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Trash2 } from 'lucide-react'
import { removeResidentPhotoAction, uploadResidentPhotoAction } from '../actions'

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPE_ERROR_MESSAGE = 'Photo must be a JPG, JPEG, PNG, or WebP image.'
const PHOTO_SIZE_ERROR_MESSAGE = 'Photo must be smaller than 5MB.'

export interface ResidentPhotoUploaderProps {
  residentId: string
  photoUrl: string | null
  initials: string
  canManage: boolean
}

export function ResidentPhotoUploader({ residentId, photoUrl, initials, canManage }: ResidentPhotoUploaderProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError(PHOTO_TYPE_ERROR_MESSAGE)
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(PHOTO_SIZE_ERROR_MESSAGE)
      return
    }

    setError('')
    const formData = new FormData()
    formData.append('photo', file)

    startTransition(async () => {
      const result = await uploadResidentPhotoAction(residentId, formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleRemove() {
    if (!window.confirm("Remove this resident's photo?")) return

    setError('')
    startTransition(async () => {
      const result = await removeResidentPhotoAction(residentId)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background/60 text-2xl font-semibold text-muted-foreground">
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill sizes="112px" className="object-cover" />
        ) : (
          initials
        )}
      </div>

      {canManage && (
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelected}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              <ImagePlus className="size-3.5" />
              {photoUrl ? 'Replace Photo' : 'Upload Photo'}
            </button>
            {photoUrl && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
