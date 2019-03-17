import * as ts from "typescript";
import { resolve } from "path";
import transformer from "./";
import { readFileSync } from "fs";

describe("transformer", () => {
  it("should compile", () => {
    const inputFile = resolve(__dirname, "__fixtures/input.ts");
    const result = compileCode(readFileSync(inputFile).toString());
    expect(result).toMatchSnapshot();
  });
});

// function compile(file: string): string {
//   let content = "";
//   const program = ts.createProgram([file], {
//     target: ts.ScriptTarget.ESNext,
//     module: ts.ModuleKind.CommonJS
//   });
//   program.emit(
//     undefined,
//     (_, result) => (content = result),
//     undefined,
//     undefined,
//     {
//       after: [transformer(program)]
//     }
//   );
//   return content;
// }

function compileCode(source: string): string {
  let result = ts.transpileModule(source, {
    transformers: {
      before: [transformer()]
    },
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.CommonJS
    }
  });

  return result.outputText;
}
