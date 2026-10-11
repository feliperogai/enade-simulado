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
      className={`bg-transparent p-0 text-ink backdrop:bg-[#1d1b18]/55 backdrop:backdrop-blur-[2px] ${className}`}
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
      <div className="rounded-md border-2 border-ink bg-sheet p-6 shadow-[6px_6px_0_var(--color-ink)]">
        <h2 className="font-serif text-2xl font-semibold">{title}</h2>
        <div className="mt-2 text-ink-soft">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn-paper">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} autoFocus className="btn-pen">
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
