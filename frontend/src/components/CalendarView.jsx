import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import api from '../api'

const CalendarView = ({ user }) => {
  const [calendarData, setCalendarData] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  useEffect(() => {
    fetchCalendarData()
  }, [])

  const fetchCalendarData = async () => {
    setLoading(true)
    try {
      const response = await api.post('/api/calendar-data', {}, getAuthHeaders())
      setCalendarData(response.data)
    } catch (error) {
      setError('Failed to fetch calendar data')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to format date to YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  // Get data for a specific date
  const getDateData = (date) => {
    const dateStr = formatDate(date)
    return calendarData.filter(item => item.date === dateStr)
  }

  // Custom tile content to show labels and worker counts
  const tileContent = ({ date }) => {
    const dateData = getDateData(date)
    if (dateData.length === 0) return null

    return (
      <div className="calendar-tile-content">
        {dateData.map((item, index) => (
          <div key={item.id} className="calendar-label">
            <div className="label-text">{item.label}</div>
            <div className="worker-count">
              {item.assigned_workers}/{item.workers_needed}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Add class names to tiles with data
  const tileClassName = ({ date }) => {
    const dateData = getDateData(date)
    if (dateData.length === 0) return null

    const hasFullSlots = dateData.some(item => item.assigned_workers >= item.workers_needed)
    const hasAvailableSlots = dateData.some(item => item.assigned_workers < item.workers_needed)

    if (hasAvailableSlots && !hasFullSlots) return 'calendar-tile-available'
    if (hasFullSlots && !hasAvailableSlots) return 'calendar-tile-full'
    if (hasFullSlots && hasAvailableSlots) return 'calendar-tile-partial'
    
    return 'calendar-tile-with-data'
  }

  // Get selected date details
  const selectedDateData = getDateData(selectedDate)

  return (
    <div className="calendar-view">
      <div className="calendar-section">
        <h2>Schedule Calendar</h2>
        {error && <div className="error">{error}</div>}
        {loading && <div>Loading calendar...</div>}
        
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color legend-available"></div>
            <span>Available Slots</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-partial"></div>
            <span>Partially Filled</span>
          </div>
          <div className="legend-item">
            <div className="legend-color legend-full"></div>
            <span>Fully Assigned</span>
          </div>
        </div>

        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
          className="schedule-calendar"
        />
      </div>

      <div className="date-details">
        <h3>Details for {formatDate(selectedDate)}</h3>
        {selectedDateData.length === 0 ? (
          <p>No scheduled events for this date.</p>
        ) : (
          <div className="date-events">
            {selectedDateData.map(item => (
              <div key={item.id} className="event-card">
                <h4>{item.label}</h4>
                <div className="event-info">
                  <p><strong>Workers Needed:</strong> {item.workers_needed}</p>
                  <p><strong>Assigned Workers:</strong> {item.assigned_workers}</p>
                  {item.assigned_workers < item.workers_needed && (
                    <p className="slots-available">
                      <strong>Available Slots:</strong> {item.workers_needed - item.assigned_workers}
                    </p>
                  )}
                </div>
                
                {item.assigned_worker_names.length > 0 && (
                  <div className="assigned-workers">
                    <strong>Assigned Workers:</strong>
                    <ul>
                      {item.assigned_worker_names.map((name, index) => (
                        <li key={index}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CalendarView