"use client"

interface ResearchCompleteDisplayProps {
  theme?: string
  plan?: {
    methods: string[]
    expectedOutcomes: string[]
    reasoning: string
  }
  execution?: {
    content: string
    reasoning: string
  }
}

export function ResearchCompleteDisplay({ theme, plan, execution }: ResearchCompleteDisplayProps) {
  return (
    <div className="space-y-3">
      {theme && (
        <div className="p-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Research Theme</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">{theme}</p>
        </div>
      )}

      {plan && (
        <div className="border-l-4 border-blue-500 pl-3 space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Research Methods</h4>
            <ul className="space-y-1 mt-1">
              {plan.methods.map((method, index) => (
                <li key={`method-${method.slice(0, 20)}-${index}`} className="flex items-start space-x-1">
                  <span className="text-blue-500">•</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{method}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Expected Outcomes</h4>
            <ul className="space-y-1 mt-1">
              {plan.expectedOutcomes.map((outcome, index) => (
                <li key={`outcome-${outcome.slice(0, 20)}-${index}`} className="flex items-start space-x-1">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Reasoning</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 p-2 border border-gray-300 dark:border-gray-700 mt-1">
              {plan.reasoning}
            </p>
          </div>
        </div>
      )}

      {execution && (
        <div className="border-l-4 border-green-500 pl-3 space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Research Results</h4>
            <div className="bg-white dark:bg-gray-800 p-2 border border-gray-300 dark:border-gray-700 mt-1">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {execution.content}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Analysis & Insights</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 p-2 border border-gray-300 dark:border-gray-700 mt-1">
              {execution.reasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}