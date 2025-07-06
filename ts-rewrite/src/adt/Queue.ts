/**
 * Simple execution queue placeholder – immediate execution.
 */

export function enqueueExecution(_tag: string, fn: () => unknown): void {
    fn();
} 