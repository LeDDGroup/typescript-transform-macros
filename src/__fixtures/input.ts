declare function MACRO<T>(t: T): T;

const FILTER = MACRO(
  <T>(
    inputConst: T[],
    visitor: (value: T, index?: number, input?: T[]) => boolean
  ) => {
    const input = inputConst;
    const length = input.length;
    const result = [];
    for (let i = 0; i < length; i++) {
      if (visitor(input[i], i, input)) result.push(input[i]);
    }
    return result;
  }
);

const MAP = MACRO(
  <T, L>(
    inputConst: T[],
    visitor: (value: T, index?: number, input?: T[]) => L
  ) => {
    const input = inputConst;
    const length = input.length;
    const result = new Array(length) as L[];
    for (let i = 0; i < length; i++) {
      result[i] = visitor(input[i], i, input);
    }
    return result;
  }
);

function demo() {
  return FILTER(MAP([1, 2, 3, 4], item => item + 1), v => v % 2 === 0);
}
