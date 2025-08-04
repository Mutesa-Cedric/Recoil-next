/*
 * TypeScript port of Recoil_SnapshotCache.js
 */

let _invalidateMemoizedSnapshot: (() => void) | null = null;

export function setInvalidateMemoizedSnapshot(invalidate: () => void): void {
    _invalidateMemoizedSnapshot = invalidate;
}

export function invalidateMemoizedSnapshot(): void {
    _invalidateMemoizedSnapshot?.();
} 