import { resolvePath } from "../core/index.js";
import { CompilerOptions } from "../core/options.js";
import { StandardTestLibrary } from "./test-host.js";
import { BasicTestRunner, CadlTestLibrary, CadlTestLibraryInit, TestHost } from "./types.js";

/**
 * Define a test library defaulting to the most common library structure.
 * @param init Library configuration.
 * @returns Cadl Test library.
 */
export function createTestLibrary(init: CadlTestLibraryInit): CadlTestLibrary {
  const { name } = init;
  const cadlFileFolder = init.cadlFileFolder ?? "lib";
  const jsFileFolder = init.jsFileFolder ?? "dist";
  return {
    name,
    packageRoot: init.packageRoot,
    files: [
      { realDir: "", pattern: "package.json", virtualPath: `./node_modules/${name}` },
      {
        realDir: cadlFileFolder,
        pattern: "*.cadl",
        virtualPath: resolvePath(`./node_modules/${name}`, cadlFileFolder),
      },
      {
        realDir: jsFileFolder,
        pattern: "**/*.js",
        virtualPath: resolvePath(`./node_modules/${name}`, jsFileFolder),
      },
    ],
  };
}

export interface TestWrapperOptions {
  wrapper?: (code: string) => string;

  /**
   * List of imports to include automatically.
   */
  autoImports?: string[];

  /**
   * List of usings to include automatically.
   */
  autoUsings?: string[];

  compilerOptions?: CompilerOptions;
}
export function createTestWrapper(
  host: TestHost,
  testWrapperOptions: TestWrapperOptions = {}
): BasicTestRunner {
  const {
    autoImports,
    autoUsings,
    wrapper,
    compilerOptions: defaultCompilerOptions,
  } = testWrapperOptions;
  const autoCode = [
    ...(
      autoImports ?? host.libraries.filter((x) => x !== StandardTestLibrary).map((x) => x.name)
    ).map((x) => `import "${x}";`),
    ...(autoUsings ?? []).map((x) => `using ${x};`),
  ].join("\n");

  const wrap = (code: string) => {
    return `${autoCode}${wrapper ? wrapper(code) : code}`;
  };
  return {
    get program() {
      return host.program;
    },

    fs: host.fs,
    autoCodeOffset: autoCode.length,

    compile: (code: string, options?: CompilerOptions) => {
      host.addCadlFile("./main.cadl", wrap(code));
      return host.compile("./main.cadl", { ...defaultCompilerOptions, ...options });
    },
    diagnose: (code: string, options?: CompilerOptions) => {
      host.addCadlFile("./main.cadl", wrap(code));
      return host.diagnose("./main.cadl", { ...defaultCompilerOptions, ...options });
    },
    compileAndDiagnose: (code: string, options?: CompilerOptions) => {
      host.addCadlFile("./main.cadl", wrap(code));
      return host.compileAndDiagnose("./main.cadl", { ...defaultCompilerOptions, ...options });
    },
  };
}
