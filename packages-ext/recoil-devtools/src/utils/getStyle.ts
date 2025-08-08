// TypeScript port of getStyle.js

type CssMap = {
  [key: string]: string | number;
};

function getEntries<T>(obj: {[key: string]: T}): Array<[string, T]> {
  const keys: string[] = Object.keys(obj);
  return keys.map(key => [key, obj[key]]);
}

export const getStyle = (
  source: {[key: string]: CssMap},
  entries: {[key: string]: boolean},
): CssMap => {
  const classNameMap = getEntries<boolean>(entries);
  return classNameMap.reduce<CssMap>((acc, [key, val]) => {
    let nextAcc = {...acc};
    if (Boolean(val)) {
      nextAcc = {...nextAcc, ...source[key]};
    }

    return nextAcc;
  }, {});
};
