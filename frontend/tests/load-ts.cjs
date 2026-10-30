// Small test-only TS loader; production compilation remains Next.js/TypeScript.
const ts = require("typescript");
const fs = require("node:fs");
require.extensions[".ts"] = (mod, filename) => {
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
};
