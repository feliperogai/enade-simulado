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
        className="grid place-items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900"
      >
        <p className="text-zinc-600 dark:text-zinc-400">Não foi possível carregar a imagem desta questão.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false)
            setRetry(Date.now())
          }}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-medium text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:ring-indigo-500/40 dark:hover:bg-indigo-500/10"
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
        className="group relative block max-w-full cursor-zoom-in overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:ring-zinc-800"
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
        <span className="pointer-events-none absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-zinc-900/70 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIcon />
        </span>
      </button>

      <Modal open={zoomed} onClose={() => setZoomed(false)} label={`Questão ${question.n} ampliada`} className="m-0 h-dvh max-h-none w-screen max-w-none">
        <div className="flex h-full flex-col bg-zinc-950/95">
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
