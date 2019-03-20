import * as ts from "typescript";
import { resolve } from "path";
import transformer from "./";
import { readFileSync } from "fs";

describe("transformer", () => {
  it("should compile", () => {
    const inputFile = resolve(__dirname, "__fixtures/input.ts");
    const result = transform(readFileSync(inputFile).toString());
    expect(result).toMatchSnapshot();
  });
});

function transform(sourceText: string) {
  const source = ts.createSourceFile(
    "temp.ts",
    sourceText,
    ts.ScriptTarget.ESNext
  );
  const result = ts.transform<ts.SourceFile>(source, [transformer()], {});
  const printer = ts.createPrinter();
  return printer.printNode(
    ts.EmitHint.Unspecified,
    result.transformed[0],
    ts.createSourceFile("result.ts", "", ts.ScriptTarget.ESNext)
  );
}
