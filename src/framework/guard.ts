import { parse } from "@babel/parser";
import type { Plugin } from "vite";

const FORBIDDEN_DIRECTIVE = "use server";

// Parse the original source before the RSC plugin can transform directives.
// Covers module and function directive prologues, including dependencies.
export function assertNoServerFunctions(code: string, id: string) {
  const ast = parse(code, {
    sourceType: "unambiguous",
    plugins: ["jsx", "typescript", "decorators-legacy"],
  });

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    const value = node as Record<string, unknown>;
    if (
      value.type === "Directive" &&
      (value.value as { value?: string })?.value === FORBIDDEN_DIRECTIVE
    ) {
      throw new Error(
        `[reference-rsc] Server Functions are disabled: ${id}. Use an explicit HTTP API.`,
      );
    }

    Object.values(value).forEach(visit);
  };

  visit(ast.program);
}

export function forbidServerFunctions(): Plugin {
  return {
    name: "reference-rsc:no-server-functions",
    enforce: "pre",
    transform(code, id) {
      if (/\.[cm]?[jt]sx?(?:\?|$)/.test(id)) assertNoServerFunctions(code, id);
    },
  };
}
