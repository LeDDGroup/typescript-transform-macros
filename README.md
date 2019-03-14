<!--@[h1([pkg.name]), paragraph([pkg.description])]-->
# typescript-transform-macros

Typescript Transform Macros
<!--/@-->

<!--@shields("npm", "prettier", "ConventionalCommits", "spacemacs")-->
[![npm version](https://img.shields.io/npm/v/typescript-transform-macros.svg)](https://www.npmjs.com/package/typescript-transform-macros) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier) [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org) [![Built with Spacemacs](https://raw.githubusercontent.com/syl20bnr/spacemacs/master/assets/spacemacs-badge.svg?sanitize=true)](http://spacemacs.org)
<!--/@-->

Examples from <https://github.com/codemix/babel-plugin-macros>.

<!--@installation()-->
## Installation

```sh
npm install --save-dev typescript-transform-macros
```
<!--/@-->

## Usage with [ttypescript](https://github.com/cevek/ttypescript/)

Add it to _plugins_ in your _tsconfig.json_

```json
{
  "compilerOptions": {
    "plugins": [{ "transform": "typescript-transform-macros" }]
  }
}
```

Also declare globally the _MACRO_ function:

```ts
declare function MACRO<T>(t: T): T;
```

## Example

_Input:_

<!--@snippet("./src/__fixtures/input.ts")-->
```ts
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
```
<!--/@-->

_Output:_

<!--@snippet("./src/__fixtures/expected.js")-->
```js
function demo() {
    const __input4 = [1, 2, 3, 4];
    const __length4 = __input4.length;
    const __result4 = new Array(__length4);
    for (let __i4 = 0; __i4 < __length4; __i4++) {
        __result4[__i4] =
            __input4[__i4]
                + 1;
    }
    const __input2 = __result4;
    const __length2 = __input2.length;
    const __result2 = [];
    for (let __i2 = 0; __i2 < __length2; __i2++) {
        if (__input2[__i2]
            % 2 === 0)
            __result2.push(__input2[__i2]);
    }
    return __result2;
}
```
<!--/@-->
