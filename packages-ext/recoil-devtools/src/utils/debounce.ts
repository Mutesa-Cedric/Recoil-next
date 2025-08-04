// TypeScript port of debounce.js

type DebouncedFunc = (...args: Array<any>) => void;

export default function debounce(
  func: DebouncedFunc,
  wait: number,
  immediate?: boolean,
): DebouncedFunc {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Array<any>): void {
    const context = this;
    const later = function () {
      timeout = null;
      if (!Boolean(immediate)) func.apply(context, args);
    };
    const callNow = Boolean(immediate) && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
