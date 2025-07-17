/**
 * Tests for memory storage adapter
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { memoryAdapter } from '../storage/adapters/memory'
import { MemoryStorageAdapter } from '../storage/adapters/memory'
import type { Task, Message, Artifact } from '../schemas'

describe('MemoryStorageAdapter', () => {
  let adapter: MemoryStorageAdapter

  beforeEach(() => {
    adapter = new MemoryStorageAdapter()
  })

  describe('Task operations', () => {
    it('should save and retrieve a task', async () => {
      const task: Task = {
        contextId: 'test-context',
        id: 'task-123',
        kind: 'task',
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString()
        },
        metadata: {}
      }

      await adapter.saveTask(task)
      const retrieved = await adapter.getTask('task-123')

      expect(retrieved).toEqual(task)
    })

    it('should return null for non-existent task', async () => {
      const result = await adapter.getTask('non-existent')
      expect(result).toBeNull()
    })

    it('should update task status', async () => {
      const task: Task = {
        contextId: 'test-context',
        id: 'task-456',
        kind: 'task',
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString()
        },
        metadata: {}
      }

      await adapter.saveTask(task)
      
      const newStatus: Task['status'] = {
        state: 'working',
        message: {
          kind: 'message',
          messageId: 'msg-789',
          role: 'agent',
          parts: [{ kind: 'text', text: 'Processing...' }],
          metadata: {}
        },
        timestamp: new Date().toISOString()
      }

      await adapter.updateTaskStatus('task-456', newStatus)
      const updated = await adapter.getTask('task-456')

      expect(updated?.status).toEqual(newStatus)
      expect(updated?.history).toHaveLength(1)
      expect(updated?.history?.[0]).toEqual(newStatus.message)
    })

    it('should throw error when updating non-existent task', async () => {
      await expect(
        adapter.updateTaskStatus('non-existent', { state: 'working' })
      ).rejects.toThrow('Task not found')
    })
  })

  describe('Message operations', () => {
    it('should save and retrieve messages', async () => {
      const message1: Message = {
        kind: 'message',
        messageId: 'msg-1',
        role: 'user',
        parts: [{ kind: 'text', text: 'Hello' }],
        metadata: {}
      }

      const message2: Message = {
        kind: 'message',
        messageId: 'msg-2',
        role: 'agent',
        parts: [{ kind: 'text', text: 'Hi there' }],
        metadata: {}
      }

      await adapter.saveMessage('task-123', message1)
      await adapter.saveMessage('task-123', message2)

      const messages = await adapter.getMessages('task-123')
      expect(messages).toEqual([message1, message2])
    })

    it('should return empty array for task with no messages', async () => {
      const messages = await adapter.getMessages('no-messages')
      expect(messages).toEqual([])
    })
  })

  describe('Artifact operations', () => {
    it('should save and retrieve artifacts', async () => {
      const artifact: Artifact & { taskId: string } = {
        artifactId: 'art-123',
        taskId: 'task-123',
        name: 'test.txt',
        description: 'Test file',
        parts: [{ kind: 'data', data: { content: 'Hello' } }],
        metadata: {}
      }

      await adapter.updateArtifact(artifact)
      
      const retrieved = await adapter.getArtifact('art-123')
      const { taskId: _, ...expectedArtifact } = artifact
      expect(retrieved).toEqual(expectedArtifact)
    })

    it('should add artifact to task when task exists', async () => {
      const task: Task = {
        contextId: 'test-context',
        id: 'task-with-artifacts',
        kind: 'task',
        status: { state: 'working' },
        metadata: {}
      }

      await adapter.saveTask(task)

      const artifact: Artifact & { taskId: string } = {
        artifactId: 'art-456',
        taskId: 'task-with-artifacts',
        name: 'result.json',
        parts: [{ kind: 'data', data: { result: 'success' } }],
        metadata: {}
      }

      await adapter.updateArtifact(artifact)

      const updatedTask = await adapter.getTask('task-with-artifacts')
      expect(updatedTask?.artifacts).toHaveLength(1)
      expect(updatedTask?.artifacts?.[0].artifactId).toBe('art-456')
    })

    it('should get all artifacts for a task', async () => {
      const artifacts: (Artifact & { taskId: string })[] = [
        {
          artifactId: 'art-1',
          taskId: 'task-789',
          name: 'file1.txt',
          parts: [],
          metadata: {}
        },
        {
          artifactId: 'art-2',
          taskId: 'task-789',
          name: 'file2.txt',
          parts: [],
          metadata: {}
        },
        {
          artifactId: 'art-3',
          taskId: 'other-task',
          name: 'file3.txt',
          parts: [],
          metadata: {}
        }
      ]

      for (const artifact of artifacts) {
        await adapter.updateArtifact(artifact)
      }

      const taskArtifacts = await adapter.getTaskArtifacts('task-789')
      expect(taskArtifacts).toHaveLength(2)
      expect(taskArtifacts.map(a => a.artifactId)).toEqual(['art-1', 'art-2'])
    })
  })

  describe('Composite operations', () => {
    it('should get task with full history', async () => {
      // Create task
      const task: Task = {
        contextId: 'test-context',
        id: 'task-full',
        kind: 'task',
        status: { state: 'working' },
        metadata: {}
      }
      await adapter.saveTask(task)

      // Add messages
      const message: Message = {
        kind: 'message',
        messageId: 'msg-full',
        role: 'user',
        parts: [{ kind: 'text', text: 'Test message' }],
        metadata: {}
      }
      await adapter.saveMessage('task-full', message)

      // Add artifact
      const artifact: Artifact & { taskId: string } = {
        artifactId: 'art-full',
        taskId: 'task-full',
        name: 'result.txt',
        parts: [],
        metadata: {}
      }
      await adapter.updateArtifact(artifact)

      // Get task with history
      const result = await adapter.getTaskWithHistory('task-full')

      expect(result).toBeTruthy()
      expect(result?.task.id).toBe('task-full')
      expect(result?.messages).toHaveLength(1)
      expect(result?.artifacts).toHaveLength(1)
    })

    it('should return null for non-existent task with history', async () => {
      const result = await adapter.getTaskWithHistory('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('Utility methods', () => {
    it('should clear all data', () => {
      // Add some data
      adapter.saveTask({
        contextId: 'test',
        id: 'task-clear',
        kind: 'task',
        status: { state: 'submitted' },
        metadata: {}
      })

      adapter.clear()
      const stats = adapter.getStats()

      expect(stats.tasksCount).toBe(0)
      expect(stats.messagesCount).toBe(0)
      expect(stats.artifactsCount).toBe(0)
    })

    it('should get correct stats', async () => {
      // Add data
      await adapter.saveTask({
        contextId: 'test',
        id: 'task-stats',
        kind: 'task',
        status: { state: 'submitted' },
        metadata: {}
      })

      await adapter.saveMessage('task-stats', {
        kind: 'message',
        messageId: 'msg-stats-1',
        role: 'user',
        parts: [],
        metadata: {}
      })

      await adapter.saveMessage('task-stats', {
        kind: 'message',
        messageId: 'msg-stats-2',
        role: 'agent',
        parts: [],
        metadata: {}
      })

      const stats = adapter.getStats()
      expect(stats.tasksCount).toBe(1)
      expect(stats.messagesCount).toBe(2)
      expect(stats.artifactsCount).toBe(0)
    })

    it('should export all data', async () => {
      // Add data
      const task: Task = {
        contextId: 'test',
        id: 'task-export',
        kind: 'task',
        status: { state: 'submitted' },
        metadata: {}
      }
      await adapter.saveTask(task)

      const data = adapter.exportData()
      expect(data.tasks).toHaveLength(1)
      expect(data.tasks[0]).toEqual(task)
    })
  })
})

describe('memoryAdapter factory', () => {
  it('should create a StorageAdapter instance', () => {
    const adapter = memoryAdapter()
    expect(adapter).toBeDefined()
    expect(adapter.saveTask).toBeDefined()
    expect(adapter.getTask).toBeDefined()
  })
})