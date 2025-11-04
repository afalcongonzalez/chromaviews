import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  duration?: number
  onClose: () => void
}

export function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300) // Wait for fade out
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg">
        {message}
      </div>
    </div>
  )
}

interface ToastManagerProps {
  toasts: string[]
  onRemove: (index: number) => void
}

export function ToastManager({ toasts, onRemove }: ToastManagerProps) {
  return (
    <>
      {toasts.map((message, index) => (
        <Toast
          key={index}
          message={message}
          onClose={() => onRemove(index)}
        />
      ))}
    </>
  )
}

