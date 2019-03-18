import * as ts from "typescript";

class Transformer {
  counter = 0;
  rootMacros: Record<string, ts.Expression> = {};
  constructor(public context: ts.TransformationContext) {}
  transform(node: ts.Node): ts.Node {
    const postExtract = ts.visitNode(node, this.extractMacros);
    return ts.visitNode(postExtract, this.resolveMacros);
  }
  // Removes macro definition from code and save them for later
  private extractMacros = (node: ts.Node): ts.Node | undefined => {
    if (ts.isVariableStatement(node)) {
      const firstDeclaration = node.declarationList.declarations[0]; // TODO maybe check for more
      if (
        firstDeclaration.initializer &&
        ts.isCallExpression(firstDeclaration.initializer) &&
        ts.isIdentifier(firstDeclaration.initializer.expression) &&
        firstDeclaration.initializer.expression.text === "MACRO"
      ) {
        const name = firstDeclaration.name;
        if (!ts.isIdentifier(name)) {
          throw new Error(
            "Expected name to be Identifier for macro declaration"
          );
        }
        const value = firstDeclaration.initializer.arguments[0];
        this.rootMacros[name.text] = value;
        return undefined;
      }
    }
    return ts.visitEachChild(node, this.extractMacros, this.context);
  };
  // Search for macros calls and replace them with the macros
  private resolveMacros = (node: ts.Node): ts.Node | undefined => {
    if (ts.isBlock(node) || ts.isSourceFile(node)) {
      const newBlock = this.replaceMacros(node, this.rootMacros);
      if (ts.isBlock(node)) {
        return ts.visitEachChild(
          ts.updateBlock(node, newBlock),
          this.resolveMacros,
          this.context
        );
      } else {
        return ts.visitEachChild(
          ts.updateSourceFileNode(node, newBlock),
          this.resolveMacros,
          this.context
        );
      }
    }
    return ts.visitEachChild(node, this.resolveMacros, this.context);
  };
  // Prefix macros variables to avoid name collision, returns "return" expression
  private fixMacros = (
    node: ts.Block
  ): [ts.Expression | undefined, ts.Block] => {
    const visit = (node: ts.Node): ts.Node | undefined => {
      if (ts.isReturnStatement(node)) {
        if (!node.expression) throw new Error("Expected macro to return value");
        result = ts.visitNode(node.expression, visit);
        return undefined;
      }
      if (ts.isPropertyAccessExpression(node)) {
        return ts.createPropertyAccess(
          ts.visitNode(node.expression, visit),
          node.name
        );
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        variableMap[node.name.text] = ts.createUniqueName(node.name.text);
      }
      if (ts.isIdentifier(node) && variableMap[node.text]) {
        return variableMap[node.text];
      }
      return ts.visitEachChild(node, visit, this.context);
    };
    const variableMap: Record<string, ts.Identifier> = {};
    let result: ts.Expression | undefined = undefined;
    const resultNode = ts.visitNode(node, visit);
    return [result, resultNode];
  };
  // Actually replace the macros in the code
  private replaceMacros = (
    block: ts.BlockLike,
    macros: Record<string, ts.Expression>
  ): ts.Statement[] => {
    const visit = (child: ts.Node): ts.Node => {
      if (ts.isBlock(child)) {
        return ts.createBlock(this.replaceMacros(child, macros));
      }
      if (
        ts.isIdentifier(child) &&
        (macros as Object).hasOwnProperty(child.text)
      ) {
        return macros[child.text];
      }
      if (
        ts.isCallExpression(child) &&
        ts.isIdentifier(child.expression) &&
        (macros as Object).hasOwnProperty(child.expression.text)
      ) {
        const value = macros[child.expression.text];
        if (!ts.isArrowFunction(value)) {
          throw new Error("Expected function expression for macro value");
        }
        const newMacros = { ...macros };
        for (
          let i = 0;
          i < child.arguments.length && i < value.parameters.length;
          i++
        ) {
          const argName = value.parameters[i].name;
          if (!ts.isIdentifier(argName)) {
            throw new Error("Expected identifier in macro function definition");
          }
          const argValue = child.arguments[i];
          newMacros[argName.text] = argValue;
        }

        const block = ts.isBlock(value.body)
          ? value.body
          : ts.createBlock([ts.createReturn(value.body)]);
        this.counter++;
        const [resultName, resultBlock] = this.fixMacros(
          ts.visitNode(
            ts.createBlock(this.replaceMacros(block, newMacros)),
            visit
          )
        );
        result = result.concat(resultBlock.statements);
        if (!resultName) {
          throw new Error("Macro should return value");
        }
        return resultName;
      }
      if (
        ts.isCallExpression(child) &&
        ts.isPropertyAccessExpression(child.expression) &&
        (macros as Object).hasOwnProperty(child.expression.name.text)
      ) {
        return ts.visitNode(
          ts.updateCall(child, child.expression.name, child.typeArguments, [
            child.expression.expression,
            ...child.arguments
          ]),
          visit
        );
      }
      return ts.visitEachChild(child, visit, this.context);
    };
    let result: ts.Statement[] = [];
    for (const statement of block.statements) {
      const newStatement = ts.visitNode(statement, visit);
      result.push(newStatement);
    }
    return result;
  };
}

const transformer = (
  _program?: ts.Program
): ts.TransformerFactory<any> => context => node =>
  new Transformer(context).transform(node);

export default transformer;
