import * as fsPromises from "fs/promises";
import copy from "rollup-plugin-copy";
import { defineConfig } from "vite";

function updateModuleManifestPlugin() {
    return {
        name: "update-module-manifest",
        async writeBundle() {

            const moduleVersion = process.env.MODULE_VERSION;
            const githubProject = process.env.GH_PROJECT;
            const githubTag = process.env.GH_TAG;

            const manifestContents = await fsPromises.readFile("./module.json", "utf-8");
            const manifestJson = JSON.parse(manifestContents)

            if (moduleVersion) {
                manifestJson["version"] = moduleVersion
            }

            if (githubProject) {
                const baseUrl = `https://github.com/${githubProject}/releases`;
                manifestJson["manifest"] = `${baseUrl}/latest/download/module.json`;
                if (githubTag) {
                    manifestJson["download"] = `${baseUrl}/download/${githubTag}/module.zip`;
                }
            }

            await fsPromises.writeFile(
                "dist/module.json",
                JSON.stringify(manifestJson, null, 4)
            );
        },
    };
}

export default defineConfig({
    build: {
        sourcemap: true,
        rollupOptions: {
            input: "scripts/module.js",
            output: {
                dir: "dist/scripts/",
                entryFileNames: "module.js",
                format: "es",
            },
        },
    },
    plugins: [
        copy({
            targets: [
                { src: "src/module.json", dest: "dist" }
            ],
            hook: "writeBundle",
        }),
        updateModuleManifestPlugin()
    ],
});