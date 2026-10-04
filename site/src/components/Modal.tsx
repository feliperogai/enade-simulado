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
      className={`bg-transparent p-0 text-slate-900 backdrop:bg-slate-950/60 backdrop:backdrop-blur-md dark:text-slate-100 ${className}`}
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
      <div className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0d0d18]">
        <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-violet-500/20 blur-3xl" />
        <h2 className="relative font-display text-xl font-bold">{title}</h2>
        <div className="relative mt-2 text-slate-600 dark:text-slate-300">{children}</div>
        <div className="relative mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 font-semibold text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/[0.07]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="btn-aurora rounded-xl px-4 py-2.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:ring-offset-[#0d0d18]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
