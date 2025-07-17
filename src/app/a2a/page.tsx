'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface ResearchPlan {
  theme?: string
  sections?: Array<{
    title: string
    description: string
  }>
  questions?: string[]
  [key: string]: unknown
}

interface ResearchResult {
  theme?: string
  summary?: string
  findings?: Array<{
    title: string
    content: string
  }>
  conclusions?: string[]
  [key: string]: unknown
}

interface CurrentState {
  phase: 'idle' | 'start' | 'plan-approval' | 'execution-approval' | 'completed'
  requestId?: string
  taskId?: string
  contextId?: string
  streamUrl?: string
  researchPlan?: ResearchPlan
  researchResult?: ResearchResult
}

interface TaskHistoryItem {
  id: string
  contextId: string
  status: {
    state: string
    timestamp: string
    message?: {
      theme?: string
      plan?: ResearchPlan
      result?: ResearchResult
    }
  }
  metadata?: {
    depth?: number | string
    language?: string
    [key: string]: unknown
  }
  createdAt?: string
}

type TabType = 'research' | 'logs' | 'history'

export default function ResearchA2AV2DemoPage() {
  const [theme, setTheme] = useState('Next.js 15の新機能')
  const [depth, setDepth] = useState<'basic' | 'detailed' | 'comprehensive'>('basic')
  const [language, setLanguage] = useState<'ja' | 'en'>('ja')
  const [response, setResponse] = useState<string>('')
  const [events, setEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [sseConnected, setSseConnected] = useState(false)
  const [currentState, setCurrentState] = useState<CurrentState>({ phase: 'idle' })
  const processedMessageIds = useRef<Set<string>>(new Set())
  const [expandedPlan, setExpandedPlan] = useState(false)
  const [expandedResult, setExpandedResult] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('research')
  const eventsContainerRef = useRef<HTMLDivElement>(null)
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([])
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
  
  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('a2a-task-history')
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        setTaskHistory(parsed)
        setCompletedTasks(new Set(parsed.map((t: TaskHistoryItem) => t.id)))
      } catch (e) {
        console.error('Error loading task history:', e)
      }
    }
  }, [])

  // Auto-scroll events to bottom
  useEffect(() => {
    if (eventsContainerRef.current) {
      eventsContainerRef.current.scrollTop = eventsContainerRef.current.scrollHeight
    }
  }, [events])

  // SSE connection effect
  useEffect(() => {
    if (currentState.taskId && currentState.phase !== 'idle') {
      // Generate contextId if not provided
      const contextId = currentState.contextId || crypto.randomUUID()
      const eventSource = new EventSource(`/api/a2a/events?taskId=${currentState.taskId}&contextId=${contextId}`)
      setSseConnected(true)
      console.log('SSE connecting to:', `/api/a2a/events?taskId=${currentState.taskId}&contextId=${contextId}`)
      
      // Listen for open event
      eventSource.addEventListener('open', () => {
        console.log('SSE connection opened')
        setEvents(prev => [...prev, '[SSE] Connected'])
      })
      
      // Listen for status-update events
      eventSource.addEventListener('status-update', (event) => {
        console.log('SSE status-update event:', event.data)
        try {
          const parsed = JSON.parse(event.data)
          const { status } = parsed
          const message = status.message
          
          // Check for duplicate message
          if (message?.messageId && processedMessageIds.current.has(message.messageId)) {
            console.log('Duplicate message detected, skipping:', message.messageId)
            return
          }
          
          // Mark message as processed
          if (message?.messageId) {
            processedMessageIds.current.add(message.messageId)
          }
          
          // Extract text from message parts
          const textPart = message?.parts?.find((p: { kind: string }) => p.kind === 'text') as { text?: string } | undefined
          const text = textPart?.text || ''
          
          // Extract data from message parts
          const dataPart = message?.parts?.find((p: { kind: string }) => p.kind === 'data') as { data?: unknown } | undefined
          const data = dataPart?.data
          
          setEvents(prev => [...prev, `[status-update] ${status.state}: ${text}`])
          
          // Save research plan if present
          if (data && text.includes('リサーチプランを生成しました')) {
            setCurrentState(prev => ({ ...prev, researchPlan: data as ResearchPlan }))
          }
          
          // Save research result if present
          if (data && (text.includes('リサーチを完了しました') || text.includes('実行結果'))) {
            setCurrentState(prev => ({ ...prev, researchResult: data as ResearchResult }))
          }
          
          if (status.state === 'input-required') {
            const dataObj = data as Record<string, unknown>
            const requestId = (dataObj?.requestId as string) || parsed.taskId
            
            if (text.includes('プラン')) {
              // Save the plan data for display
              if (dataObj?.plan) {
                setCurrentState(prev => ({ ...prev, researchPlan: dataObj.plan as ResearchPlan }))
              }
              setCurrentState(prev => ({ ...prev, phase: 'plan-approval', requestId, contextId: parsed.contextId || prev.contextId }))
            } else if (text.includes('実行') || text.includes('結果')) {
              // Save the result data for display
              if (dataObj?.result || dataObj?.results) {
                const researchResult = (dataObj.result || dataObj.results || data) as ResearchResult
                setCurrentState(prev => ({ ...prev, researchResult }))
              }
              setCurrentState(prev => ({ ...prev, phase: 'execution-approval', requestId, contextId: parsed.contextId || prev.contextId }))
            }
          } else if (status.state === 'completed') {
            setCurrentState(prev => {
              const newState: CurrentState = { ...prev, phase: 'completed' }
              
              // Save completed task to history
              console.log('Task completed, checking for history save:', {
                taskId: newState.taskId,
                alreadyCompleted: completedTasks.has(newState.taskId || ''),
                newState
              })
              
              if (newState.taskId && !completedTasks.has(newState.taskId)) {
                setCompletedTasks(completed => new Set([...completed, newState.taskId!]))
                
                // Save to history with current state data
                const taskData: TaskHistoryItem = {
                  id: newState.taskId,
                  contextId: newState.contextId || '',
                  status: {
                    state: 'completed',
                    timestamp: new Date().toISOString(),
                    message: {
                      theme: theme || newState.researchPlan?.theme || 'Unknown theme',
                      plan: newState.researchPlan,
                      result: newState.researchResult
                    }
                  },
                  metadata: {
                    depth: depth || 3,
                    language: language || 'Japanese'
                  },
                  createdAt: new Date().toISOString()
                }
                
                console.log('Saving task data:', taskData)
                
                setTaskHistory(history => {
                  const newHistory = [taskData, ...history]
                  // Save to localStorage
                  try {
                    localStorage.setItem('a2a-task-history', JSON.stringify(newHistory))
                    console.log('Saved to localStorage successfully')
                  } catch (e) {
                    console.error('Error saving to localStorage:', e)
                  }
                  return newHistory
                })
              }
              
              return newState
            })
          }
        } catch (error) {
          console.error('Error parsing status-update event:', error)
        }
      })
      
      // Generic message handler for other events
      eventSource.addEventListener('message', (event) => {
        console.log('SSE generic message:', event.data)
      })
      
      // Listen for connected event
      eventSource.addEventListener('connected', (event) => {
        console.log('SSE connected event:', event.data)
        setEvents(prev => [...prev, '[SSE] Connection confirmed'])
      })
      
      // Note: status-update and input-required are now handled in the message event listener above
      
      eventSource.addEventListener('artifact-update', (event) => {
        console.log('SSE artifact-update received:', event.data)
        try {
          const parsed = JSON.parse(event.data)
          const artifact = parsed.artifact
          if (artifact) {
            setEvents(prev => [...prev, `[artifact-update] ${artifact.name || 'unnamed'}: ${artifact.description || 'no description'}`])
          }
        } catch (error) {
          console.error('Error parsing artifact-update event:', error)
        }
      })
      
      eventSource.addEventListener('task-complete', () => {
        setEvents(prev => [...prev, `[task-complete] Research finished`])
        setCurrentState(prev => ({ ...prev, phase: 'completed' }))
        eventSource.close()
        setSseConnected(false)
      })
      
      eventSource.onerror = () => {
        setSseConnected(false)
        eventSource.close()
      }
      
      return () => {
        eventSource.close()
        setSseConnected(false)
      }
    }
  }, [currentState.taskId, currentState.phase, currentState.contextId])

  const startResearch = async () => {
    setLoading(true)
    setResponse('')
    setEvents([])
    processedMessageIds.current.clear()
    
    try {
      const messageId = crypto.randomUUID()
      
      // Send research start request
      const a2aRequest = {
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId,
            role: 'user',
            parts: [
              { kind: 'text', text: theme },
              { 
                kind: 'data', 
                data: { 
                  theme,
                  depth,
                  language
                }
              }
            ],
            extensions: ['https://inngest-hitl.com/research/v2/start'],
            metadata: {}
          }
        }
      }
      
      const res = await fetch('/api/a2a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(a2aRequest)
      })
      
      const data = await res.json()
      setResponse(JSON.stringify(data, null, 2))
      
      if (data.result?.task) {
        setCurrentState({
          phase: 'start',
          taskId: data.result.task.id,
          contextId: data.result.task.contextId || crypto.randomUUID()
        })
      }
      
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const provideFeedback = async (decision: 'approve' | 'reject') => {
    if (!currentState.requestId || !currentState.taskId) return
    
    try {
      const extension = currentState.phase === 'plan-approval' 
        ? 'https://inngest-hitl.com/research/v2/plan-approval'
        : 'https://inngest-hitl.com/research/v2/execution-approval'
      
      const feedbackRequest = {
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: crypto.randomUUID(),
            role: 'user',
            parts: [{
              kind: 'data',
              data: {
                requestId: currentState.requestId,
                decision,
                feedback: decision === 'approve' ? 'Approved' : 'Rejected'
              }
            }],
            extensions: [extension],
            metadata: {}
          },
          context: {
            taskId: currentState.taskId
          }
        }
      }
      
      const res = await fetch('/api/a2a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackRequest)
      })
      
      const data = await res.json()
      setEvents(prev => [...prev, `[feedback] ${decision} response: ${JSON.stringify(data)}`])
      
      // Update state based on phase
      if (currentState.phase === 'plan-approval' && decision === 'approve') {
        setCurrentState(prev => ({ ...prev, phase: 'execution-approval' }))
      } else if (currentState.phase === 'execution-approval' || decision === 'reject') {
        setCurrentState(prev => {
          const newState: CurrentState = { ...prev, phase: 'completed' }
          
          // Save to history when completed via feedback
          if (newState.taskId && !completedTasks.has(newState.taskId)) {
            console.log('Task completed via feedback, saving to history')
            setCompletedTasks(completed => new Set([...completed, newState.taskId!]))
            
            // Save to history with current state data
            const taskData: TaskHistoryItem = {
              id: newState.taskId,
              contextId: newState.contextId || '',
              status: {
                state: 'completed',
                timestamp: new Date().toISOString(),
                message: {
                  theme: theme || newState.researchPlan?.theme || 'Unknown theme',
                  plan: newState.researchPlan,
                  result: newState.researchResult
                }
              },
              metadata: {
                depth: depth || 3,
                language: language || 'Japanese'
              },
              createdAt: new Date().toISOString()
            }
            
            console.log('Saving task data (feedback):', taskData)
            
            setTaskHistory(history => {
              const newHistory = [taskData, ...history]
              // Save to localStorage
              try {
                localStorage.setItem('a2a-task-history', JSON.stringify(newHistory))
                console.log('Saved to localStorage successfully (feedback)')
              } catch (e) {
                console.error('Error saving to localStorage:', e)
              }
              return newHistory
            })
          }
          
          return newState
        })
      }
      
    } catch (error) {
      setEvents(prev => [...prev, `[feedback-error] ${error instanceof Error ? error.message : 'Unknown error'}`])
    }
  }


  // Load task details using tasks/get
  const loadTaskDetails = async (taskId: string) => {
    try {
      const taskRequest = {
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'tasks/get',
        params: {
          taskId
        }
      }
      
      const res = await fetch('/api/a2a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskRequest)
      })
      
      const data = await res.json()
      if (data.result?.task) {
        // Extract research data from task
        const task = data.result.task
        const message = task.status?.message
        
        if (message) {
          const textPart = message.parts?.find((p: { kind: string }) => p.kind === 'text')
          const dataPart = message.parts?.find((p: { kind: string }) => p.kind === 'data')
          
          // Update current state with loaded task data
          setCurrentState({
            phase: 'idle',
            taskId: task.id,
            contextId: task.contextId,
            researchPlan: dataPart?.data?.plan || dataPart?.data,
            researchResult: dataPart?.data?.result || dataPart?.data?.results || null
          })
          
          // Switch to research tab to show the loaded task
          setActiveTab('research')
        }
      }
    } catch (error) {
      console.error('Error loading task details:', error)
    }
  }

  const getPhaseDisplay = () => {
    switch (currentState.phase) {
      case 'idle': return { text: 'Ready', color: 'bg-gray-100 text-gray-600' }
      case 'start': return { text: 'Starting', color: 'bg-blue-100 text-blue-700' }
      case 'plan-approval': return { text: 'Plan Review', color: 'bg-amber-100 text-amber-700' }
      case 'execution-approval': return { text: 'Result Review', color: 'bg-amber-100 text-amber-700' }
      case 'completed': return { text: 'Completed', color: 'bg-emerald-100 text-emerald-700' }
    }
  }

  const phaseInfo = getPhaseDisplay()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium text-gray-900">Research Assistant</h1>
            <div className="flex items-center gap-4">
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${phaseInfo.color}`}>
                  <span className="relative flex h-2 w-2">
                    {currentState.phase !== 'idle' && currentState.phase !== 'completed' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    )}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                  </span>
                  {phaseInfo.text}
                </div>
                {sseConnected && (
                  <span className="text-xs text-emerald-600 font-medium">● Connected</span>
                )}
              </div>
              {currentState.taskId && (
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-600">
                  {currentState.taskId.slice(0, 8)}...
                </code>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('research')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'research'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Research
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Logs
            {events.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                {events.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
            {taskHistory.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                {taskHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'research' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Input & Actions */}
            <div className="space-y-4">
              {/* Research Parameters */}
              <Card className="border border-gray-200 shadow-none bg-white">
                <CardContent className="p-4">
                  <h2 className="text-base font-medium mb-3 text-gray-900">Parameters</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Theme
                      </label>
                      <Textarea
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        placeholder="Enter research theme..."
                        className="h-14 border-gray-200 focus:border-gray-400 focus:ring-0 resize-none text-sm"
                        disabled={currentState.phase !== 'idle'}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Depth
                        </label>
                        <select
                          value={depth}
                          onChange={(e) => setDepth(e.target.value as 'basic' | 'detailed' | 'comprehensive')}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-gray-400 focus:outline-none bg-white"
                          disabled={currentState.phase !== 'idle'}
                        >
                          <option value="basic">Basic</option>
                          <option value="detailed">Detailed</option>
                          <option value="comprehensive">Comprehensive</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value as 'ja' | 'en')}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:border-gray-400 focus:outline-none bg-white"
                          disabled={currentState.phase !== 'idle'}
                        >
                          <option value="ja">Japanese</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={startResearch}
                    disabled={loading || currentState.phase !== 'idle'}
                    className="mt-4 w-full px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400 transition-all disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Starting...
                      </span>
                    ) : currentState.phase !== 'idle' ? (
                      'Research in Progress'
                    ) : (
                      'Start Research'
                    )}
                  </button>
                </CardContent>
              </Card>

              {/* Human Input Required */}
              {(currentState.phase === 'plan-approval' || currentState.phase === 'execution-approval') && (
                <Card className="border-2 border-amber-200 bg-amber-50 shadow-none">
                  <CardContent className="p-4">
                    <h2 className="text-base font-medium mb-2 text-amber-800 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Action Required
                    </h2>
                    <p className="mb-3 text-sm text-gray-700">
                      {currentState.phase === 'plan-approval' 
                        ? 'Please review and approve the research plan'
                        : 'Please review and approve the research results'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => provideFeedback('approve')}
                        className="flex-1 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => provideFeedback('reject')}
                        className="flex-1 px-3 py-1.5 bg-white text-gray-900 text-sm font-medium rounded border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Results */}
            <div className="space-y-4">
              {/* Research Plan */}
              {currentState.researchPlan && (
                <Card className="border border-gray-200 shadow-none bg-white overflow-hidden">
                  <div 
                    className="px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedPlan(!expandedPlan)}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-medium text-gray-900">Research Plan</h2>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedPlan ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {expandedPlan && (
                    <CardContent className="p-4 space-y-3 text-sm">
                      {currentState.researchPlan.theme && (
                        <div>
                          <span className="font-medium text-gray-700">Theme:</span>
                          <p className="mt-1 text-gray-600">{currentState.researchPlan.theme}</p>
                        </div>
                      )}
                      {currentState.researchPlan.approach && (
                        <div>
                          <span className="font-medium text-gray-700">Approach:</span>
                          <p className="mt-1 text-gray-600">{currentState.researchPlan.approach}</p>
                        </div>
                      )}
                      {currentState.researchPlan.keyQuestions && (
                        <div>
                          <span className="font-medium text-gray-700">Key Questions:</span>
                          <ul className="mt-1 space-y-1 text-gray-600">
                            {currentState.researchPlan.keyQuestions.map((q: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {currentState.researchPlan.expectedOutcomes && (
                        <div>
                          <span className="font-medium text-gray-700">Expected Outcomes:</span>
                          <p className="mt-1 text-gray-600">{currentState.researchPlan.expectedOutcomes}</p>
                        </div>
                      )}
                      {currentState.researchPlan.methodology && (
                        <div>
                          <span className="font-medium text-gray-700">Methodology:</span>
                          <p className="mt-1 text-gray-600">{currentState.researchPlan.methodology}</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Research Result */}
              {currentState.researchResult && (
                <Card className="border border-gray-200 shadow-none bg-white overflow-hidden">
                  <div 
                    className="px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedResult(!expandedResult)}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-medium text-gray-900">Research Result</h2>
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedResult ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {expandedResult && (
                    <CardContent className="p-4 space-y-3 text-sm">
                      {typeof currentState.researchResult === 'string' ? (
                        <div className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-700">
                          {currentState.researchResult}
                        </div>
                      ) : currentState.researchResult.summary ? (
                        <>
                          {currentState.researchResult.summary && (
                            <div>
                              <span className="font-medium text-gray-700">Summary:</span>
                              <div className="mt-1 bg-gray-50 p-3 rounded border border-gray-200 text-gray-600">
                                {currentState.researchResult.summary}
                              </div>
                            </div>
                          )}
                          {currentState.researchResult.keyFindings && (
                            <div>
                              <span className="font-medium text-gray-700">Key Findings:</span>
                              <ul className="mt-1 space-y-1 text-gray-600">
                                {currentState.researchResult.keyFindings.map((finding: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-gray-400 mt-0.5">•</span>
                                    <span>{finding}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {currentState.researchResult.recommendations && (
                            <div>
                              <span className="font-medium text-gray-700">Recommendations:</span>
                              <ul className="mt-1 space-y-1 text-gray-600">
                                {currentState.researchResult.recommendations.map((rec: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-gray-400 mt-0.5">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-auto text-gray-700 text-xs">
                          {JSON.stringify(currentState.researchResult, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          </div>
        ) : activeTab === 'logs' ? (
          /* Logs Tab */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* JSON-RPC Response */}
            <Card className="border border-gray-200 shadow-none bg-white">
              <CardContent className="p-4">
                <h2 className="text-base font-medium mb-3 text-gray-900">JSON-RPC Response</h2>
                <pre className="bg-gray-50 p-3 rounded border border-gray-200 overflow-auto text-xs font-mono text-gray-700 max-h-96">
                  {response || 'No response yet'}
                </pre>
              </CardContent>
            </Card>

            {/* Real-time Events */}
            <Card className="border border-gray-200 shadow-none bg-white">
              <CardContent className="p-4">
                <h2 className="text-base font-medium mb-3 text-gray-900">Real-time Events</h2>
                <div 
                  ref={eventsContainerRef}
                  className="bg-gray-50 p-3 rounded border border-gray-200 overflow-auto max-h-96 text-xs font-mono"
                >
                  {events.length === 0 ? (
                    <p className="text-gray-400">No events yet</p>
                  ) : (
                    <div className="space-y-1">
                      {events.map((event, index) => (
                        <div key={index} className="text-gray-700 animate-fadeIn">
                          {event}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* History Tab */
          <div className="max-w-4xl mx-auto">
            <Card className="border border-gray-200 shadow-none bg-white">
              <CardContent className="p-4">
                <h2 className="text-base font-medium mb-4 text-gray-900">Execution History</h2>
                
                {taskHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No execution history yet</p>
                    <p className="text-xs text-gray-400 mt-1">Completed tasks will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {taskHistory.map((task) => (
                      <div 
                        key={task.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => loadTaskDetails(task.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {task.status.message?.theme || 'Research Task'}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                Completed
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(task.createdAt || task.status.timestamp).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                                {task.id.slice(0, 8)}
                              </span>
                              {task.metadata && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span>{task.metadata.depth || 'basic'}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>{task.metadata.language || 'ja'}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              loadTaskDetails(task.id)
                            }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}