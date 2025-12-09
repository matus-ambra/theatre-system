import { useState, useEffect } from 'react'
import MobileNav from './MobileNav'
import useResponsive from '../hooks/useResponsive'

// Example of how to integrate MobileNav with existing calendar component
const MobileCalendarExample = ({ user, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showExportModal, setShowExportModal] = useState(false)
  const { isMobile } = useResponsive()

  const monthNames = [
    'január', 'február', 'marec', 'apríl', 'máj', 'jún',
    'júl', 'august', 'september', 'október', 'november', 'december'
  ]

  const getCurrentMonthName = () => {
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleEditWorkers = () => {
    // Implementation for editing workers
    console.log('Edit workers clicked')
  }

  const handleExportCalendar = () => {
    setShowExportModal(true)
  }

  return (
    <div id="calendar-container">
      {/* Use MobileNav instead of traditional nav */}
      <MobileNav
        user={user}
        onLogout={onLogout}
        onEditWorkers={user.role === 'admin' ? handleEditWorkers : null}
        onExportCalendar={user.role === 'worker' ? handleExportCalendar : null}
        currentMonth={getCurrentMonthName()}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />

      {/* Calendar content */}
      <div className="calendar-wrapper">
        {/* Desktop calendar */}
        {!isMobile && (
          <table className="desktop-calendar">
            <thead>
              <tr>
                <th>P</th>
                <th>U</th>
                <th>S</th>
                <th>Š</th>
                <th>P</th>
                <th>S</th>
                <th>N</th>
              </tr>
            </thead>
            <tbody>
              {/* Desktop calendar content */}
              <tr>
                <td>Desktop calendar content here...</td>
              </tr>
            </tbody>
          </table>
        )}
        
        {/* Mobile calendar */}
        {isMobile && (
          <div className="mobile-calendar">
            <div className="mobile-day-card">
              <div className="mobile-day-header">
                <div className="mobile-day-left">
                  <span className="mobile-day-number">15</span>
                  <span className="mobile-today-text">DNES</span>
                </div>
                <span className="mobile-day-name">UT</span>
              </div>
              <div className="mobile-day-content">
                <div className="label">Testovanie Mobile UI</div>
                <div className="worker">
                  <span style={{ backgroundColor: '#8B1538' }}>Test Worker</span>
                </div>
                <div className="capacity-indicator">1/2 uvádzačov</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal (example) */}
      {showExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: isMobile ? '20px' : '0'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '24px' : '20px',
            borderRadius: '12px',
            width: isMobile ? '100%' : '400px',
            maxWidth: '400px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              marginBottom: '15px', 
              color: '#8B1538',
              fontSize: isMobile ? '20px' : '18px',
              textAlign: 'center'
            }}>
              Exportovať kalendár
            </h3>
            
            <p style={{
              marginBottom: '20px',
              fontSize: isMobile ? '16px' : '14px',
              textAlign: 'center',
              color: '#666'
            }}>
              Stiahnite si svoj kalendár vo formáte ICS
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: isMobile ? '16px 24px' : '12px 20px',
                  borderRadius: '12px',
                  border: '2px solid #8B1538',
                  background: 'transparent',
                  color: '#8B1538',
                  cursor: 'pointer',
                  fontSize: isMobile ? '16px' : '14px',
                  fontWeight: '600',
                  flex: isMobile ? '1' : 'none'
                }}
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  // Export logic here
                  setShowExportModal(false)
                }}
                style={{
                  padding: isMobile ? '16px 24px' : '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#8B1538',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: isMobile ? '16px' : '14px',
                  fontWeight: '600',
                  flex: isMobile ? '1' : 'none'
                }}
              >
                Stiahnuť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileCalendarExample