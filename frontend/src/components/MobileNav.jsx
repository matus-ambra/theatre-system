import { useState } from 'react'
import useResponsive from '../hooks/useResponsive'

const MobileNav = ({ 
  user, 
  onLogout, 
  onEditWorkers, 
  onExportCalendar, 
  onAdminDashboard,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  showBackButton = false,
  onBack
}) => {
  const { isMobile, isSmallMobile } = useResponsive()
  const [showMenu, setShowMenu] = useState(false)

  if (!isMobile) {
    // Return desktop navigation
    return (
      <div className="nav" style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.9)',
        padding: '15px 20px',
        borderRadius: '12px',
        marginBottom: '20px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user.role === 'admin' && onEditWorkers && (
            <button onClick={onEditWorkers}>Upraviť zoznam uvádzačov</button>
          )}
          {user.role === 'worker' && onExportCalendar && (
            <button onClick={onExportCalendar}>Exportovať kalendár</button>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img 
            src="/lakomika-logo.svg" 
            alt="LA KOMIKA" 
            style={{ height: '90px', width: 'auto' }}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {showBackButton ? (
            <button onClick={onBack}>← Späť</button>
          ) : user.role === 'admin' && onAdminDashboard ? (
            <button onClick={onAdminDashboard}>← Späť</button>
          ) : (
            <button onClick={onLogout}>Odhlásiť sa</button>
          )}
        </div>
      </div>
    )
  }

  // Mobile navigation
  return (
    <>
      {/* Mobile Header */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '16px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: '10px',
        zIndex: 100
      }}>
        {/* Top row with logo and menu */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <img 
            src="/lakomika-logo.svg" 
            alt="LA KOMIKA" 
            style={{ height: '60px', width: 'auto' }}
          />
          
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: 'rgba(139, 21, 56, 0.1)',
              border: '2px solid #8B1538',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              fontSize: '24px',
              color: '#8B1538',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              touchAction: 'manipulation'
            }}
            aria-label="Menu"
          >
            {showMenu ? '✕' : '☰'}
          </button>
        </div>

        {/* Month navigation */}
        {currentMonth && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(139, 21, 56, 0.08)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '2px solid rgba(139, 21, 56, 0.15)'
          }}>
            <button 
              onClick={onPrevMonth}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#8B1538',
                border: '1px solid #8B1538',
                fontWeight: '600',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                touchAction: 'manipulation'
              }}
            >
              ← Predch.
            </button>
            
            <span style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#8B1538',
              textAlign: 'center',
              flex: 1,
              padding: '0 10px'
            }}>
              {currentMonth}
            </span>
            
            <button 
              onClick={onNextMonth}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#8B1538',
                border: '1px solid #8B1538',
                fontWeight: '600',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                touchAction: 'manipulation'
              }}
            >
              Nasl. →
            </button>
          </div>
        )}

        {/* Mobile menu dropdown */}
        {showMenu && (
          <div style={{
            marginTop: '12px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid rgba(139, 21, 56, 0.2)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {user.role === 'admin' && onEditWorkers && (
              <button
                onClick={() => {
                  onEditWorkers()
                  setShowMenu(false)
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '16px',
                  color: '#333',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(139, 21, 56, 0.1)',
                  touchAction: 'manipulation'
                }}
              >
                👥 Upraviť zoznam uvádzačov
              </button>
            )}
            
            {user.role === 'worker' && onExportCalendar && (
              <button
                onClick={() => {
                  onExportCalendar()
                  setShowMenu(false)
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '16px',
                  color: '#333',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(139, 21, 56, 0.1)',
                  touchAction: 'manipulation'
                }}
              >
                📅 Exportovať kalendár
              </button>
            )}
            
            {showBackButton && onBack ? (
              <button
                onClick={() => {
                  onBack()
                  setShowMenu(false)
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '16px',
                  color: '#333',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(139, 21, 56, 0.1)',
                  touchAction: 'manipulation'
                }}
              >
                ← Späť
              </button>
            ) : user.role === 'admin' && onAdminDashboard ? (
              <button
                onClick={() => {
                  onAdminDashboard()
                  setShowMenu(false)
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '16px',
                  color: '#333',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(139, 21, 56, 0.1)',
                  touchAction: 'manipulation'
                }}
              >
                🏠 Admin panel
              </button>
            ) : null}
            
            <button
              onClick={() => {
                onLogout()
                setShowMenu(false)
              }}
              style={{
                width: '100%',
                padding: '16px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                fontSize: '16px',
                color: '#dc3545',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              🚪 Odhlásiť sa
            </button>
          </div>
        )}
      </div>

      {/* Overlay to close menu */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.2)',
            zIndex: 50
          }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  )
}

export default MobileNav