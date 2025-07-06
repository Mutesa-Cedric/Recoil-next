/**
 * recoverableViolation – similar to Facebook's recoverableViolation
 * Logs an error in DEV but does not throw.
 */

export default function recoverableViolation(message: string, _projectName: 'recoil', opts: { error?: Error } = {}): null {
    // @ts-ignore __DEV__ may be injected by bundler
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
        // eslint-disable-next-line no-console
        console.error(message, opts.error);
    }
    return null;
} 