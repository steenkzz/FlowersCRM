import * as Babel from "@babel/standalone";
import * as React from "react";

export interface CompileResult {
  component: React.ComponentType | null;
  error: string | null;
}

/** Transpiles AI-generated JSX (expected to define a function named
 * "AddonPreview", no imports/exports) and returns it as a callable React
 * component. Never throws — compile/runtime errors are captured and
 * surfaced instead, so a bad generation can't crash the host app. */
export function compileAddonComponent(code: string): CompileResult {
  try {
    const transpiled = Babel.transform(code, {
      presets: ["react"],
      filename: "addon-preview.jsx",
    }).code;

    if (!transpiled) {
      return { component: null, error: "Transpilation produced no output." };
    }

    // Intentional: sandboxed execution of AI-generated preview code (see
    // components/autopilot/BuildPreviewModal.tsx for the containment story).
    const factory = new Function(
      "React",
      `${transpiled}\nif (typeof AddonPreview === "undefined") { throw new Error("Generated code did not define AddonPreview"); }\nreturn AddonPreview;`,
    );

    const component = factory(React) as React.ComponentType;
    if (typeof component !== "function") {
      return { component: null, error: "AddonPreview did not resolve to a function." };
    }

    return { component, error: null };
  } catch (err) {
    return {
      component: null,
      error: err instanceof Error ? err.message : "Unknown compile error",
    };
  }
}
