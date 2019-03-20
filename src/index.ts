import * as ts from "typescript";

class Transformer {
  rootMacros = new Map<string, ts.Expression>();
  constructor(public context: ts.TransformationContext) {}
  transform(node: ts.Node): ts.Node {
    return ts.visitNode(
      ts.visitNode(node, this.extractMacros),
      this.resolveMacros
    );
  }
  extractMacros = (node: ts.Node): ts.Node | undefined => {
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
        this.rootMacros.set(name.text, value);
        return undefined;
      }
    }
    return ts.visitEachChild(node, this.extractMacros, this.context);
  };
  resolveMacros = (node: ts.Node): ts.Node | undefined => {
    if (ts.isBlock(node) || ts.isSourceFile(node)) {
      const newBlock = this.replaceMacros(node.statements, this.rootMacros);
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
  cleanMacro = <T extends ts.Node>(node: T): [ts.Expression | undefined, T] => {
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
        variableMap.set(node.name.text, ts.createUniqueName(node.name.text));
      }
      if (ts.isIdentifier(node) && variableMap.has(node.text)) {
        return variableMap.get(node.text)!;
      }
      return ts.visitEachChild(node, visit, this.context);
    };
    const variableMap = new Map<string, ts.Identifier>();
    let result: ts.Expression | undefined = undefined;
    const resultNode = ts.visitNode(node, visit);
    return [result, resultNode];
  };
  replaceMacros = (
    statements: ts.NodeArray<ts.Statement>,
    macros: Map<string, ts.Expression>
  ): ts.Statement[] => {
    const visit = (node: ts.Node): ts.Node | undefined => {
      if (
        [
          ts.SyntaxKind.InterfaceDeclaration,
          ts.SyntaxKind.PropertySignature
        ].includes(node.kind)
      ) {
        return node;
      }
      if (ts.isBlock(node)) {
        return ts.createBlock(this.replaceMacros(node.statements, macros));
      }
      if (ts.isIdentifier(node) && macros.has(node.text)) {
        return macros.get(node.text)!;
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        macros.has(node.expression.name.text)
      ) {
        return ts.visitNode(
          ts.updateCall(node, node.expression.name, node.typeArguments, [
            node.expression.expression,
            ...node.arguments
          ]),
          visit
        );
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        macros.has(node.expression.text)
      ) {
        const value = macros.get(node.expression.text)!;
        if (!ts.isArrowFunction(value) && !ts.isFunctionExpression(value)) {
          throw new Error("Expected function expression for macro value");
        }
        const newMacros = new Map([
          ...macros.entries(),
          ...getNameValueMap(node.arguments, value.parameters).entries()
        ]);
        const [resultName, resultBlock] = this.cleanMacro(
          ts.visitNode(
            ts.createBlock(this.replaceMacros(getStatements(value), newMacros)),
            visit
          )
        );
        result = result.concat(resultBlock.statements);
        return resultName;
      }
      return ts.visitEachChild(node, visit, this.context);
    };
    let result: ts.Statement[] = [];
    for (const statement of statements) {
      const newStatement = ts.visitNode(statement, visit);
      result.push(newStatement);
    }
    return result;
  };
}

const transformer = (
  _program?: ts.Program
): ts.TransformerFactory<any> => context => {
  return node => {
    return new Transformer(context).transform(node);
  };
};

function getStatements(
  node: ts.FunctionExpression | ts.ArrowFunction
): ts.NodeArray<ts.Statement> {
  if (ts.isBlock(node.body)) {
    return node.body.statements;
  }
  return ts.createNodeArray([ts.createReturn(node.body)]);
}

function getNameValueMap(
  values: ts.NodeArray<ts.Expression>,
  args: ts.NodeArray<ts.ParameterDeclaration>
) {
  const map = new Map<string, ts.Expression>();
  for (let i = 0; i < values.length && i < args.length; i++) {
    const argName = args[i].name;
    if (!ts.isIdentifier(argName)) {
      throw new Error("Expected identifier in macro function definition");
    }
    const argValue = values[i];
    map.set(argName.text, argValue);
  }
  return map;
}

export default transformer;
