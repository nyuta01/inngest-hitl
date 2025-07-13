interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
  className?: string
}

const alertStyles = {
  error: {
    container: 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-900 dark:text-red-100'
  },
  success: {
    container: 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-900 dark:text-green-100'
  },
  warning: {
    container: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700',
    icon: 'text-yellow-600 dark:text-yellow-400',
    text: 'text-yellow-900 dark:text-yellow-100'
  },
  info: {
    container: 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-900 dark:text-blue-100'
  }
}

const alertIcons = {
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function Alert({ type, message, className = '' }: AlertProps) {
  const styles = alertStyles[type]
  const icon = alertIcons[type]

  return (
    <div className={`p-3 border ${styles.container} ${className}`}>
      <div className="flex items-center space-x-2">
        <span className={styles.icon}>{icon}</span>
        <span className={`text-sm font-medium ${styles.text}`}>
          {message}
        </span>
      </div>
    </div>
  )
}