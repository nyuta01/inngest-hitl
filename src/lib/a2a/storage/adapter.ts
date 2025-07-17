/**
 * Storage adapter interface
 */

import type { Task2, Message1, Artifact1, TaskStatus } from '@a2a-js/sdk'

/**
 * Storage adapter for persisting A2A data
 */
export interface StorageAdapter {
  // Task operations
  saveTask(task: Task2): Promise<void>
  getTask(taskId: string): Promise<Task2 | null>
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>
  
  // Message operations
  saveMessage(taskId: string, message: Message1): Promise<void>
  getMessages(taskId: string): Promise<Message1[]>
  
  // Artifact operations
  updateArtifact(artifact: Artifact1 & { taskId: string }): Promise<void>
  getArtifact(artifactId: string): Promise<Artifact1 | null>
  getTaskArtifacts(taskId: string): Promise<Artifact1[]>
  
  // Composite operations
  getTaskWithHistory(taskId: string): Promise<{
    task: Task2
    messages: Message1[]
    artifacts: Artifact1[]
  } | null>
}