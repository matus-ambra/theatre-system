import { useState, useEffect } from 'react'
import axios from 'axios'
import CalendarView from './CalendarView'

const WorkerDashboard = ({ user, onLogout }) => {
  const [availableSlots, setAvailableSlots] = useState([])
  const [workers, setWorkers] = useState([])
  const [selectedAssignments, setSelectedAssignments] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  useEffect(() => {
    fetchAvailableSlots()
    fetchWorkers()
  }, [])

  const fetchAvailableSlots = async () => {
    try {
      const response = await axios.get('/api/worker/available-slots', getAuthHeaders())
      setAvailableSlots(response.data)
    } catch (error) {
      setError('Failed to fetch available slots')
    }
  }

  const fetchWorkers = async () => {
    try {
      const response = await axios.get('/api/workers', getAuthHeaders())
      setWorkers(response.data)
    } catch (error) {
      setError('Failed to fetch workers')
    }
  }

  const handleWorkerSelect = (slotId, workerId) => {
    setSelectedAssignments({
      ...selectedAssignments,
      [slotId]: workerId
    })
  }

  const assignWorker = async (slotId) => {
    const workerId = selectedAssignments[slotId]
    if (!workerId) return

    setLoading(true)
    try {
      await axios.post('/api/worker/assign', 
        { calendar_label_id: slotId, worker_id: workerId }, 
        getAuthHeaders()
      )
      
      // Remove the slot from available slots or refresh the list
      fetchAvailableSlots()
      
      // Clear the selection
      const newSelections = { ...selectedAssignments }
      delete newSelections[slotId]
      setSelectedAssignments(newSelections)
      
      setError('') // Clear any previous errors
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to assign worker')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Worker Dashboard</h1>
        <nav className="nav">
          <button onClick={onLogout} className="btn btn-danger">
            Logout
          </button>
        </nav>
      </header>

      {error && <div className="error">{error}</div>}

      <CalendarView user={user} />

      <div className="available-slots">
        <h2>Available Slots</h2>
        <p>Choose workers to assign to open slots:</p>
        
        {availableSlots.length === 0 ? (
          <p>No available slots at this time.</p>
        ) : (
          availableSlots.map(slot => (
            <div key={slot.id} className="slot-item">
              <div>
                <h3>{slot.label}</h3>
                <p><strong>Date:</strong> {slot.date}</p>
                <p><strong>Workers needed:</strong> {slot.workers_needed}</p>
                <p><strong>Currently assigned:</strong> {slot.assigned_workers || 0}</p>
                <p><strong>Remaining slots:</strong> {slot.workers_needed - (slot.assigned_workers || 0)}</p>
              </div>
              
              <div className="assignment-section" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label htmlFor={`worker-select-${slot.id}`}>Select Worker:</label>
                  <select
                    id={`worker-select-${slot.id}`}
                    value={selectedAssignments[slot.id] || ''}
                    onChange={(e) => handleWorkerSelect(slot.id, e.target.value)}
                  >
                    <option value="">Choose a worker...</option>
                    {workers.map(worker => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button 
                  onClick={() => assignWorker(slot.id)}
                  className="btn"
                  disabled={!selectedAssignments[slot.id] || loading}
                  style={{ marginTop: '0.5rem' }}
                >
                  {loading ? 'Assigning...' : 'Assign Worker'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default WorkerDashboard