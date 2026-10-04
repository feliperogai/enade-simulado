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
        className="glass grid place-items-center gap-3 rounded-2xl border-dashed px-6 py-16 text-center"
      >
        <p className="text-slate-600 dark:text-slate-400">Não foi possível carregar a imagem desta questão.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false)
            setRetry(Date.now())
          }}
          className="btn-aurora inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
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
        className="group relative block max-w-full cursor-zoom-in overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:shadow-black/40 dark:ring-white/10"
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
        <span className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-slate-900/75 text-white opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIcon />
        </span>
      </button>

      <Modal open={zoomed} onClose={() => setZoomed(false)} label={`Questão ${question.n} ampliada`} className="m-0 h-dvh max-h-none w-screen max-w-none">
        <div className="flex h-full flex-col bg-ink/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="font-medium">Questão {question.n}</span>
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-medium ring-1 ring-white/30 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
              className="mx-auto block max-w-none rounded-lg bg-white"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
