import { useEffect, useState } from 'react'
import { imageUrl } from '../lib/data'
import type { Question } from '../lib/types'
import { RefreshIcon, XIcon, ZoomIcon } from './icons'
import { Modal } from './Modal'

/** As imagens têm 2 px por ponto do PDF; na tela usamos 1,5 px por ponto. */
const DISPLAY_SCALE = 0.75

export function QuestionImage({ question }: { question: Question }) {
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const src = imageUrl(question) + (retry ? `?r=${retry}` : '')

  useEffect(() => {
    setFailed(false)
    setRetry(0)
  }, [question.image])

  if (failed) {
    return (
      <div
        role="alert"
        className="sheet grid place-items-center gap-3 rounded-md border-dashed px-6 py-16 text-center"
      >
        <p className="text-ink-soft">Não foi possível carregar a imagem desta questão.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false)
            setRetry(Date.now())
          }}
          className="btn-pen"
        >
          <RefreshIcon /> Recarregar imagem
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={`Ampliar questão ${question.n}`}
        className="group relative block max-w-full cursor-zoom-in bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
        style={{ width: question.width * DISPLAY_SCALE }}
      >
        <img
          key={src}
          src={src}
          width={question.width}
          height={question.height}
          alt={`Enunciado e alternativas da questão ${question.n}`}
          onError={() => setFailed(true)}
          className="block h-auto w-full"
        />
        <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border-2 border-ink bg-sheet px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink opacity-0 shadow-[2px_2px_0_var(--color-ink)] transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIcon /> ampliar
        </span>
      </button>

      <Modal open={zoomed} onClose={() => setZoomed(false)} label={`Questão ${question.n} ampliada`} className="m-0 h-dvh max-h-none w-screen max-w-none">
        <div className="flex h-full flex-col bg-[#1d1b18]/95">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">Questão {question.n}</span>
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="inline-flex items-center gap-2 rounded-md border-2 border-white/70 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <XIcon /> Fechar
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <img
              src={src}
              width={question.width}
              height={question.height}
              alt={`Questão ${question.n} em tamanho ampliado`}
              className="mx-auto block max-w-none bg-white shadow-2xl"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
