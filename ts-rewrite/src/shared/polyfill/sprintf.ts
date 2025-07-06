/**
 * Very small `sprintf` implementation used in OSS Recoil.
 * Replaces each `%s` in the format string with the next argument.
 */

function sprintf(format: string, ...args: unknown[]): string {
    let index = 0;
    return format.replace(/%s/g, () => String(args[index++]));
}

export default sprintf; 