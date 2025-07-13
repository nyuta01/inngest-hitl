"use client"

interface ResearchPlan {
  methods?: string[]
  expectedOutcomes?: string[]
  reasoning?: string
}

interface ResearchPlanDisplayProps {
  plan: ResearchPlan
}

export function ResearchPlanDisplay({ plan }: ResearchPlanDisplayProps) {
  return (
    <div className="space-y-4">
      {plan.methods && plan.methods.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Research Methods</h4>
          <ul className="space-y-1">
            {plan.methods.map((method) => (
              <li key={`method-${method.slice(0, 20)}`} className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{method}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.expectedOutcomes && plan.expectedOutcomes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Expected Outcomes</h4>
          <ul className="space-y-1">
            {plan.expectedOutcomes.map((outcome) => (
              <li key={`outcome-${outcome.slice(0, 20)}`} className="flex items-start gap-2">
                <span className="text-green-500 dark:text-green-400 mt-1">✓</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.reasoning && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Reasoning</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{plan.reasoning}</p>
        </div>
      )}
    </div>
  )
}