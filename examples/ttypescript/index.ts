declare function MACRO<T>(t: T): T;

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

declare interface Array<T> {
  MAP: Array<T>["map"];
}

console.log([1, 2, 3].MAP(n => 3 * n + 1));
