/**
 * A2A HTTP Client
 * Provides basic HTTP operations for A2A communication
 */

import type { ExecutorContext } from './types'

export interface A2AClientConfig {
  baseUrl: string
  token?: string
}

export interface A2AHttpClient extends ExecutorContext {}

export function createA2AHttpClient(config: A2AClientConfig): A2AHttpClient {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(config.token && { 'Authorization': `Bearer ${config.token}` })
  }
  
  return {
    async updateMessage(taskId, contextId, message) {
      const response = await fetch(`${config.baseUrl}/tasks/${taskId}/messages?contextId=${contextId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(message)
      })
      
      if (!response.ok) {
        console.log('[A2A HTTP Client] Response status:', response.status, response.statusText)
        throw new Error(`Failed to send message: ${response.statusText}`)
      }
    },
    
    async updateArtifact(taskId, contextId, artifact) {
      const response = await fetch(`${config.baseUrl}/tasks/${taskId}/artifacts?contextId=${contextId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(artifact)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save artifact: ${response.statusText}`)
      }
      
      return await response.json()
    },
    
    async getTask(taskId) {
      const response = await fetch(`${config.baseUrl}/tasks/${taskId}`, {
        headers
      })
      
      if (response.status === 404) {
        return null
      }
      
      if (!response.ok) {
        throw new Error(`Failed to get task: ${response.statusText}`)
      }
      
      return await response.json()
    },

    async updateStatus(taskId, contextId, status) {
      const response = await fetch(`${config.baseUrl}/tasks/${taskId}/status?contextId=${contextId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(status)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`)
      }
    },

    async cancelTask(taskId, contextId, message) {
      throw new Error('Not implemented')
    }
  }
}