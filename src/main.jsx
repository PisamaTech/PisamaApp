import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.jsx'
import Layout from './app/dashboard/page'
import { AuthPage } from './pages/AuthPage'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <Layout /> */}
    <AuthPage />
  </StrictMode>,
)
