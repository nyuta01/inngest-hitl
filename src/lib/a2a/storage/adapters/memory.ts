/**
 * In-memory storage adapter for A2A
 * 
 * This adapter stores all data in memory and is suitable for:
 * - Development and testing
 * - Single-instance deployments
 * - Temporary/ephemeral data
 * 
 * Note: Data is lost when the process restarts
 */

import type { StorageAdapter } from '../adapter'
import type { Task2, Message1, Artifact1, TaskStatus } from '@a2a-js/sdk'

interface MemoryStore {
  tasks: Map<string, Task2>
  messages: Map<string, Message1[]> // taskId -> messages
  artifacts: Map<string, Artifact1 & { taskId: string }> // artifactId -> artifact
}

export class MemoryStorageAdapter implements StorageAdapter {
  private store: MemoryStore

  constructor() {
    this.store = {
      tasks: new Map(),
      messages: new Map(),
      artifacts: new Map()
    }
  }

  // Task operations
  async saveTask(task: Task2): Promise<void> {
    this.store.tasks.set(task.id, { ...task })
  }

  async getTask(taskId: string): Promise<Task2 | null> {
    const task = this.store.tasks.get(taskId)
    return task ? { ...task } : null
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const task = this.store.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    // Update task status
    task.status = { ...status }
    
    // Add status message to history if provided
    if (status.message) {
      if (!task.history) {
        task.history = []
      }
      task.history.push(status.message)
      
      // Also save to messages
      await this.saveMessage(taskId, status.message)
    }
  }

  // Message operations
  async saveMessage(taskId: string, message: Message1): Promise<void> {
    const messages = this.store.messages.get(taskId) || []
    messages.push({ ...message })
    this.store.messages.set(taskId, messages)
  }

  async getMessages(taskId: string): Promise<Message1[]> {
    const messages = this.store.messages.get(taskId) || []
    return messages.map(msg => ({ ...msg }))
  }

  // Artifact operations
  async updateArtifact(artifact: Artifact1 & { taskId: string }): Promise<void> {
    this.store.artifacts.set(artifact.artifactId, { ...artifact })
    
    // Also add to task's artifacts array
    const task = this.store.tasks.get(artifact.taskId)
    if (task) {
      if (!task.artifacts) {
        task.artifacts = []
      }
      // Remove taskId from artifact before adding to task
      const { taskId, ...artifactWithoutTaskId } = artifact
      task.artifacts.push(artifactWithoutTaskId)
    }
  }

  async getArtifact(artifactId: string): Promise<Artifact1 | null> {
    const artifact = this.store.artifacts.get(artifactId)
    if (!artifact) return null
    
    const { taskId, ...artifactWithoutTaskId } = artifact
    return artifactWithoutTaskId
  }

  async getTaskArtifacts(taskId: string): Promise<Artifact1[]> {
    const artifacts: Artifact1[] = []
    
    for (const [_, artifact] of this.store.artifacts) {
      if (artifact.taskId === taskId) {
        const { taskId, ...artifactWithoutTaskId } = artifact
        artifacts.push(artifactWithoutTaskId)
      }
    }
    
    return artifacts
  }

  // Composite operations
  async getTaskWithHistory(taskId: string): Promise<{
    task: Task2
    messages: Message1[]
    artifacts: Artifact1[]
  } | null> {
    const task = await this.getTask(taskId)
    if (!task) return null

    const messages = await this.getMessages(taskId)
    const artifacts = await this.getTaskArtifacts(taskId)

    return {
      task,
      messages,
      artifacts
    }
  }

  // Additional utility methods
  
  /**
   * Clear all data from memory
   */
  clear(): void {
    this.store.tasks.clear()
    this.store.messages.clear()
    this.store.artifacts.clear()
  }

  /**
   * Get statistics about stored data
   */
  getStats(): {
    tasksCount: number
    messagesCount: number
    artifactsCount: number
  } {
    let messagesCount = 0
    for (const messages of this.store.messages.values()) {
      messagesCount += messages.length
    }

    return {
      tasksCount: this.store.tasks.size,
      messagesCount,
      artifactsCount: this.store.artifacts.size
    }
  }

  /**
   * Export all data (useful for debugging)
   */
  exportData(): {
    tasks: Task2[]
    messages: Record<string, Message1[]>
    artifacts: (Artifact1 & { taskId: string })[]
  } {
    return {
      tasks: Array.from(this.store.tasks.values()),
      messages: Object.fromEntries(this.store.messages),
      artifacts: Array.from(this.store.artifacts.values())
    }
  }
}

/**
 * Create a new memory storage adapter
 */
export function memoryAdapter(): StorageAdapter {
  return new MemoryStorageAdapter()
}