import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  children: ReactNode
}

/** <dialog> nativo em modo modal: foco preso, Esc e clique fora fecham. */
export function Modal({ open, onClose, label, className = '', children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose() // clique no fundo
      }}
      className={`bg-transparent p-0 text-zinc-900 backdrop:bg-zinc-950/60 backdrop:backdrop-blur-sm dark:text-zinc-100 ${className}`}
    >
      {open && children}
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  children: ReactNode
}

export function ConfirmDialog({ open, title, confirmLabel, cancelLabel, onConfirm, onCancel, children }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} label={title} className="m-auto w-[calc(100%-2rem)] max-w-md">
      <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-2 text-zinc-600 dark:text-zinc-400">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:ring-offset-zinc-900"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
