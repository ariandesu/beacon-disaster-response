import { Routes, Route, BrowserRouter } from 'react-router-dom'
import Requester from './pages/Requester'
import Responder from './pages/Responder'
import Command from './pages/Command'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Requester />} />
          <Route path="/respond" element={<Responder />} />
          <Route path="/command" element={<Command />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App