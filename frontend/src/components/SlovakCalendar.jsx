import { useState, useEffect } from 'react'
import api from '../api'
import Modal from './Modal'
import useResponsive from '../hooks/useResponsive'

const SlovakCalendar = ({ user, onLogout }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData] = useState({})
  const [workersList, setWorkersList] = useState({})
  const [showEditWorkers, setShowEditWorkers] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalProps, setModalProps] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })
  const [selectedWorkerForExport, setSelectedWorkerForExport] = useState('')
  const { isMobile, isSmallMobile } = useResponsive()

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  const monthNames = [
    'január', 'február', 'marec', 'apríl', 'máj', 'jún',
    'júl', 'august', 'september', 'október', 'november', 'december'
  ]

  const dayNames = ['P', 'U', 'S', 'Š', 'P', 'S', 'N']

  useEffect(() => {
    loadMonthData()
    loadWorkers()
  }, [currentDate])

  const loadMonthData = async () => {
    const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    console.log('Loading month data for:', yearMonth)
    try {
      const response = await api.post(`/api/month/${yearMonth}`, {}, getAuthHeaders())
      console.log('Month data response:', response.data)
      setData(response.data || {})
      setError('')
    } catch (error) {
      setError('Chyba pri načítaní dát')
      console.error('Error loading month data:', error)
    }
  }

  const loadWorkers = async () => {
    try {
      const response = await api.post('/api/workers-colors-get', {}, getAuthHeaders())
      console.log('Workers response:', response.data)
      setWorkersList(response.data || {})
    } catch (error) {
      console.error('Error loading workers:', error)
    }
  }

  const saveData = async (date, entry) => {
    console.log('Saving data for date:', date, 'entry:', entry)
    try {
      const response = await api.post(`/api/calendar/${date}`, entry, getAuthHeaders())
      console.log('Save response:', response.data)
      await loadMonthData()
      setError('') // Clear any previous errors
    } catch (error) {
      console.error('Error saving data:', error)
      setError('Chyba pri ukladaní: ' + (error.response?.data?.error || error.message))
    }
  }

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const showModal = (message, type = 'prompt', defaultValue = '') => {
    return new Promise((resolve) => {
      setModalProps({
        message,
        type,
        defaultValue,
        onConfirm: (value) => {
          setModalProps(null)
          resolve(value)
        },
        onCancel: () => {
          setModalProps(null)
          resolve(false)
        }
      })
    })
  }

  const addLabel = async (date) => {
    console.log('Adding label for date:', date)
    try {
      const result = await showCombinedModal()
      console.log('Combined modal result:', result)
      if (!result) {
        console.log('Label creation cancelled')
        return
      }

      const { label, workersNeeded } = result
      const workersNeededNum = parseInt(workersNeeded) || 3
      const existingData = data[date] || { workers: [] }
      console.log('Saving label data:', { label, workers: existingData.workers, workersNeeded: workersNeededNum })
      await saveData(date, { label, workers: existingData.workers, workersNeeded: workersNeededNum })
    } catch (error) {
      console.error('Error in addLabel:', error)
      setError('Chyba pri pridávaní predstavenia')
    }
  }

  const showCombinedModal = (currentLabel = '', currentWorkersNeeded = 3) => {
    return new Promise((resolve) => {
      setModalProps({
        type: 'combined',
        currentLabel,
        currentWorkersNeeded,
        onConfirm: (result) => {
          setModalProps(null)
          resolve(result)
        },
        onCancel: () => {
          setModalProps(null)
          resolve(false)
        }
      })
    })
  }

  const editLabel = async (date) => {
    console.log('Editing label for date:', date)
    try {
      const currentLabel = data[date]?.label || ''
      const currentWorkersNeeded = data[date]?.workersNeeded || 3
      const result = await showCombinedModal(currentLabel, currentWorkersNeeded)
      console.log('Edit combined modal result:', result)
      if (!result) {
        console.log('Label edit cancelled')
        return
      }

      const { label, workersNeeded } = result
      const workersNeededNum = parseInt(workersNeeded) || 3
      const existingData = data[date] || { workers: [] }
      console.log('Saving edited label data:', { label, workers: existingData.workers, workersNeeded: workersNeededNum })
      await saveData(date, { label, workers: existingData.workers, workersNeeded: workersNeededNum })
    } catch (error) {
      console.error('Error in editLabel:', error)
      setError('Chyba pri úprave predstavenia')
    }
  }

  const deleteLabel = async (date) => {
    const confirmed = await showModal("Naozaj chcete odstrániť predstavenie?", 'confirm')
    if (!confirmed) return
    await saveData(date, { label: '', workers: [] })
  }

  const pickWorker = async (date, workerName) => {
    if (!data[date]) return

    const existingData = data[date]

    // Check if worker is already assigned to this date
    if (existingData.workers && existingData.workers.includes(workerName)) {
      await showModal(`Uvádzač ${workerName} je už priradený k tomuto dňu.`, 'alert')
      return
    }

    const newWorkers = [...(existingData.workers || []), workerName]
    await saveData(date, { label: existingData.label, workers: newWorkers, workersNeeded: existingData.workersNeeded })
  }

  const removeWorker = async (date, workerIndex) => {
    const workerName = data[date].workers[workerIndex]
    const dayData = data[date]
    const dateObj = new Date(date)
    const formattedDate = `${dateObj.getDate()}.${dateObj.getMonth() + 1}.${dateObj.getFullYear()}`
    const confirmed = await showModal(`Naozaj chcete odstrániť uvádzača ${workerName} z dňa ${formattedDate} (${dayData.label})?`, 'confirm')
    if (!confirmed) return

    const existingData = data[date]
    const newWorkers = existingData.workers.filter((_, idx) => idx !== workerIndex)
    await saveData(date, { label: existingData.label, workers: newWorkers, workersNeeded: existingData.workersNeeded })
  }

  // Calendar export functionality for workers
  const exportMyCalendar = async (workerName, yearMonth) => {
    try {
      // Fetch worker assignments for the specific month
      const response = await api.post(`/api/worker-schedule/${workerName}/${yearMonth}`, {}, getAuthHeaders())
      const assignments = response.data

      if (assignments.length === 0) {
        await showModal(`Nemáte žiadne naplánované úlohy pre ${yearMonth}.`, 'alert')
        return
      }

      const icsContent = generateICSWithAssignments(workerName, assignments)

      // Create and download the ICS file
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${workerName}-${yearMonth}-calendar.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      await showModal(`Váš kalendár (${yearMonth}) bol úspešne exportovaný. Súbor môžete importovať do Apple Calendar alebo inej kalendárovej aplikácie.`, 'alert')

    } catch (error) {
      console.error('Error exporting calendar:', error)
      await showModal('Nastala chyba pri exportovaní kalendára. Skúste to znovu.', 'alert')
    }
  }

  const generateICSWithAssignments = (workerName, assignments) => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LA KOMIKA//Worker Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ]

    assignments.forEach((assignment, index) => {
      const eventId = `worker-${workerName}-${assignment.date}-${index}`
      const startDate = assignment.date.replace(/-/g, '')

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${eventId}@lakomika.sk`,
        `DTSTART;VALUE=DATE:${startDate}`,
        `DTEND;VALUE=DATE:${startDate}`,
        `SUMMARY:LA KOMIKA - ${assignment.label}`,
        `DESCRIPTION:Úloha uvádzača: ${workerName}\nPredstavenie: ${assignment.label}`,
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      )
    })

    icsContent.push('END:VCALENDAR')
    return icsContent.join('\r\n')
  }


  const renderCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startDay = firstDay === 0 ? 6 : firstDay - 1

    const weeks = []
    let day = 1

    for (let week = 0; week < 6; week++) {
      const days = []
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        if ((week === 0 && dayOfWeek < startDay) || day > daysInMonth) {
          days.push(<td key={`${week}-${dayOfWeek}`}></td>)
        } else {
          const dateStr = formatDate(new Date(year, month, day))
          const today = new Date()
          const isToday = today.getFullYear() === year &&
                         today.getMonth() === month &&
                         today.getDate() === day

          days.push(
            <td key={dateStr} className={isToday ? 'today' : ''}>
              <strong style={{ marginBottom: '8px', display: 'block' }}>{day}</strong>
              {renderDayContent(dateStr)}
            </td>
          )
          day++
        }
      }
      weeks.push(<tr key={week}>{days}</tr>)
      if (day > daysInMonth) break
    }

    return weeks
  }

  const renderMobileCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const mobileCards = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(year, month, day))
      const today = new Date()
      const isToday = today.getFullYear() === year &&
                     today.getMonth() === month &&
                     today.getDate() === day
      const dayData = data[dateStr]
      const dayOfWeek = new Date(year, month, day).getDay()
      const dayName = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1]

      // Only show days that have events or are today, or if user is admin
      if (!dayData && !isToday && user.role !== 'admin') {
        continue
      }

      mobileCards.push(
        <div key={dateStr} className={`mobile-day-card ${isToday ? 'mobile-today' : ''}`}>
          <div className="mobile-day-header">
            <div className="mobile-day-left">
              <span className="mobile-day-number">{day}</span>
              {isToday && <span className="mobile-today-text">DNES</span>}
            </div>
            <span className="mobile-day-name">{dayName}</span>
          </div>
          <div className="mobile-day-content">
            {renderDayContent(dateStr)}
          </div>
        </div>
      )
    }

    return mobileCards
  }

  const escapeHtml = (str) => {
    if (!str) return ''
    return String(str)
  }

  const renderDayContent = (dateStr) => {
    const dayData = data[dateStr]

    if (dayData) {
      return (
        <>
          <div className="label">{dayData.label}</div>
          {dayData.workers.map((workerName, idx) => {
            const color = workersList[workerName] || '#999999' // Default gray for deleted workers
            const isDeleted = !workersList[workerName] // Check if worker was deleted from list
            return (
              <div key={idx} className="worker">
                <span
                  style={{
                    backgroundColor: color,
                    opacity: isDeleted ? 0.6 : 1,
                    fontStyle: isDeleted ? 'italic' : 'normal'
                  }}
                  title={isDeleted ? `${workerName} (odstránený zo zoznamu)` : workerName}
                >
                  {workerName}
                </span>
                {user.role === 'worker' && (
                  <button onClick={() => removeWorker(dateStr, idx)}>x</button>
                )}
              </div>
            )
          })}
          {user.role === 'worker' && dayData.workers.length < (dayData.workersNeeded || 2) && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  pickWorker(dateStr, e.target.value)
                  e.target.value = '' // Reset selection
                }
              }}
              value=""
            >
              <option value="">Uvádzač</option>
              {Object.keys(workersList).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
          {(user.role === 'admin' || user.role === 'worker') && (
            <div className="capacity-indicator">
              {dayData.workers.length}/{dayData.workersNeeded || 2} uvádzačov
            </div>
          )}
          {user.role === 'admin' && (
            <>
              <br />
              <button className="small" onClick={() => editLabel(dateStr)}>
                Upraviť predstavenie
              </button>
              <button className="small admin-delete" onClick={() => deleteLabel(dateStr)}>
                Odstrániť predstavenie
              </button>
            </>
          )}
        </>
      )
    } else if (user.role === 'admin') {
      return (
        <button className="small" onClick={() => addLabel(dateStr)}>
          Pridať predstavenie
        </button>
      )
    }
    return null
  }

  // Add new state for admin views
  const [showAdminDashboard, setShowAdminDashboard] = useState(user.role === 'admin')
  const [showTheatreManagement, setShowTheatreManagement] = useState(false)

  if (showEditWorkers && user.role === 'admin') {
    return <EditWorkers
      workersList={workersList}
      setWorkersList={setWorkersList}
      onSave={loadWorkers}
      onCancel={() => {
        setShowEditWorkers(false)
        // Return to calendar, not dashboard
      }}
      user={user}
      showModal={showModal}
    />
  }

  if (showTheatreManagement && user.role === 'admin') {
    return <TheatreManagement
      onCancel={() => {
        setShowTheatreManagement(false)
        setShowAdminDashboard(true)
      }}
      user={user}
      showModal={showModal}
    />
  }

  if (showAdminDashboard && user.role === 'admin') {
    return (
      <div style={{
        padding: isMobile ? '20px' : '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #8B1538 0%, #A61E4D 100%)',
        boxSizing: 'border-box'
      }}>
        {/* Logo and Title in White Frame */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: isMobile ? '20px 24px' : '30px 40px',
          borderRadius: isMobile ? '16px' : '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          marginBottom: isMobile ? '30px' : '50px',
          border: '3px solid rgba(255,255,255,0.3)',
          textAlign: 'center',
          width: isMobile ? '100%' : 'auto',
          maxWidth: isMobile ? '100%' : 'none'
        }}>
          <img
            src="/lakomika-logo.svg"
            alt="LA KOMIKA"
            style={{
              height: isMobile ? '80px' : '100px',
              width: 'auto',
              marginBottom: isMobile ? '16px' : '20px'
            }}
          />
          <h1 style={{
            color: '#8B1538',
            margin: 0,
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Administrátorský panel
          </h1>
        </div>

        {/* Button grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: isMobile ? '20px' : '30px',
          maxWidth: isMobile ? '100%' : '600px',
          width: '100%',
          justifyItems: 'center',
          alignItems: 'center'
        }}>
          {/* Workers Management Button */}
          <button
            onClick={() => {
              setShowAdminDashboard(false)
              // Don't set showEditWorkers, just let it show the full calendar interface
            }}
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '24px 20px' : '40px 30px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '16px' : '20px',
              minHeight: isMobile ? '150px' : '200px',
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? '300px' : 'none',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)'
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{
              fontSize: isMobile ? '2.5rem' : '3rem',
              lineHeight: '1'
            }}>👕</div>
            <h3 style={{
              color: '#8B1538',
              margin: 0,
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: '1.3'
            }}>
              Spravovať<br />uvádzačov
            </h3>
          </button>

          {/* Theatre Management Button */}
          <button
            onClick={() => {
              setShowAdminDashboard(false)
              setShowTheatreManagement(true)
            }}
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '24px 20px' : '40px 30px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '16px' : '20px',
              minHeight: isMobile ? '150px' : '200px',
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? '300px' : 'none',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)'
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{
              fontSize: isMobile ? '2.5rem' : '3rem',
              lineHeight: '1'
            }}>🎭</div>
            <h3 style={{
              color: '#8B1538',
              margin: 0,
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: '1.3'
            }}>
              Spravovať<br />hercov
            </h3>
          </button>
        </div>

        {/* Logout button */}
        <div style={{
          marginTop: isMobile ? '30px' : '50px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.5)',
              borderRadius: isMobile ? '12px' : '25px',
              padding: isMobile ? '16px 32px' : '12px 24px',
              color: 'white',
              cursor: 'pointer',
              fontSize: isMobile ? '18px' : '16px',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              minHeight: isMobile ? '48px' : 'auto',
              touchAction: 'manipulation'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
            }}
          >
            Odhlásiť sa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id="calendar-container">
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
          {user.role === 'admin' && (
            <button onClick={() => setShowEditWorkers(true)}>Upraviť zoznam uvádzačov</button>
          )}
          {user.role === 'worker' && (
            <button onClick={() => setShowExportModal(true)}>Exportovať kalendár</button>
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
          {user.role === 'admin' ? (
            <button
              onClick={() => setShowAdminDashboard(true)}
              style={{
                background: 'rgba(139, 21, 56, 0.1)',
                border: '1px solid #8B1538',
                borderRadius: '6px',
                padding: '8px 16px',
                color: '#8B1538',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ← Späť
            </button>
          ) : (
            <button onClick={onLogout}>Odhlásiť sa</button>
          )}
        </div>
      </div>

      <div className="nav" style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '15px 20px',
        borderRadius: '12px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div>
          <button onClick={prevMonth} style={{
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#8B1538',
            border: '1px solid #8B1538',
            fontWeight: '600',
            padding: '10px 16px',
            borderRadius: '8px'
          }}>← Predchádzajúci</button>
        </div>
        <div style={{
          background: 'rgba(139, 21, 56, 0.08)',
          padding: '12px 24px',
          borderRadius: '12px',
          border: '2px solid rgba(139, 21, 56, 0.15)'
        }}>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: 'bold',
            color: '#8B1538',
            textShadow: '0 1px 2px rgba(139, 21, 56, 0.1)',
            letterSpacing: '1px',
            whiteSpace: 'nowrap'
          }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={nextMonth} style={{
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#8B1538',
            border: '1px solid #8B1538',
            fontWeight: '600',
            padding: '10px 16px',
            borderRadius: '8px'
          }}>Nasledujúci →</button>
        </div>
      </div>

      {error && <div className="error" style={{ color: 'red', margin: '10px 0' }}>{error}</div>}

      <div className="calendar-wrapper">
        <table className="desktop-calendar">
          <thead>
            <tr>
              {dayNames.map((day, index) => (
                <th key={`day-${index}`}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderCalendar()}
          </tbody>
        </table>

        <div className="mobile-calendar">
          {renderMobileCalendar()}
        </div>
      </div>

      {modalProps && <Modal {...modalProps} />}

      {/* Calendar Export Modal for Workers */}
      {showExportModal && user.role === 'worker' && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#8B1538' }}>
              Exportovať kalendár
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>Vyberte uvádzača:</label>
              <select
                value={selectedWorkerForExport}
                onChange={(e) => setSelectedWorkerForExport(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff'
                }}
              >
                <option value="">-- Vyberte uvádzača --</option>
                {Object.keys(workersList).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>Vyberte mesiac:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  color: '#555',
                  cursor: 'pointer'
                }}
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  exportMyCalendar(selectedWorkerForExport, selectedMonth)
                  setShowExportModal(false)
                }}
                disabled={!selectedWorkerForExport}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedWorkerForExport ? '#8B1538' : '#ccc',
                  color: '#fff',
                  cursor: selectedWorkerForExport ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Stiahnuť
              </button>
            </div>

            <p style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '10px',
              lineHeight: '1.4'
            }}>
              💡 Stiahnite si .ics súbor a otvorte ho v Apple Calendar, Google Calendar, Outlook alebo inej kalendárovej aplikácii.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const EditWorkers = ({ workersList, setWorkersList, onSave, onCancel, user, showModal }) => {
  const [workers, setWorkers] = useState({ ...workersList })
  const [newWorkerName, setNewWorkerName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#A61E4D')
  const [isOpen, setIsOpen] = useState(true)
  const [confirmingDelete, setConfirmingDelete] = useState(null)

  // Update workers when workersList changes
  useEffect(() => {
    setWorkers({ ...workersList })
  }, [workersList])

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  const availableColors = [
    "#8B1538", // Primary burgundy (matches app theme)
    "#4A5D23", // Olive green
    "#1F4E79", // Deep blue
    "#f1c40f", // Yellow
    "#8e5b2d", // Brown
    "#9b59b6", // Purple
    "#ff6b81", // Pink
    "#3498db", // Blue
    "#e67e22", // Orange
    "#95a5a6"  // Gray
  ]

  // Auto-save function
  const autoSaveWorkers = async (updatedWorkers) => {
    try {
      await api.post('/api/workers-colors', updatedWorkers, getAuthHeaders())
      setWorkersList(updatedWorkers)
      await onSave()
    } catch (error) {
      console.error('Error auto-saving workers:', error)
    }
  }

  const addWorker = async () => {
    const name = newWorkerName.trim()
    if (name && !workers[name]) {
      const updatedWorkers = { ...workers, [name]: selectedColor }
      setWorkers(updatedWorkers)
      setNewWorkerName('')
      await autoSaveWorkers(updatedWorkers)
    }
  }

  const removeWorker = async (name) => {
    if (!isOpen) return

    const newWorkers = { ...workers }
    delete newWorkers[name]
    setWorkers(newWorkers)
    await autoSaveWorkers(newWorkers)
    setConfirmingDelete(null)
  }

  const cancelDelete = () => {
    setConfirmingDelete(null)
  }

  const updateWorkerColor = async (name, color) => {
    const updatedWorkers = { ...workers, [name]: color }
    setWorkers(updatedWorkers)
    await autoSaveWorkers(updatedWorkers)
  }


  return (
    <div id="edit-workers-container">
      <h2>Spravujte uvádzačov</h2>
      <div id="workers-list">
        {Object.entries(workers).map(([name, color]) => (
          <div key={name} className="worker-row" style={{ alignItems: 'center', marginBottom: '12px', padding: '8px', border: '1px solid #eee', borderRadius: '6px', backgroundColor: '#fafafa' }}>
            <span style={{ flexGrow: 1, marginRight: '15px', fontWeight: '500' }}>{name}</span>

            {/* Color selection bubbles */}
            <div style={{ display: 'flex', gap: '6px', marginRight: '15px' }}>
              {availableColors.map(c => (
                <div
                  key={c}
                  onClick={() => updateWorkerColor(name, c)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: color === c ? '3px solid #333' : '2px solid #ccc',
                    boxSizing: 'border-box',
                    transition: 'transform 0.1s',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)'
                  }}
                  title={c}
                />
              ))}
            </div>

            {confirmingDelete === name ? (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => removeWorker(name)}
                  style={{
                    background: '#ff4d4f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Potvrdiť vymazanie"
                >✓</button>
                <button
                  onClick={cancelDelete}
                  style={{
                    background: '#ccc',
                    color: '#333',
                    border: 'none',
                    borderRadius: '4px',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Zrušiť"
                >×</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(name)}
                style={{
                  background: '#ff4d4f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
                title="Vymazať uvádzača"
              >×</button>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', border: '2px dashed #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginBottom: '10px', color: '#555' }}>Pridávať nového uvádzača</h3>

        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            id="new-worker-name"
            placeholder="Meno uvádzača"
            value={newWorkerName}
            onChange={(e) => setNewWorkerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addWorker()}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#555' }}>Vyberte farbu:</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableColors.map(c => (
              <div
                key={c}
                onClick={() => setSelectedColor(c)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: selectedColor === c ? '4px solid #333' : '3px solid #fff',
                  boxShadow: selectedColor === c ? '0 0 0 2px #333' : '0 2px 4px rgba(0,0,0,0.2)',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                  transform: selectedColor === c ? 'scale(1.1)' : 'scale(1)'
                }}
                title={c}
              />
            ))}
          </div>
        </div>

        <button
          onClick={addWorker}
          disabled={!newWorkerName.trim()}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: newWorkerName.trim() ? '#2ecc71' : '#ccc',
            color: '#fff',
            cursor: newWorkerName.trim() ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + Pridať uvádzača
        </button>
      </div>


      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <button onClick={() => { setIsOpen(false); onCancel(); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', color: '#555', cursor: 'pointer' }}>Zavrieť</button>
      </div>
    </div>
  )
}

const TheatreManagement = ({ onCancel, user, showModal }) => {
  const [currentView, setCurrentView] = useState('dashboard')
  const [actors, setActors] = useState({})
  const [plays, setPlays] = useState({})
  const [actorAvailability, setActorAvailability] = useState({})
  const { isMobile, isSmallMobile } = useResponsive()

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  // Load data on component mount
  useEffect(() => {
    loadActors()
    loadPlays()
    loadActorAvailability()
  }, [])

  const loadActors = async () => {
    try {
      const response = await axios.post('/api/actors-get', {}, getAuthHeaders())
      setActors(response.data || {})
    } catch (error) {
      console.error('Error loading actors:', error)
    }
  }

  const loadPlays = async () => {
    try {
      const response = await axios.post('/api/plays-get', {}, getAuthHeaders())
      setPlays(response.data || {})
    } catch (error) {
      console.error('Error loading plays:', error)
    }
  }

  const loadActorAvailability = async () => {
    try {
      const response = await axios.post('/api/actor-availability-get', {}, getAuthHeaders())
      setActorAvailability(response.data || {})
    } catch (error) {
      console.error('Error loading actor availability:', error)
    }
  }

  if (currentView === 'actors') {
    return <ActorList
      actors={actors}
      setActors={setActors}
      onBack={() => setCurrentView('dashboard')}
      user={user}
      showModal={showModal}
    />
  }

  if (currentView === 'availability') {
    return <ActorAvailability
      actors={actors}
      actorAvailability={actorAvailability}
      setActorAvailability={setActorAvailability}
      onBack={() => setCurrentView('dashboard')}
      user={user}
      showModal={showModal}
    />
  }

  if (currentView === 'repertoire') {
    return <PlayRepertoire
      plays={plays}
      setPlays={setPlays}
      actors={actors}
      onBack={() => setCurrentView('dashboard')}
      user={user}
      showModal={showModal}
    />
  }

  if (currentView === 'planner') {
    return <PlayPlanner
      plays={plays}
      actors={actors}
      actorAvailability={actorAvailability}
      onBack={() => setCurrentView('dashboard')}
      user={user}
      showModal={showModal}
    />
  }

  // Dashboard view
  return (
    <div style={{
      padding: isMobile ? '20px' : '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #8B1538 0%, #A61E4D 100%)',
      boxSizing: 'border-box'
    }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.9)',
          padding: isMobile ? '12px 16px' : '15px 20px',
          borderRadius: '12px',
          marginBottom: isMobile ? '16px' : '20px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: isMobile ? '100%' : '800px'
        }}>
          <div></div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img
              src="/lakomika-logo.svg"
              alt="LA KOMIKA"
              style={{ height: isMobile ? '70px' : '90px', width: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                background: 'rgba(139, 21, 56, 0.1)',
                border: '1px solid #8B1538',
                borderRadius: '6px',
                padding: '8px 16px',
                color: '#8B1538',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ← Späť
            </button>
          </div>
      </div>

      {/* Mini-apps grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '25px',
        maxWidth: '1000px',
        width: '100%'
      }}>
        {/* Actor List */}
        <button
          onClick={() => setCurrentView('actors')}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: '15px',
            padding: '30px 25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            minHeight: '180px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)'
            e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0px)'
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ fontSize: '3rem' }}>👥</div>
          <div>
            <h3 style={{
              color: '#8B1538',
              margin: '0 0 8px 0',
              fontSize: '1.3rem',
              fontWeight: 'bold'
            }}>
              Zoznam hercov
            </h3>
            <p style={{
              color: '#666',
              margin: 0,
              textAlign: 'center',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              Správa a úprava zoznamu hercov
            </p>
          </div>
        </button>

        {/* Actor Availability */}
        <button
          onClick={() => setCurrentView('availability')}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: '15px',
            padding: '30px 25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            minHeight: '180px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)'
            e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0px)'
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ fontSize: '3rem' }}>📅</div>
          <div>
            <h3 style={{
              color: '#8B1538',
              margin: '0 0 8px 0',
              fontSize: '1.3rem',
              fontWeight: 'bold'
            }}>
              Dostupnosť hercov
            </h3>
            <p style={{
              color: '#666',
              margin: 0,
              textAlign: 'center',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              Nastavenie dostupnosti hercov
            </p>
          </div>
        </button>

        {/* Play Repertoire */}
        <button
          onClick={() => setCurrentView('repertoire')}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: '15px',
            padding: '30px 25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            minHeight: '180px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)'
            e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0px)'
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ fontSize: '3rem' }}>📜</div>
          <div>
            <h3 style={{
              color: '#8B1538',
              margin: '0 0 8px 0',
              fontSize: '1.3rem',
              fontWeight: 'bold'
            }}>
              Repertoár hier
            </h3>
            <p style={{
              color: '#666',
              margin: 0,
              textAlign: 'center',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              Správa hier a rolí
            </p>
          </div>
        </button>

        {/* Play Planner */}
        <button
          onClick={() => setCurrentView('planner')}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: '15px',
            padding: '30px 25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
            minHeight: '180px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)'
            e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0px)'
            e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ fontSize: '3rem' }}>🎨</div>
          <div>
            <h3 style={{
              color: '#8B1538',
              margin: '0 0 8px 0',
              fontSize: '1.3rem',
              fontWeight: 'bold'
            }}>
              Plánovač hier
            </h3>
            <p style={{
              color: '#666',
              margin: 0,
              textAlign: 'center',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              Kalendár predstavení
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}

// Actor List Component
const ActorList = ({ actors, setActors, onBack, user, showModal }) => {
  const [newActorName, setNewActorName] = useState('')

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  const addActor = async () => {
    const name = newActorName.trim()
    if (name && !actors[name]) {
      try {
        const response = await axios.post('/api/actors', { name }, getAuthHeaders())
        setActors({ ...actors, [name]: { id: response.data.id, name } })
        setNewActorName('')
      } catch (error) {
        console.error('Error adding actor:', error)
      }
    }
  }

  const removeActor = async (name) => {
    try {
      await axios.delete(`/api/actors/${name}`, getAuthHeaders())
      const newActors = { ...actors }
      delete newActors[name]
      setActors(newActors)
    } catch (error) {
      console.error('Error removing actor:', error)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
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
        <div></div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src="/lakomika-logo.svg"
            alt="LA KOMIKA"
            style={{ height: '90px', width: 'auto' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onBack} style={{
            background: 'rgba(139, 21, 56, 0.1)',
            border: '1px solid #8B1538',
            borderRadius: '6px',
            padding: '8px 16px',
            color: '#8B1538',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ← Späť
          </button>
        </div>
      </div>

      {/* Actor List */}
      <div style={{
        background: 'rgba(255,255,255,0.9)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#8B1538', marginBottom: '15px' }}>Aktuálni herci</h3>
        {Object.keys(actors).length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Zatiaľ nie sú pridaní žiadni herci</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {Object.entries(actors).map(([name, actorData]) => (
              <div key={name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <span style={{ fontWeight: '500' }}>{name}</span>
                <button
                  onClick={() => removeActor(name)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Odstrániť
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Actor */}
      <div style={{
        background: 'rgba(255,255,255,0.9)',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#8B1538', marginBottom: '15px' }}>Pridať nového herca</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Meno herca"
            value={newActorName}
            onChange={(e) => setNewActorName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addActor()}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '14px'
            }}
          />
          <button
            onClick={addActor}
            disabled={!newActorName.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: newActorName.trim() ? '#8B1538' : '#ccc',
              color: 'white',
              cursor: newActorName.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Pridať
          </button>
        </div>
      </div>
    </div>
  )
}

// Actor Availability Component
const ActorAvailability = ({ actors, actorAvailability, setActorAvailability, onBack, user, showModal }) => {
  const [selectedActor, setSelectedActor] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [actorDates, setActorDates] = useState({})

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  const monthNames = [
    'január', 'február', 'marec', 'apríl', 'máj', 'jún',
    'júl', 'august', 'september', 'október', 'november', 'december'
  ]

  const dayNames = ['P', 'U', 'S', 'Š', 'P', 'S', 'N']

  // Load actor availability for selected actor and month
  useEffect(() => {
    if (selectedActor) {
      loadActorAvailability()
    }
  }, [selectedActor, currentDate])

  const loadActorAvailability = async () => {
    if (!selectedActor) return

    const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    try {
      const response = await axios.post(`/api/actor-availability/${selectedActor}/${yearMonth}`, {}, getAuthHeaders())
      setActorDates(response.data || {})
    } catch (error) {
      console.error('Error loading actor availability:', error)
      setActorDates({})
    }
  }

  const toggleActorAvailability = async (dateStr) => {
    if (!selectedActor) return

    const isAvailable = !actorDates[dateStr]
    const newDates = { ...actorDates, [dateStr]: isAvailable }

    if (!isAvailable) {
      delete newDates[dateStr]
    }

    try {
      await axios.post(`/api/actor-availability`, {
        actorName: selectedActor,
        date: dateStr,
        available: isAvailable
      }, getAuthHeaders())

      setActorDates(newDates)
    } catch (error) {
      console.error('Error updating actor availability:', error)
    }
  }

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const renderCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startDay = firstDay === 0 ? 6 : firstDay - 1

    const weeks = []
    let day = 1

    for (let week = 0; week < 6; week++) {
      const days = []
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        if ((week === 0 && dayOfWeek < startDay) || day > daysInMonth) {
          days.push(<td key={`${week}-${dayOfWeek}`} style={{ padding: '10px', textAlign: 'center', color: '#ccc' }}></td>)
        } else {
          const dateStr = formatDate(new Date(year, month, day))
          const isAvailable = actorDates[dateStr]
          const today = new Date()
          const isToday = today.getFullYear() === year &&
                         today.getMonth() === month &&
                         today.getDate() === day

          days.push(
            <td
              key={dateStr}
              style={{
                padding: '10px',
                textAlign: 'center',
                cursor: selectedActor ? 'pointer' : 'not-allowed',
                background: isAvailable ? '#d4edda' : (isToday ? '#fff3cd' : 'white'),
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontWeight: isToday ? 'bold' : 'normal',
                color: isAvailable ? '#155724' : (isToday ? '#856404' : '#333')
              }}
              onClick={() => selectedActor && toggleActorAvailability(dateStr)}
            >
              <div style={{ marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>{day}</div>
              {isAvailable && (
                <div style={{ fontSize: '12px', color: '#28a745' }}>✓ Dostupný</div>
              )}
            </td>
          )
          day++
        }
      }
      weeks.push(<tr key={week}>{days}</tr>)
      if (day > daysInMonth) break
    }

    return weeks
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
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
        <div></div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src="/lakomika-logo.svg"
            alt="LA KOMIKA"
            style={{ height: '90px', width: 'auto' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onBack} style={{
            background: 'rgba(139, 21, 56, 0.1)',
            border: '1px solid #8B1538',
            borderRadius: '6px',
            padding: '8px 16px',
            color: '#8B1538',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ← Späť
          </button>
        </div>
      </div>

      {/* Actor Selection */}
      <div style={{
        background: 'rgba(255,255,255,0.9)',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#8B1538', marginBottom: '15px' }}>Vyberte herca</h3>
        <select
          value={selectedActor}
          onChange={(e) => setSelectedActor(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            fontSize: '16px',
            backgroundColor: '#fff'
          }}
        >
          <option value="">-- Vyberte herca --</option>
          {Object.keys(actors).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {selectedActor && (
          <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            💡 Kliknite na dátumy v kalendári pre označenie dostupnosti herca <strong>{selectedActor}</strong>
          </p>
        )}
      </div>

      {selectedActor && (
        <>
          {/* Month Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.9)',
            padding: '15px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <button onClick={prevMonth} style={{
              background: 'rgba(139, 21, 56, 0.1)',
              border: '1px solid #8B1538',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#8B1538',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              ← Predchádzajúci
            </button>

            <h2 style={{
              margin: 0,
              color: '#8B1538',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>

            <button onClick={nextMonth} style={{
              background: 'rgba(139, 21, 56, 0.1)',
              border: '1px solid #8B1538',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#8B1538',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Nasledujúci →
            </button>
          </div>

          {/* Calendar */}
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}>
              <thead>
                <tr>
                  {dayNames.map((day, index) => (
                    <th key={`day-${index}`} style={{
                      padding: '10px',
                      textAlign: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      background: '#8B1538',
                      borderRadius: '4px'
                    }}>{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderCalendar()}
              </tbody>
            </table>

            {/* Legend */}
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '8px',
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', background: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}></div>
                <span>Dostupný</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                <span>Nedostupný</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}></div>
                <span>Dnes</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const PlayRepertoire = ({ plays, setPlays, actors, onBack, user, showModal }) => {
  const [currentView, setCurrentView] = useState('list') // 'list' or 'edit'
  const [editingPlay, setEditingPlay] = useState(null)
  const [newPlay, setNewPlay] = useState({
    name: '',
    description: '',
    characters: [{ name: '', actors: [''] }]
  })

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  // Load plays on component mount
  useEffect(() => {
    loadPlays()
  }, [])

  const loadPlays = async () => {
    try {
      const response = await axios.post('/api/plays-get', {}, getAuthHeaders())
      setPlays(response.data || {})
    } catch (error) {
      console.error('Error loading plays:', error)
    }
  }

  const savePlay = async (playData) => {
    try {
      if (editingPlay) {
        await axios.put(`/api/plays/${editingPlay.id}`, playData, getAuthHeaders())
      } else {
        await axios.post('/api/plays', playData, getAuthHeaders())
      }
      await loadPlays()
      setCurrentView('list')
      setEditingPlay(null)
      setNewPlay({ name: '', description: '', characters: [{ name: '', actors: [''] }] })
    } catch (error) {
      console.error('Error saving play:', error)
    }
  }

  const deletePlay = async (playId) => {
    try {
      await axios.delete(`/api/plays/${playId}`, getAuthHeaders())
      await loadPlays()
    } catch (error) {
      console.error('Error deleting play:', error)
    }
  }

  const startNewPlay = () => {
    setNewPlay({ name: '', description: '', characters: [{ name: '', actors: [''] }] })
    setEditingPlay(null)
    setCurrentView('edit')
  }

  const startEditPlay = (play) => {
    setNewPlay(play)
    setEditingPlay(play)
    setCurrentView('edit')
  }

  const addCharacter = () => {
    setNewPlay({
      ...newPlay,
      characters: [...newPlay.characters, { name: '', actors: [''] }]
    })
  }

  const removeCharacter = (index) => {
    const newCharacters = newPlay.characters.filter((_, i) => i !== index)
    setNewPlay({ ...newPlay, characters: newCharacters })
  }

  const updateCharacter = (index, field, value) => {
    const newCharacters = [...newPlay.characters]
    newCharacters[index] = { ...newCharacters[index], [field]: value }
    setNewPlay({ ...newPlay, characters: newCharacters })
  }

  const addAlternation = (characterIndex) => {
    const newCharacters = [...newPlay.characters]
    newCharacters[characterIndex].actors.push('')
    setNewPlay({ ...newPlay, characters: newCharacters })
  }

  const removeAlternation = (characterIndex, actorIndex) => {
    const newCharacters = [...newPlay.characters]
    newCharacters[characterIndex].actors = newCharacters[characterIndex].actors.filter((_, i) => i !== actorIndex)
    setNewPlay({ ...newPlay, characters: newCharacters })
  }

  const updateActor = (characterIndex, actorIndex, actorName) => {
    const newCharacters = [...newPlay.characters]
    newCharacters[characterIndex].actors[actorIndex] = actorName
    setNewPlay({ ...newPlay, characters: newCharacters })
  }

  const isPlayValid = () => {
    // Check if play has a name
    if (!newPlay.name.trim()) {
      return false
    }

    // Check if at least one character has at least one assigned actor
    const hasAssignedActor = newPlay.characters.some(character =>
      character.actors.some(actor => actor.trim())
    )

    return hasAssignedActor
  }

  if (currentView === 'edit') {
    return (
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
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
          <div></div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img
              src="/lakomika-logo.svg"
              alt="LA KOMIKA"
              style={{ height: '90px', width: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setCurrentView('list')} style={{
              background: 'rgba(139, 21, 56, 0.1)',
              border: '1px solid #8B1538',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#8B1538',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              ← Späť na zoznam
            </button>
          </div>
        </div>

        {/* Play Details */}
        <div style={{
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#8B1538', marginBottom: '15px' }}>Detaily hry</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#555' }}>Názov hry:</label>
            <input
              type="text"
              value={newPlay.name}
              onChange={(e) => setNewPlay({ ...newPlay, name: e.target.value })}
              placeholder="Zadajte názov hry"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#555' }}>Popis:</label>
            <textarea
              value={newPlay.description}
              onChange={(e) => setNewPlay({ ...newPlay, description: e.target.value })}
              placeholder="Krátky popis hry (volitelné)"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Characters */}
        <div style={{
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#8B1538', margin: 0 }}>Postavy a obsadenie</h3>
            <button
              onClick={addCharacter}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 15px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              + Pridať postavu
            </button>
          </div>

          {newPlay.characters.map((character, charIndex) => (
            <div key={charIndex} style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '15px',
              background: '#fafafa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ color: '#8B1538', margin: 0 }}>Postava #{charIndex + 1}</h4>
                {newPlay.characters.length > 1 && (
                  <button
                    onClick={() => removeCharacter(charIndex)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Odstrániť
                  </button>
                )}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: '#555' }}>Názov postavy:</label>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => updateCharacter(charIndex, 'name', e.target.value)}
                  placeholder="Nap. Hamlet, Kráľ Léar..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: '500', color: '#555' }}>Herci (alternácie):</label>
                  <button
                    onClick={() => addAlternation(charIndex)}
                    style={{
                      background: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    + Pridať alternáciu
                  </button>
                </div>

                {character.actors.map((actor, actorIndex) => (
                  <div key={actorIndex} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                    <select
                      value={actor}
                      onChange={(e) => updateActor(charIndex, actorIndex, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">-- Vyberte herca --</option>
                      {Object.keys(actors).map(actorName => (
                        <option key={actorName} value={actorName}>{actorName}</option>
                      ))}
                    </select>
                    {character.actors.length > 1 && (
                      <button
                        onClick={() => removeAlternation(charIndex, actorIndex)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '5px 8px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save/Cancel Buttons */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setCurrentView('list')}
            style={{
              padding: '12px 24px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: '#fff',
              color: '#555',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Zrušiť
          </button>
          <button
            onClick={() => savePlay(newPlay)}
            disabled={!isPlayValid()}
            style={{
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              background: isPlayValid() ? '#8B1538' : '#ccc',
              color: 'white',
              cursor: isPlayValid() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {editingPlay ? 'Uložiť zmeny' : 'Uložiť hru'}
          </button>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={startNewPlay}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Nová hra
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src="/lakomika-logo.svg"
            alt="LA KOMIKA"
            style={{ height: '90px', width: 'auto' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onBack} style={{
            background: 'rgba(139, 21, 56, 0.1)',
            border: '1px solid #8B1538',
            borderRadius: '6px',
            padding: '8px 16px',
            color: '#8B1538',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ← Späť
          </button>
        </div>
      </div>

      {/* Plays List */}
      <div style={{
        background: 'rgba(255,255,255,0.9)',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        {Object.keys(plays).length === 0 ? (
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎭</div>
            <h3 style={{ color: '#8B1538', marginBottom: '10px' }}>Zatiaľ nie sú pridané žiadne hry</h3>
            <p style={{ marginBottom: '20px' }}>Začnite vytvorením prvej hry vo vašom repertoári</p>
            <button
              onClick={startNewPlay}
              style={{
                background: '#8B1538',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              🎭 Pridať prvú hru
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gap: '15px' }}>
              {Object.entries(plays).map(([playId, play]) => (
                <div key={playId} style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '20px',
                  background: '#fafafa',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: '#8B1538', margin: '0 0 8px 0', fontSize: '1.3rem' }}>{play.name}</h3>
                      {play.description && (
                        <p style={{ color: '#666', margin: '0 0 15px 0', lineHeight: '1.4' }}>{play.description}</p>
                      )}

                      <div style={{ marginTop: '15px' }}>
                        <h4 style={{ color: '#555', margin: '0 0 10px 0', fontSize: '1rem' }}>Postavy ({play.characters?.length || 0}):</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {play.characters?.map((character, index) => (
                            <span key={index} style={{
                              background: '#e9ecef',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#495057'
                            }}>
                              {character.name} ({character.actors?.filter(a => a).length || 0} hercov)
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
                      <button
                        onClick={() => startEditPlay(play)}
                        style={{
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Upraviť
                      </button>
                      <button
                        onClick={async () => {
                          const confirmed = await showModal(`Naozaj chcete odstrániť hru "${play.name}"?`, 'confirm')
                          if (confirmed) {
                            deletePlay(playId)
                          }
                        }}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Odstrániť
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const PlayPlanner = ({ plays, actors, actorAvailability, onBack, user, showModal }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [actorAvailabilityData, setActorAvailabilityData] = useState({})
  const [playAvailability, setPlayAvailability] = useState({})
  const [selectedDate, setSelectedDate] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [dateDetails, setDateDetails] = useState(null)

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  const monthNames = [
    'január', 'február', 'marec', 'apríl', 'máj', 'jún',
    'júl', 'august', 'september', 'október', 'november', 'december'
  ]

  const dayNames = ['P', 'U', 'S', 'Š', 'P', 'S', 'N']

  // Load actor availability on component mount and date change
  useEffect(() => {
    loadActorAvailability()
  }, [currentDate])

  // Calculate play availability whenever actor availability or plays change
  useEffect(() => {
    calculatePlayAvailability()
  }, [actorAvailabilityData, plays])

  const loadActorAvailability = async () => {
    try {
      const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
      const allAvailability = {}

      // Load availability for each actor
      for (const actorName of Object.keys(actors)) {
        try {
          const response = await axios.get(`/api/actor-availability/${actorName}/${yearMonth}`, getAuthHeaders())
          allAvailability[actorName] = response.data || {}
        } catch (error) {
          console.error(`Error loading availability for ${actorName}:`, error)
          allAvailability[actorName] = {}
        }
      }

      setActorAvailabilityData(allAvailability)
    } catch (error) {
      console.error('Error loading actor availability:', error)
    }
  }

  const calculatePlayAvailability = () => {
    const availability = {}
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // Check each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(year, month, day))
      availability[dateStr] = {}

      // Check each play
      Object.entries(plays).forEach(([playId, play]) => {
        const canBePerformed = canPlayBePerformed(play, dateStr)
        if (canBePerformed.possible) {
          availability[dateStr][playId] = {
            name: play.name,
            possible: true,
            casting: canBePerformed.casting,
            missingActors: []
          }
        } else {
          availability[dateStr][playId] = {
            name: play.name,
            possible: false,
            casting: {},
            missingActors: canBePerformed.missingActors
          }
        }
      })
    }

    setPlayAvailability(availability)
  }

  const canPlayBePerformed = (play, dateStr) => {
    if (!play.characters || play.characters.length === 0) {
      return { possible: false, casting: {}, missingActors: ['No characters defined'] }
    }

    const casting = {}
    const missingActors = []
    let allCharactersCovered = true

    // Check each character
    play.characters.forEach((character, characterIndex) => {
      let characterCovered = false
      let availableActors = []

      // Check each actor assigned to this character
      if (character.actors && character.actors.length > 0) {
        for (const actorName of character.actors) {
          if (actorName && actorAvailabilityData[actorName] && actorAvailabilityData[actorName][dateStr]) {
            // This actor is available
            availableActors.push(actorName)
            characterCovered = true
          }
        }
      }

      if (characterCovered) {
        casting[characterIndex] = availableActors // Store all available actors
      } else {
        allCharactersCovered = false
        missingActors.push(`${character.name}: ${character.actors?.filter(a => a).join(', ') || 'No actors assigned'}`)
      }
    })

    return {
      possible: allCharactersCovered,
      casting,
      missingActors
    }
  }

  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const showDateDetails = (dateStr) => {
    const dayAvailability = playAvailability[dateStr] || {}
    const availablePlays = Object.entries(dayAvailability).filter(([playId, play]) => play.possible)
    const unavailablePlays = Object.entries(dayAvailability).filter(([playId, play]) => !play.possible)

    setDateDetails({
      date: dateStr,
      availablePlays,
      unavailablePlays
    })
    setSelectedDate(dateStr)
    setShowDetailsModal(true)
  }


  const renderCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startDay = firstDay === 0 ? 6 : firstDay - 1

    const weeks = []
    let day = 1

    for (let week = 0; week < 6; week++) {
      const days = []
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        if ((week === 0 && dayOfWeek < startDay) || day > daysInMonth) {
          days.push(<td key={`${week}-${dayOfWeek}`} style={{ padding: '8px', textAlign: 'center', color: '#ccc' }}></td>)
        } else {
          const dateStr = formatDate(new Date(year, month, day))
          const dayAvailability = playAvailability[dateStr] || {}
          const availablePlays = Object.entries(dayAvailability).filter(([playId, play]) => play.possible)
          const totalPlays = Object.keys(dayAvailability).length
          const today = new Date()
          const isToday = today.getFullYear() === year &&
                         today.getMonth() === month &&
                         today.getDate() === day

          // Determine cell background color based on availability
          let cellBackground = 'white'
          if (isToday) {
            cellBackground = '#fff3cd' // Today - yellow
          } else if (availablePlays.length > 0) {
            cellBackground = '#d4edda' // At least one play available - green
          } else if (totalPlays > 0) {
            cellBackground = '#f8d7da' // No plays available - red
          }

          days.push(
            <td
              key={dateStr}
              style={{
                padding: '4px',
                textAlign: 'center',
                cursor: 'pointer',
                background: cellBackground,
                border: '1px solid #ddd',
                borderRadius: '4px',
                verticalAlign: 'top',
                minHeight: '80px',
                position: 'relative'
              }}
              onClick={() => showDateDetails(dateStr)}
            >
              <div style={{
                fontWeight: isToday ? 'bold' : 'normal',
                color: isToday ? '#856404' : '#333',
                marginBottom: '4px',
                fontSize: '14px'
              }}>
                {day}
              </div>

              {/* Show available plays */}
              {availablePlays.slice(0, 3).map(([playId, play]) => (
                <div
                  key={playId}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    padding: '1px 3px',
                    borderRadius: '2px',
                    fontSize: '9px',
                    marginBottom: '1px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {play.name}
                </div>
              ))}

              {/* Show "and more" if there are more available plays */}
              {availablePlays.length > 3 && (
                <div style={{
                  fontSize: '8px',
                  color: '#28a745',
                  fontWeight: 'bold'
                }}>
                  +{availablePlays.length - 3} ďalších
                </div>
              )}
            </td>
          )
          day++
        }
      }
      weeks.push(<tr key={week}>{days}</tr>)
      if (day > daysInMonth) break
    }

    return weeks
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
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
        <div></div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src="/lakomika-logo.svg"
            alt="LA KOMIKA"
            style={{ height: '90px', width: 'auto' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onBack} style={{
            background: 'rgba(139, 21, 56, 0.1)',
            border: '1px solid #8B1538',
            borderRadius: '6px',
            padding: '8px 16px',
            color: '#8B1538',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ← Späť
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.9)',
        padding: '15px 20px',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <button onClick={prevMonth} style={{
          background: 'rgba(139, 21, 56, 0.1)',
          border: '1px solid #8B1538',
          borderRadius: '6px',
          padding: '8px 16px',
          color: '#8B1538',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          ← Predchádzajúci
        </button>

        <h2 style={{
          margin: 0,
          color: '#8B1538',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>

        <button onClick={nextMonth} style={{
          background: 'rgba(139, 21, 56, 0.1)',
          border: '1px solid #8B1538',
          borderRadius: '6px',
          padding: '8px 16px',
          color: '#8B1538',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          Nasledujúci →
        </button>
      </div>

      {/* Calendar */}
      <div style={{
        background: 'rgba(255,255,255,0.9)',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}>
          <thead>
            <tr>
              {dayNames.map((day, index) => (
                <th key={`day-${index}`} style={{
                  padding: '10px',
                  textAlign: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  background: '#8B1538',
                  borderRadius: '4px'
                }}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderCalendar()}
          </tbody>
        </table>

        {/* Legend */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f8f9fa',
          borderRadius: '8px',
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          fontSize: '14px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}></div>
            <span>Aspoň jedna hra dostupná</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#f8d7da', borderRadius: '4px', border: '1px solid #f5c6cb' }}></div>
            <span>Žiadne hry dostupné</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}></div>
            <span>Dnes</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡 Kliknite na deň pre zobrazenie detailov dostupnosti hier</span>
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {showDetailsModal && dateDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#8B1538', margin: 0 }}>
                Dostupnosť hier - {new Date(dateDetails.date).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setDateDetails(null)
                  setSelectedDate(null)
                }}
                style={{
                  background: '#f8f9fa',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            {/* Available Plays */}
            {dateDetails.availablePlays && dateDetails.availablePlays.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{
                  color: '#28a745',
                  margin: '0 0 15px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ✓ Dostupné hry ({dateDetails.availablePlays.length})
                </h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {dateDetails.availablePlays.map(([playId, play]) => (
                    <div key={playId} style={{
                      border: '2px solid #28a745',
                      borderRadius: '8px',
                      padding: '15px',
                      background: '#d4edda'
                    }}>
                      <h5 style={{ color: '#155724', margin: '0 0 10px 0', fontSize: '1.1rem' }}>{play.name}</h5>
                      <div style={{ fontSize: '14px', color: '#155724' }}>
                        <strong>Dostupné obsadenie:</strong>
                        <div style={{ marginTop: '5px' }}>
                          {plays[playId]?.characters?.map((character, index) => {
                            const availableActors = play.casting[index] || []
                            return (
                              <div key={index} style={{ marginBottom: '3px' }}>
                                • <strong>{character.name}:</strong> {Array.isArray(availableActors) ? availableActors.join(', ') : availableActors || 'Nie sú dostupní'}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unavailable Plays */}
            {dateDetails.unavailablePlays && dateDetails.unavailablePlays.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  color: '#dc3545',
                  margin: '0 0 15px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  × Nedostupné hry ({dateDetails.unavailablePlays.length})
                </h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {dateDetails.unavailablePlays.map(([playId, play]) => (
                    <div key={playId} style={{
                      border: '2px solid #dc3545',
                      borderRadius: '8px',
                      padding: '15px',
                      background: '#f8d7da'
                    }}>
                      <h5 style={{ color: '#721c24', margin: '0 0 10px 0', fontSize: '1.1rem' }}>{play.name}</h5>
                      <div style={{ fontSize: '14px', color: '#721c24' }}>
                        <strong>Chýbajúci herci:</strong>
                        <div style={{ marginTop: '5px' }}>
                          {play.missingActors.map((missing, index) => (
                            <div key={index} style={{ marginBottom: '3px' }}>
                              • {missing}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No plays defined */}
            {(!dateDetails.availablePlays || dateDetails.availablePlays.length === 0) &&
             (!dateDetails.unavailablePlays || dateDetails.unavailablePlays.length === 0) && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6c757d'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎭</div>
                <h4 style={{ color: '#6c757d', margin: '0 0 10px 0' }}>Nie sú definované žiadne hry</h4>
                <p style={{ margin: 0 }}>Najskôr vytvorte hry v module "Repertoár hier"</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setDateDetails(null)
                  setSelectedDate(null)
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  color: '#555',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SlovakCalendar
