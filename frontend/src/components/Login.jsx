import { useState } from 'react'
import api from '../api'
import useResponsive from '../hooks/useResponsive'

const Login = ({ onLogin }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { isMobile, isSmallMobile } = useResponsive()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) {
      setError('Zadajte heslo')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/api/login', {
        password
      })
      onLogin(response.data)
    } catch (error) {
      if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError('Prihlásenie zlyhalo. Skúste znova.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div id="login" style={{
      padding: isMobile ? '20px' : '40px',
      margin: isMobile ? '10px' : 'auto',
      maxWidth: isMobile ? 'none' : '400px',
      width: isMobile ? 'calc(100% - 20px)' : 'auto'
    }}>
      {/* Logo for mobile */}
      {isMobile && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img 
            src="/lakomika-logo.svg" 
            alt="LA KOMIKA" 
            style={{ height: '80px', width: 'auto' }}
          />
        </div>
      )}
      
      <p style={{ 
        fontSize: isMobile ? '18px' : '16px',
        textAlign: 'center',
        marginBottom: '20px',
        fontWeight: '500'
      }}>Zadajte heslo:</p>
      
      <input
        type={showPassword ? 'text' : 'password'}
        id="passcode"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={loading}
        placeholder="Heslo"
        style={{
          width: '100%',
          fontSize: isMobile ? '18px' : '16px',
          padding: isMobile ? '16px' : '12px 16px',
          textAlign: 'center',
          borderRadius: '12px',
          border: '2px solid #e2e8f0',
          outline: 'none',
          margin: '8px 0',
          transition: 'all 0.3s ease',
          background: 'white',
          boxSizing: 'border-box'
        }}
      />
      
      <div style={{ 
        display: 'flex', 
        gap: isMobile ? '8px' : '10px', 
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={handleSubmit} 
          disabled={loading}
          style={{
            flex: isMobile ? '1' : 'none',
            minWidth: isMobile ? '0' : 'auto',
            fontSize: isMobile ? '18px' : '16px',
            padding: isMobile ? '16px 20px' : '12px 16px',
            borderRadius: '12px',
            border: 'none',
            background: loading ? '#ccc' : '#8B1538',
            color: 'white',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            touchAction: 'manipulation'
          }}
        >
          {loading ? 'Prihlasuje...' : 'Prihlásiť sa'}
        </button>
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            background: 'rgba(139, 21, 56, 0.1)',
            border: '1px solid rgba(139, 21, 56, 0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: isMobile ? '22px' : '20px',
            padding: isMobile ? '12px' : '8px',
            color: '#8B1538',
            transition: 'all 0.3s ease',
            touchAction: 'manipulation',
            minWidth: isMobile ? '50px' : 'auto'
          }}
          aria-label={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
      
      {error && (
        <div style={{
          color: '#dc3545',
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid rgba(220, 53, 69, 0.2)',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: isMobile ? '16px' : '14px'
        }}>
          {error}
        </div>
      )}
      
    </div>
  )
}

export default Login
