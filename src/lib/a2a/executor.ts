/**
 * Executor definition helper
 */

import type { Executor } from './types'

/**
 * Define an executor with type-safe input and output
 */
export function defineExecutor<TInput = unknown, TOutput = unknown>(
  executor: Executor<TInput, TOutput>
): Executor<TInput, TOutput> {
  return {
    extension: executor.extension,
    input: executor.input,
    output: executor.output,
    execute: executor.execute
  }
}