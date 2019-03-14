import * as ts from "typescript";
import { readFileSync } from "fs";
import { resolve } from "path";
import transformer from "./";

describe("transformer", () => {
  it("should compile", () => {
    const inputFile = resolve(__dirname, "__fixtures/input.ts");
    const expectedFile = resolve(__dirname, "__fixtures/expected.js");
    const result = compile(inputFile);
    const expected = readFileSync(expectedFile).toString();
    expect(result).toBe(expected);
  });
});

function compile(file: string): string {
  let content = "";
  const program = ts.createProgram([file], {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS
  });
  program.emit(
    undefined,
    (_, result) => (content = result),
    undefined,
    undefined,
    {
      after: [transformer(program)]
    }
  );
  return content;
}
