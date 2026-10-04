import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { Layout } from './components/Layout'
import { LoadError, Loading } from './components/StatusScreens'
import { useExams } from './lib/data'
import { Exam } from './pages/Exam'
import { Home } from './pages/Home'
import { Result } from './pages/Result'

/** Cada tela nova começa do topo (a prova cuida da própria rolagem entre questões). */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  const exams = useExams()

  return (
    <HashRouter>
      <ScrollToTop />
      <Layout>
        {exams.status === 'loading' && <Loading />}
        {exams.status === 'error' && <LoadError onRetry={exams.retry} />}
        {exams.status === 'ready' && (
          <Routes>
            <Route path="/" element={<Home data={exams.data} />} />
            <Route path="/prova/:id" element={<Exam data={exams.data} />} />
            <Route path="/prova/:id/resultado" element={<Result data={exams.data} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Layout>
    </HashRouter>
  )
}
