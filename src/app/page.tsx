"use client"

import { useState, useCallback } from "react";
import { ResearchForm } from "@/components/research-form";
import { ResearchDisplay } from "@/components/research-display";
import type { StreamMessage, WaitForEventMessage } from "@/types/research"

export default function Home() {
  const [messages, setMessages] = useState<StreamMessage[]>([])
  
  const handleMessageUpdate = useCallback((uuid: string, updates: Partial<WaitForEventMessage>) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.type === 'waitForEvent' && msg.uuid === uuid 
          ? { ...msg, ...updates } 
          : msg
      )
    )
  }, [])
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                AI Research
              </h1>
            </div>
            <nav className="flex items-center space-x-4">
              <a
                href="http://localhost:8288"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Inngest Dashboard
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Sidebar - Research Form */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
              <div className="p-4 border-b border-gray-300 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  New Research Request
                </h2>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                  Submit a research theme to start the workflow
                </p>
              </div>
              <div className="p-4">
                <ResearchForm 
                  onMessagesUpdate={setMessages} 
                />
              </div>
            </div>
          </div>

          {/* Right Content - Process Flow */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-3 h-[calc(100vh-7rem)] flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex-shrink-0">
                Active Research Process
              </h2>
              <div className="flex-1 overflow-hidden">
                <ResearchDisplay messages={messages} onMessageUpdate={handleMessageUpdate} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
