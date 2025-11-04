interface LoaderProps {
  message?: string
}

export function Loader({ message = 'Analyzing colors...' }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      {/* Modern animated loader */}
      <div className="relative w-20 h-20 mb-6">
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
        {/* Animated spinner */}
        <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        {/* Inner pulsing circle */}
        <div className="absolute inset-3 bg-blue-600 rounded-full animate-pulse opacity-20"></div>
      </div>
      
      {/* Loading text */}
      <p className="text-lg font-medium text-gray-700">{message}</p>
      <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
    </div>
  )
}
