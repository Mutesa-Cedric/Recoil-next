/**
 * invariant() utility – throws if the condition is false.
 */

export default function invariant(condition: unknown, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
} 