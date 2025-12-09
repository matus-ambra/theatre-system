import { useState, useEffect } from 'react'
import Login from './components/Login'
import SlovakCalendar from './components/SlovakCalendar'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    
    if (token && role) {
      setUser({ token, role })
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    localStorage.setItem('token', userData.token)
    localStorage.setItem('role', userData.role)
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setUser(null)
  }

  if (loading) {
    return <div>Načíta...</div>
  }

  return (
    <div className="App">
      {!user && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          marginBottom: '20px',
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          margin: '20px auto'
        }}>
          <img 
            src="/lakomika-logo.svg" 
            alt="LA KOMIKA" 
            style={{ height: '120px', width: 'auto', marginBottom: '10px' }}
          />
          <h1 style={{ 
            margin: '10px 0 0 0', 
            color: '#8B1538', 
            textShadow: '0 1px 2px rgba(139, 21, 56, 0.1)', 
            fontSize: '1.8rem',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
Zdieľaný Kalendár
          </h1>
        </div>
      )}
      {user ? (
        <SlovakCalendar user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  )
}

export default App
