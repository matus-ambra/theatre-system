import { useState, useEffect, useRef } from 'react'
import useResponsive from '../hooks/useResponsive'

const Modal = ({ message, type = 'prompt', defaultValue = '', currentLabel = '', currentWorkersNeeded = 3, onConfirm, onCancel }) => {
  const [inputValue, setInputValue] = useState(defaultValue)
  const [labelValue, setLabelValue] = useState(currentLabel)
  const [workersValue, setWorkersValue] = useState(currentWorkersNeeded.toString())
  const inputRef = useRef(null)
  const { isMobile, isSmallMobile } = useResponsive()

  useEffect(() => {
    if (type === 'prompt' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [type])

  const handleConfirm = () => {
    console.log('Modal confirm clicked, inputValue:', inputValue, 'type:', type)
    if (type === 'prompt') {
      onConfirm(inputValue)
    } else if (type === 'combined') {
      if (labelValue.trim() === '') return
      onConfirm({ label: labelValue, workersNeeded: workersValue })
    } else {
      onConfirm(true)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && type === 'prompt') {
      handleConfirm()
    }
  }

  return (
    <div id="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div id="modal" style={{
        background: '#fff',
        borderRadius: isMobile ? '16px' : '10px',
        maxWidth: isMobile ? 'none' : '500px',
        width: isMobile ? '95%' : '90%',
        maxHeight: isMobile ? '90vh' : 'none',
        overflowY: isMobile ? 'auto' : 'visible',
        padding: isMobile ? '24px' : '20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '16px' : '10px',
        margin: isMobile ? '20px' : '0'
      }}>
        <h2 id="modal-message" style={{ 
          margin: '0 0 15px 0', 
          fontSize: isMobile ? '20px' : '18px', 
          fontWeight: '600',
          textAlign: 'center',
          color: '#8B1538'
        }}>
          {type === 'combined' ? (currentLabel ? 'Upraviť predstavenie' : 'Pridať predstavenie') : 
           type === 'alert' ? 'Upozornenie' : message}
        </h2>
        
        {type === 'alert' && (
          <p style={{ 
            margin: '10px 0', 
            fontSize: isMobile ? '18px' : '16px', 
            color: '#333', 
            lineHeight: '1.5',
            textAlign: 'center',
            padding: isMobile ? '10px' : '0'
          }}>{message}</p>
        )}
        
        {type === 'prompt' && (
          <input
            ref={inputRef}
            type="text"
            id="modal-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              width: '100%',
              padding: isMobile ? '16px' : '10px 12px',
              fontSize: isMobile ? '18px' : '16px',
              borderRadius: '8px',
              border: '2px solid #e2e8f0',
              marginBottom: isMobile ? '12px' : '6px',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
          />
        )}
        
        {type === 'combined' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500', 
                fontSize: isMobile ? '16px' : '14px',
                color: '#8B1538'
              }}>Názov predstavenia:</label>
              <input
                ref={inputRef}
                type="text"
                value={labelValue}
                onChange={(e) => setLabelValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Zadajte názov predstavenia"
                style={{
                  width: '100%',
                  padding: isMobile ? '16px' : '12px',
                  fontSize: isMobile ? '18px' : '16px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500', 
                fontSize: isMobile ? '16px' : '14px',
                color: '#8B1538'
              }}>Počet potrebných uvádzačov:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={workersValue}
                onChange={(e) => setWorkersValue(e.target.value)}
                style={{
                  width: isMobile ? '120px' : '100px',
                  padding: isMobile ? '16px' : '12px',
                  fontSize: isMobile ? '18px' : '16px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
              />
            </div>
          </div>
        )}
        
        <div id="modal-buttons" style={{
          display: 'flex',
          justifyContent: type === 'alert' ? 'center' : (isMobile ? 'center' : 'flex-end'),
          gap: isMobile ? '12px' : '10px',
          marginTop: isMobile ? '20px' : '10px',
          flexWrap: 'wrap'
        }}>
          {type !== 'alert' && (
            <button
              className="cancel"
              onClick={onCancel}
              style={{
                padding: isMobile ? '16px 24px' : '12px 20px',
                borderRadius: '12px',
                border: '2px solid #8B1538',
                cursor: 'pointer',
                fontSize: isMobile ? '18px' : '16px',
                background: 'transparent',
                color: '#8B1538',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                touchAction: 'manipulation',
                minHeight: isMobile ? '48px' : 'auto',
                flex: isMobile ? '1' : 'none'
              }}
            >
              {type === 'confirm' ? 'Nie' : 'Zrušiť'}
            </button>
          )}
          <button
            className="confirm"
            onClick={handleConfirm}
            style={{
              padding: isMobile ? '16px 24px' : '12px 20px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: isMobile ? '18px' : '16px',
              background: '#8B1538',
              color: 'white',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              touchAction: 'manipulation',
              minHeight: isMobile ? '48px' : 'auto',
              flex: isMobile ? '1' : 'none',
              boxShadow: '0 2px 8px rgba(139, 21, 56, 0.3)'
            }}
          >
            {type === 'alert' ? 'OK' : type === 'prompt' ? 'Uložiť' : type === 'confirm' ? 'Áno' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal