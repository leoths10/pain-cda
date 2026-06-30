import { BrowserRouter } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import { AuthProvider, PlanDataProvider, ThemeProvider } from './contexts'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PlanDataProvider>
            <AppLayout />
          </PlanDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
