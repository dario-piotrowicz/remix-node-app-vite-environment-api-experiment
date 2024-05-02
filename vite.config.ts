/* eslint-disable */
// @ts-nocheck
import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { viteEnvironmentPluginNode } from "./viteNodeEnv.ts";

installGlobals();

export default defineConfig({
  plugins: [viteEnvironmentPluginNode(), remix(), tsconfigPaths()],
});
