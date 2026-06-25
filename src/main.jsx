import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'

function Root() {
  const [usuario, setUsuario] = useState(null)
  const [rol, setRol] = useState(null)

  if (!usuario) {
    return <Login onLogin={(u, r) => { setUsuario(u); setRol(r) }} />
  }
  return <App usuario={usuario} rol={rol} onLogout={() => { setUsuario(null); setRol(null) }} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)