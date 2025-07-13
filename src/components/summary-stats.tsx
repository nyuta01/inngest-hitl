interface SummaryStatsProps {
  isCompleted: boolean
  completedSteps: number
  pendingApprovals: number
}

export function SummaryStats({ isCompleted, completedSteps, pendingApprovals }: SummaryStatsProps) {
  return (
    <div className="space-y-1.5">
      {isCompleted && (
        <div className="bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 p-1.5">
          <div className="flex items-center space-x-1.5">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              Research process completed successfully!
            </span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-1.5">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Completed Steps</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{completedSteps}</p>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 p-1.5">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Pending Actions</p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{pendingApprovals}</p>
        </div>
      </div>
    </div>
  )
}