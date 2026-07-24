'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { dashboardFont } from '@/app/lib/dashboard-font'
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
  avatarClassName?: string
  containerClassName?: string
  actionsClassName?: string
}

export function ResidentPhotoUploader({
  residentId,
  photoUrl,
  initials,
  canManage,
  avatarClassName,
  containerClassName,
  actionsClassName,
}: ResidentPhotoUploaderProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

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
    setConfirmRemoveOpen(true)
  }

  function handleConfirmRemove() {
    setError('')
    setConfirmRemoveOpen(false)
    startTransition(async () => {
      const result = await removeResidentPhotoAction(residentId)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const wrapperClassName = containerClassName ?? 'flex flex-col items-center gap-3 sm:items-start'
  const photoClassName = [
    'relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border bg-background/60 text-2xl font-semibold text-muted-foreground ring-1 ring-border/80',
    avatarClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const actionGroupClassName = actionsClassName ?? 'flex flex-col items-center gap-2 sm:items-start'

  return (
    <div className={wrapperClassName}>
      <div className={photoClassName}>
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill sizes="144px" className="object-cover" />
        ) : (
          initials
        )}
      </div>

      {canManage && (
        <div className={actionGroupClassName}>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/35 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-xs font-medium text-rose-300">
              {error}
            </p>
          )}
        </div>
      )}

      <AlertDialog open={confirmRemoveOpen} onOpenChange={(open) => {
        if (open || isPending) return
        setConfirmRemoveOpen(false)
      }}>
        <AlertDialogContent
          className={`${dashboardFont.variable} v0-dashboard-theme dark max-w-lg gap-0 overflow-hidden border-white/10 bg-card/95 p-0 font-sans shadow-[0_28px_90px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.05)]`}
        >
          <AlertDialogHeader className="gap-3 p-6 pb-5 sm:p-7 sm:pb-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-rose-500/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200 ring-1 ring-rose-400/25">
              <Trash2 className="size-3.5" />
              Remove resident photo
            </div>
            <AlertDialogTitle className="text-2xl tracking-tight text-foreground">Remove resident photo?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <span className="block">This removes the current resident photo from the profile until a new one is uploaded.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="border-t border-white/10 bg-background/35 px-6 py-5 sm:px-7">
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isPending}
                className="rounded-xl border border-white/10 bg-background/75 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                onClick={(event) => {
                  event.preventDefault()
                  handleConfirmRemove()
                }}
                className="rounded-xl border border-rose-400/30 bg-rose-500/18 px-5 py-2.5 text-sm font-semibold text-rose-100 shadow-[0_12px_28px_rgba(244,63,94,0.18)] transition-colors hover:bg-rose-500/28 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Removing...' : 'Remove photo'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
