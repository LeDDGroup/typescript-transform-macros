import * as ts from "typescript";

interface Macro {
  name: ts.Identifier;
  value: ts.Expression;
}

function transformer<T extends ts.Node>(_program: ts.Program) {
  let counter = 0;
  return (context: ts.TransformationContext) => {
    const macros: Macro[] = [];
    return (node: T) => {
      const postExtractNode = ts.visitNode(node, extractMacros);
      return ts.visitNode(postExtractNode, resolveMacros);
    };
    function extractMacros(node: ts.Node): ts.Node | undefined {
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
          macros.push({ name, value });
          return undefined;
        }
      }
      return ts.visitEachChild(node, extractMacros, context);
    }
    function resolveMacros(node: ts.Node): ts.Node | undefined {
      if (ts.isBlock(node)) {
        return ts.visitEachChild(
          ts.updateBlock(node, replaceMacros(node, macros, context)),
          resolveMacros,
          context
        );
      }
      if (ts.isSourceFile(node)) {
        return ts.visitEachChild(
          ts.updateSourceFileNode(node, replaceMacros(node, macros, context)),
          resolveMacros,
          context
        );
      }
      return ts.visitEachChild(node, resolveMacros, context);
    }
  };
  function fixMacros(
    node: ts.Block,
    context: ts.TransformationContext
  ): [ts.Expression | undefined, ts.Block] {
    const variableMap: Record<string, boolean> = {};
    let result: ts.Expression | undefined = undefined;
    const resultNode = ts.visitNode(node, visit);
    return [result, resultNode];
    function visit(node: ts.Node): ts.Node | undefined {
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
        variableMap[node.name.text] = true;
      }
      if (ts.isIdentifier(node) && variableMap[node.text]) {
        return ts.createIdentifier(newName(node.text));
      }
      return ts.visitEachChild(node, visit, context);
      function newName(name: string) {
        return "__" + name.toString().toLocaleLowerCase() + counter.toString();
      }
    }
  }
  function replaceMacros(
    block: ts.BlockLike,
    macros: Macro[],
    context: ts.TransformationContext
  ): ts.Statement[] {
    let result: ts.Statement[] = [];
    for (const statement of block.statements) {
      const newStatement = ts.visitNode(statement, visit);
      result.push(newStatement);
    }
    return result;
    function visit(child: ts.Node): ts.Node {
      // TODO check if visit enought children
      if (ts.isBlock(child)) {
        return ts.createBlock(replaceMacros(child, macros, context));
      }
      const identifier = getIdentifier(child);
      if (identifier) {
        for (const { name, value } of macros) {
          if (identifier.text === name.text) {
            if (ts.isIdentifier(child)) {
              return value;
            }
            if (ts.isCallExpression(child)) {
              if (!ts.isArrowFunction(value)) {
                throw new Error("Expected function expression for macro value");
              }
              const newMacros = macros.slice();
              for (
                let i = 0;
                i < child.arguments.length && i < value.parameters.length;
                i++
              ) {
                const name = value.parameters[i].name;
                if (!ts.isIdentifier(name)) {
                  throw new Error(
                    "Expected identifier in macro function definition"
                  );
                }
                const arg = child.arguments[i];
                newMacros.push({ name, value: arg });
              }

              const block = ts.isBlock(value.body)
                ? value.body
                : ts.createBlock([ts.createReturn(value.body)]);
              counter++;
              const [resultName, resultBlock] = fixMacros(
                ts.createBlock(replaceMacros(block, newMacros, context)),
                context
              );
              result = result.concat(resultBlock.statements);
              if (!resultName) {
                throw new Error("Macro should return value");
              }
              return resultName;
            }
            throw new Error("Expected macro as call expression or identifier");
          }
        }
      }
      return ts.visitEachChild(child, visit, context);
    }
  }
}

function getIdentifier(node: ts.Node): ts.Identifier | undefined {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression))
    return node.expression;
  if (ts.isIdentifier(node)) return node;
  return undefined;
}

export default transformer;
