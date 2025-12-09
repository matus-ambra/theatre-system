import { useState, useEffect } from 'react'
import axios from 'axios'
import CalendarView from './CalendarView'

const AdminDashboard = ({ user, onLogout }) => {
  const [workers, setWorkers] = useState([])
  const [labels, setLabels] = useState([])
  const [newWorker, setNewWorker] = useState('')
  const [newLabel, setNewLabel] = useState({
    date: '',
    label: '',
    workers_needed: 1
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${user.token}` }
  })

  useEffect(() => {
    fetchWorkers()
    fetchLabels()
  }, [])

  const fetchWorkers = async () => {
    try {
      const response = await axios.get('/api/admin/workers', getAuthHeaders())
      setWorkers(response.data)
    } catch (error) {
      setError('Failed to fetch workers')
    }
  }

  const fetchLabels = async () => {
    try {
      const response = await axios.get('/api/admin/calendar-labels', getAuthHeaders())
      setLabels(response.data)
    } catch (error) {
      setError('Failed to fetch calendar labels')
    }
  }

  const addWorker = async (e) => {
    e.preventDefault()
    if (!newWorker.trim()) return

    setLoading(true)
    try {
      const response = await axios.post('/api/admin/workers', 
        { name: newWorker }, 
        getAuthHeaders()
      )
      setWorkers([...workers, response.data])
      setNewWorker('')
    } catch (error) {
      setError('Failed to add worker')
    } finally {
      setLoading(false)
    }
  }

  const removeWorker = async (workerId) => {
    setLoading(true)
    try {
      await axios.delete(`/api/admin/workers/${workerId}`, getAuthHeaders())
      setWorkers(workers.filter(w => w.id !== workerId))
    } catch (error) {
      setError('Failed to remove worker')
    } finally {
      setLoading(false)
    }
  }

  const addLabel = async (e) => {
    e.preventDefault()
    if (!newLabel.date || !newLabel.label || !newLabel.workers_needed) return

    setLoading(true)
    try {
      const response = await axios.post('/api/admin/calendar-labels', 
        newLabel, 
        getAuthHeaders()
      )
      setLabels([...labels, response.data])
      setNewLabel({ date: '', label: '', workers_needed: 1 })
    } catch (error) {
      setError('Failed to add calendar label')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Admin Dashboard</h1>
        <nav className="nav">
          <button onClick={onLogout} className="btn btn-danger">
            Logout
          </button>
        </nav>
      </header>

      {error && <div className="error">{error}</div>}

      <CalendarView user={user} />

      <div className="calendar-container">
        <h2>Add Calendar Label</h2>
        <form onSubmit={addLabel}>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={newLabel.date}
              onChange={(e) => setNewLabel({...newLabel, date: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="label">Label</label>
            <input
              type="text"
              id="label"
              value={newLabel.label}
              onChange={(e) => setNewLabel({...newLabel, label: e.target.value})}
              placeholder="e.g., Morning Shift, Event Setup"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="workers_needed">Workers Needed</label>
            <input
              type="number"
              id="workers_needed"
              min="1"
              value={newLabel.workers_needed}
              onChange={(e) => setNewLabel({...newLabel, workers_needed: parseInt(e.target.value)})}
              required
            />
          </div>
          
          <button type="submit" className="btn" disabled={loading}>
            Add Label
          </button>
        </form>

        <h3>Current Labels</h3>
        <div>
          {labels.map(label => (
            <div key={label.id} className="slot-item">
              <strong>{label.date}</strong> - {label.label} (Need {label.workers_needed} workers)
            </div>
          ))}
        </div>
      </div>

      <div className="workers-list">
        <h2>Worker Management</h2>
        
        <form onSubmit={addWorker}>
          <div className="form-group">
            <label htmlFor="worker-name">Add New Worker</label>
            <input
              type="text"
              id="worker-name"
              value={newWorker}
              onChange={(e) => setNewWorker(e.target.value)}
              placeholder="Worker name"
              required
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            Add Worker
          </button>
        </form>

        <h3>Current Workers</h3>
        <div>
          {workers.map(worker => (
            <div key={worker.id} className="worker-item">
              <span>{worker.name}</span>
              <button 
                onClick={() => removeWorker(worker.id)} 
                className="btn btn-danger"
                disabled={loading}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard