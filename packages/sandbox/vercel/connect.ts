import { SandboxHooks } from "../interface";

export async function connectVercel(config: { sessionId: string }): Promise<SandboxHooks> {
  const e2bApiKey = process.env.E2B_API_KEY;
  const sessionId = config.sessionId;

  console.log(`[Sandbox Proxy] Iniciando sessão transparente: ${sessionId}`);

  // 1. Criamos ou reaproveitamos uma instância na nuvem via HTTP puro
  // Usando a API REST oficial da E2B para não precisar de instalar pacotes via terminal
  const initInstance = async () => {
    if (!e2bApiKey) {
      throw new Error("A variável de ambiente E2B_API_KEY não foi configurada na Vercel.");
    }
    
    const response = await fetch("https://api.e2b.dev/instances", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${e2bApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "code-interpreter-v1",
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao criar microVM na E2B: ${response.statusText}`);
    }

    const data = await response.json();
    return data.instanceID; // ID único da máquina virtual persistente
  };

  // Inicializa a máquina virtual externa de forma lazy ou síncrona
  let instanceId: string | null = null;

  const ensureInstance = async () => {
    if (!instanceId) {
      instanceId = await initInstance();
    }
    return instanceId;
  };

  // 2. Retornamos os Hooks mapeados para a máquina externa com permissão de escrita total
  return {
    executeBash: async (command: string) => {
      const id = await ensureInstance();
      
      const response = await fetch(`https://api.e2b.dev/instances/${id}/commands`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${e2bApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
      });

      const result = await response.json();
      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exitCode ?? 0,
      };
    },

    readFiles: async (pattern: string) => {
      const id = await ensureInstance();
      // Executa um comando bash interno seguro para ler a estrutura de arquivos do contêiner
      const response = await fetch(`https://api.e2b.dev/instances/${id}/commands`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${e2bApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: `cat ${pattern}` }),
      });
      const result = await response.json();
      return [{ path: pattern, content: result.stdout || "" }];
    },

    writeFiles: async (files: Array<{ path: string; content: string }>) => {
      const id = await ensureInstance();
      for (const file of files) {
        // Injeta o arquivo diretamente dentro do sistema de arquivos gravável da máquina remota
        await fetch(`https://api.e2b.dev/instances/${id}/commands`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${e2bApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            command: `mkdir -p $(dirname ${file.path}) && cat << 'EOF' > ${file.path}\n${file.content}\nEOF` 
          }),
        });
      }
    },
  };
}
