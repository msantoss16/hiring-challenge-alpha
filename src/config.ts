//Enviroment configs without docker (LLM and data folders)
import "dotenv/config";

export const CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  modelName: process.env.MODEL_NAME ?? "gpt-4o-mini",
  embeddingsModel: process.env.EMBEDDINGS_MODEL ?? "text-embedding-3-small",
  data: {
    sqliteDir: "data/sqlite",
    docsDir: "data/documents",
  },
};

if (!CONFIG.openaiApiKey) {
  console.warn("Missing openAI API KEY!! (.env)");
}
