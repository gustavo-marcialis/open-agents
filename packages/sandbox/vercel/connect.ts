// @ts-nocheck
import type { Sandbox } from "../interface";

export async function connectVercel(config: any): Promise<Sandbox> {
  const e2bApiKey = process.env.E2B_API_KEY;

  return {
    type: "cloud",
    workingDirectory: "/home/user",
    
    executeBash: async (command: string) => {
      const res = await fetch("https://api.e2b.dev/instances/commands", {
        method: "POST",
        headers: { "Authorization": `Bearer ${e2bApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      return { stdout: data.stdout || "", stderr: data.stderr || "", exitCode: 0 };
    },

    readFile: async (path: string) => "",
    readFileBuffer: async (path: string) => Buffer.from(""),
    writeFile: async (path: string, content: any) => {},
    readDirectory: async (path: string) => [],
    createDirectory: async (path: string) => {},
    delete: async (path: string) => {},
    status: async () => ({ status: "running" }),
    disconnect: async () => {},
    snapshot: async () => ({ snapshotId: "proxy" })
  };
}
