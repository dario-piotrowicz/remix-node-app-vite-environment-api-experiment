/* eslint-disable @typescript-eslint/no-explicit-any */

import { DevEnvironment, type ResolvedConfig } from "vite";

import { runInContext, createContext } from "node:vm";

export function viteEnvironmentPluginNode() {
  return {
    name: "vite-environment-plugin-node",

    async config() {
      return {
        environments: {
          node: {
            dev: {
              createEnvironment(
                name: string,
                config: ResolvedConfig
              ): Promise<DevEnvironment> {
                return createNodeVmDevEnvironment(name, config);
              },
            },
          },
        },
      };
    },
  };
}

async function createNodeVmDevEnvironment(
  name: string,
  config: any
): Promise<DevEnvironment> {
  const devEnv = new DevEnvironment(name, config, {});

  const vmContext = createContext({
    config,
    console: {
      ...console,
      log: (...args: any[]) => {
        console.log("\nlog from node VM ========");
        console.log(...args);
        console.log("=========================\n");
      },
    },
    devEnv,
    Request,
    setTimeout,
    Response,
    URL,
    Headers,
  });

  const script = `
    let _moduleRunner;
    async function getModuleRunner() {
      if (_moduleRunner) return _moduleRunner;
      const { ModuleRunner } = await import("vite/module-runner");
      _moduleRunner = new ModuleRunner(
          {
            root: config.root,
            transport: {
              fetchModule: async (...args) => devEnv.fetchModule(...args),
            },
            hmr: false,
          },
          {
            runInlinedModule: async (context, transformed, id) => {
              const codeDefinition = \`'use strict';async (\${Object.keys(context).join(
                ',',
              )})=>{{\`;
              const code = \`\${codeDefinition}\${transformed}\n}}\`;
              const fn = eval(code, id);
              await fn(...Object.values(context));
              Object.freeze(context.__vite_ssr_exports__);
            },
            async runExternalModule(filepath) {
              return import(filepath);
            },
          },
      );
      return _moduleRunner;
    }

    devEnv.api = {
      async getNodeHandler({ entrypoint }) {
        const moduleRunner = await getModuleRunner();
        const entry = await moduleRunner.import(entrypoint);
        return entry.default;
      }
    }
  `;

  runInContext(script, vmContext, {
    // hack to get dynamic imports to work in node vms
    importModuleDynamically: (specifier) => {
      return import(specifier) as any;
    },
  });

  return devEnv;
}
