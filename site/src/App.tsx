import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { LoadError, Loading } from './components/StatusScreens'
import { useExams } from './lib/data'
import { Exam } from './pages/Exam'
import { Home } from './pages/Home'
import { Result } from './pages/Result'

export default function App() {
  const exams = useExams()

  return (
    <HashRouter>
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
