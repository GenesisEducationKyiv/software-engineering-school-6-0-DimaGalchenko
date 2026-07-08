// Architectural fitness tests: enforce the layered dependency rules of the
// main application by statically scanning require() edges. No runtime, no
// extra tooling — just the dependency graph.
//
// Layers (low → high). A layer may only depend on layers at or below it:
//
//   shared            foundation (errors, logger, tokens, cache) — imports nothing internal
//   config, db        configuration + database plumbing
//   clients           outbound adapters (notification transport)
//   modules/*         domain modules (isolated from each other)
//   middleware        express adapters
//   app               HTTP composition (app.js)
//   root              composition root / entrypoint (index.js)

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "..");

// Directories/files that make up the main application (excludes the separate
// services, tests, tooling, generated and vendored code).
const SCAN_ROOTS = [
  "app.js",
  "index.js",
  "config",
  "db",
  "shared",
  "middleware",
  "modules",
  "clients",
];

const listJsFiles = (relRoot) => {
  const abs = path.join(ROOT, relRoot);
  if (!fs.existsSync(abs)) {
    return [];
  }
  if (fs.statSync(abs).isFile()) {
    return abs.endsWith(".js") ? [abs] : [];
  }
  return fs
    .readdirSync(abs)
    .flatMap((entry) => listJsFiles(path.join(relRoot, entry)));
};

const sourceFiles = SCAN_ROOTS.flatMap(listJsFiles);

// Map a repo-relative path to its architectural layer.
const layerOf = (relPath) => {
  const p = relPath.replace(/\\/g, "/");
  if (p === "index.js") {
    return "root";
  }
  if (p === "app.js") {
    return "app";
  }
  if (p.startsWith("shared/")) {
    return "shared";
  }
  if (p.startsWith("config/")) {
    return "config";
  }
  if (p.startsWith("db/")) {
    return "db";
  }
  if (p.startsWith("middleware/")) {
    return "middleware";
  }
  if (p.startsWith("clients/")) {
    return "clients";
  }
  if (p === "modules/subscription" || p.startsWith("modules/subscription/")) {
    return "module:subscription";
  }
  if (p === "modules/release" || p.startsWith("modules/release/")) {
    return "module:release";
  }
  return "external";
};

// Which layers each layer is allowed to depend on (besides itself and
// node_modules). Lower/foundation layers list fewer allowed targets.
const ALLOWED = {
  shared: [],
  config: [],
  db: [],
  clients: ["shared"],
  middleware: ["shared"],
  "module:subscription": ["shared"],
  "module:release": ["shared"],
  app: [
    "shared",
    "config",
    "db",
    "clients",
    "middleware",
    "module:subscription",
    "module:release",
  ],
  root: [
    "shared",
    "config",
    "db",
    "clients",
    "middleware",
    "module:subscription",
    "module:release",
    "app",
  ],
};

const requiresOf = (absFile) => {
  const src = fs.readFileSync(absFile, "utf-8");
  const edges = [];
  const re = /require\(\s*["'](\.[^"']+)["']\s*\)/g;
  let match;
  while ((match = re.exec(src)) !== null) {
    const resolved = path.relative(
      ROOT,
      path.resolve(path.dirname(absFile), match[1]),
    );
    edges.push(resolved);
  }
  return edges;
};

describe("architecture: layer dependencies", () => {
  it("discovers the main-app source files", () => {
    expect(sourceFiles.length).toBeGreaterThan(10);
  });

  it("every internal require respects the allowed layer direction", () => {
    const violations = [];

    for (const absFile of sourceFiles) {
      const fromRel = path.relative(ROOT, absFile);
      const fromLayer = layerOf(fromRel);

      for (const targetRel of requiresOf(absFile)) {
        const toLayer = layerOf(targetRel);
        if (toLayer === "external" || toLayer === fromLayer) {
          continue; // node_modules / same-layer imports are always fine
        }
        const allowed = ALLOWED[fromLayer] || [];
        if (!allowed.includes(toLayer)) {
          violations.push(
            `${fromRel} (${fromLayer}) → ${targetRel} (${toLayer})`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("domain modules do not import each other", () => {
    const crossModule = [];
    for (const absFile of sourceFiles) {
      const fromRel = path.relative(ROOT, absFile);
      const fromLayer = layerOf(fromRel);
      if (!fromLayer.startsWith("module:")) {
        continue;
      }
      for (const targetRel of requiresOf(absFile)) {
        const toLayer = layerOf(targetRel);
        if (toLayer.startsWith("module:") && toLayer !== fromLayer) {
          crossModule.push(`${fromRel} → ${targetRel}`);
        }
      }
    }
    expect(crossModule).toEqual([]);
  });

  it("shared is a foundation layer (imports nothing internal)", () => {
    const leaks = [];
    for (const absFile of sourceFiles) {
      const fromRel = path.relative(ROOT, absFile);
      if (layerOf(fromRel) !== "shared") {
        continue;
      }
      for (const targetRel of requiresOf(absFile)) {
        if (layerOf(targetRel) !== "external") {
          leaks.push(`${fromRel} → ${targetRel}`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });
});

describe("architecture: intra-module layering", () => {
  // Within a module the direction is repository → service → routes/controllers.
  // Lower layers must not import upward.
  const isRepository = (p) => /Repository\.js$/.test(p);
  const isService = (p) => /Service\.js$/.test(p);
  const isRoutesOrController = (p) => /(routes|controller)\.js$/i.test(p);

  it("repositories do not import services or routes", () => {
    const violations = [];
    for (const absFile of sourceFiles) {
      const fromRel = path.relative(ROOT, absFile);
      if (!isRepository(fromRel)) {
        continue;
      }
      for (const targetRel of requiresOf(absFile)) {
        if (isService(targetRel) || isRoutesOrController(targetRel)) {
          violations.push(`${fromRel} → ${targetRel}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("services do not import routes/controllers", () => {
    const violations = [];
    for (const absFile of sourceFiles) {
      const fromRel = path.relative(ROOT, absFile);
      if (!isService(fromRel)) {
        continue;
      }
      for (const targetRel of requiresOf(absFile)) {
        if (isRoutesOrController(targetRel)) {
          violations.push(`${fromRel} → ${targetRel}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
