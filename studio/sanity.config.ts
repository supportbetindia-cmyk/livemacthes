import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { article } from "./schemaTypes/article";

export default defineConfig({
  name: "default",
  title: "LiveScore CMS",
  projectId: "blh3zlqn",
  dataset: "production",
  plugins: [structureTool()],
  schema: { types: [article] },
});
