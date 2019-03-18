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

<!--@snippet("./examples/ttypescript/index.ts")-->

```ts
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
```

<!--/@-->

_Output:_

<!--@example("./examples/ttypescript/index.js")-->

```js
"use strict";
const input_1 = [1, 2, 3];
const length_1 = input_1.length;
const result_1 = new Array(length_1);
for (let i_1 = 0; i_1 < length_1; i_1++) {
  result_1[i_1] = 3 * input_1[i_1] + 1;
}
console.log(result_1);
//> [ 4, 7, 10 ]
```

<!--/@-->
