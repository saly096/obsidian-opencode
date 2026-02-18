import { Notice, TFile } from 'obsidian';
import { OpenCodePlugin } from './main';

export interface MCPServer {
	name: string;
	command: string;
	args: string[];
	env?: Record<string, string>;
}

export interface MCPTool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export class MCPManager {
	plugin: OpenCodePlugin;
	servers: MCPServer[] = [];
	connectedTools: Map<string, MCPTool[]> = new Map();
	private processes: Map<string, any> = new Map();

	constructor(plugin: OpenCodePlugin) {
		this.plugin = plugin;
	}

	async connect() {
		if (!this.plugin.settings.enableMcp) {
			return;
		}

		try {
			const serversConfig = JSON.parse(this.plugin.settings.mcpServers || '[]');
			this.servers = serversConfig as MCPServer[];

			for (const server of this.servers) {
				await this.connectServer(server);
			}

			new Notice(`Connected to ${this.servers.length} MCP servers`);
		} catch (error) {
			console.error('MCP connection error:', error);
		}
	}

	private async connectServer(server: MCPServer) {
		try {
			const response = await fetch('http://localhost:3000/list', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/list',
					params: {}
				})
			});

			if (response.ok) {
				const data: any = await response.json();
				this.connectedTools.set(server.name, data.result?.tools || []);
			}
		} catch {
			this.connectedTools.set(server.name, []);
		}
	}

	disconnect() {
		this.processes.forEach((proc) => {
			if (proc && typeof proc.kill === 'function') {
				proc.kill();
			}
		});
		this.processes.clear();
		this.connectedTools.clear();
		new Notice('Disconnected from MCP servers');
	}

	getTools(): MCPTool[] {
		const allTools: MCPTool[] = [];
		this.connectedTools.forEach((tools) => {
			allTools.push(...tools);
		});
		return allTools;
	}

	async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<any> {
		try {
			const response = await fetch('http://localhost:3000/call', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: {
						name: toolName,
						arguments: args
					}
				})
			});

			if (!response.ok) {
				throw new Error(`MCP tool call failed: ${response.statusText}`);
			}

			const data: any = await response.json();
			return data.result;
		} catch (error) {
			console.error('MCP tool call error:', error);
			throw error;
		}
	}

	async executeFileOperation(operation: 'read' | 'write' | 'list', path: string, content?: string): Promise<string> {
		const tools = this.getTools();
		const toolName = operation === 'list' ? 'directory_list' : `filesystem_${operation}`;
		
		const tool = tools.find(t => t.name === toolName);
		if (!tool) {
			const fallbackTools = this.getFilesystemTools();
			if (fallbackTools.length > 0) {
				const fallback = fallbackTools[0];
				return JSON.stringify(await this.callTool('filesystem', fallback.name, { path, content }));
			}
			return this.fallbackFileOperation(operation, path, content);
		}

		const result = await this.callTool('filesystem', toolName, { path, content });
		return JSON.stringify(result);
	}

	private getFilesystemTools(): MCPTool[] {
		return this.connectedTools.get('filesystem') || 
			   this.connectedTools.get('filesystem-server') || 
			   [];
	}

	private async fallbackFileOperation(operation: 'read' | 'write' | 'list', path: string, content?: string): Promise<string> {
		const vault = this.plugin.app.vault;
		
		switch (operation) {
			case 'read': {
				const file = vault.getAbstractFileByPath(path);
				if (file instanceof TFile) {
					return await vault.read(file);
				}
				return 'File not found';
			}
			case 'write': {
				(vault as any).write(path, content || '');
				return 'File written';
			}
			case 'list': {
				const files = vault.getFiles().filter(f => f.path.startsWith(path));
				return JSON.stringify(files.map(f => ({ name: f.name, path: f.path })));
			}
			default:
				return 'Unknown operation';
		}
	}

	getServerStatus(): { name: string; connected: boolean; tools: number }[] {
		return this.servers.map(server => ({
			name: server.name,
			connected: this.connectedTools.has(server.name),
			tools: this.connectedTools.get(server.name)?.length || 0
		}));
	}
}
