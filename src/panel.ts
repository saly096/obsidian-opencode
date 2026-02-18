import { Modal, TextComponent, ButtonComponent, Notice, TFile, Editor, View, WorkspaceLeaf } from 'obsidian';
import { OpenCodePlugin } from './main';

export const VIEW_TYPE_OPENCODE = 'opencode-view';

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
}

export class OpenCodeView extends View {
	plugin: OpenCodePlugin;
	messages: ChatMessage[] = [];
	private inputField: TextComponent | null = null;
	private messagesContainer: HTMLElement | null = null;
	private sendButton: ButtonComponent | null = null;
	private isLoading: boolean = false;
	private contentEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: OpenCodePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_OPENCODE;
	}

	getDisplayText() {
		return 'OpenCode AI';
	}

	onOpen() {
		this.contentEl = this.containerEl;
		this.contentEl.style.height = '100%';
		this.contentEl.style.display = 'flex';
		this.contentEl.style.flexDirection = 'column';
		this.contentEl.empty();
		this.contentEl.addClass('opencode-view');
		this.buildContent();
	}

	onClose() {
		this.contentEl = null;
	}

	private buildContent() {
		if (!this.contentEl) return;

		const container = this.contentEl;
		container.empty();
		container.addClass('opencode-panel');

		const header = container.createDiv('opencode-header');
		header.createEl('h2', { text: 'OpenCode AI' });

		const toolbar = header.createDiv('opencode-toolbar');
		
		const clearButton = toolbar.createEl('button', { text: 'Clear' });
		clearButton.onClick = () => this.clearChat();

		this.messagesContainer = container.createDiv('opencode-messages');

		const inputArea = container.createDiv('opencode-input-area');
		
		this.inputField = new TextComponent(inputArea);
		this.inputField.inputEl.className = 'opencode-input';
		this.inputField.setPlaceholder('Ask anything...');
		
		const self = this;
		this.inputField.inputEl.addEventListener('keydown', function(e) {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				self.sendMessage();
			}
		});

		this.sendButton = new ButtonComponent(inputArea);
		this.sendButton.setIcon('send');
		this.sendButton.onClick(function() {
			self.sendMessage();
		});

		this.scrollToBottom();
	}

	private clearChat() {
		this.messages = [];
		if (this.messagesContainer) {
			this.messagesContainer.empty();
		}
	}

	private addMessage(role: 'user' | 'assistant' | 'system', content: string) {
		this.messages.push({
			role,
			content,
			timestamp: Date.now()
		});

		if (this.messagesContainer) {
			const messageEl = this.messagesContainer.createDiv(`opencode-message opencode-${role}`);
			
			const avatar = messageEl.createDiv('opencode-avatar');
			avatar.textContent = role === 'user' ? '👤' : '🤖';
			
			const contentEl = messageEl.createDiv('opencode-content');
			contentEl.createEl('p', { text: content });
		}
	}

	private async sendMessage() {
		const message = this.inputField?.getValue().trim();
		if (!message || this.isLoading) return;

		this.inputField?.setValue('');
		this.addMessage('user', message);
		this.setLoading(true);

		try {
			const context = this.buildContext();
			const response = await this.callAI(message, context);
			this.addMessage('assistant', response);
		} catch (error: any) {
			this.addMessage('assistant', `Error: ${error.message}`);
		} finally {
			this.setLoading(false);
			this.scrollToBottom();
		}
	}

	private buildContext(): string {
		const activeFile = this.plugin.app.workspace.getActiveFile();
		let context = '';

		if (activeFile) {
			const content = this.plugin.app.vault.cachedRead(activeFile);
			context += `\n\nCurrent file (${activeFile.name}):\n${String(content).slice(0, 2000)}`;
		}

		const allFiles = this.plugin.app.vault.getFiles();
		context += `\n\nVault files: ${allFiles.slice(0, 50).map(f => f.path).join(', ')}`;

		return context;
	}

	private async callAI(message: string, context: string): Promise<string> {
		const settings = this.plugin.settings;

		if (settings.apiProvider === 'local') {
			return await this.callLocalOpenCode(message, context);
		}

		if (!settings.apiKey) {
			return 'Please configure your API key in the plugin settings.';
		}

		const messages = [
			{ role: 'system', content: settings.systemPrompt },
			{ role: 'system', content: `Current vault context: ${context}` },
			...this.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
			{ role: 'user', content: message }
		];

		let url: string;
		const headers: any = {
			'Content-Type': 'application/json'
		};
		let body: any;

		if (settings.apiProvider === 'openai') {
			url = 'https://api.openai.com/v1/chat/completions';
			headers['Authorization'] = `Bearer ${settings.apiKey}`;
			body = {
				model: settings.model,
				messages,
				max_tokens: settings.maxTokens,
				temperature: settings.temperature
			};
		} else if (settings.apiProvider === 'anthropic') {
			url = 'https://api.anthropic.com/v1/messages';
			headers['x-api-key'] = settings.apiKey;
			headers['anthropic-version'] = '2023-06-01';
			body = {
				model: settings.model || 'claude-3-sonnet-20240229',
				max_tokens: settings.maxTokens,
				messages: messages.map(m => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content }))
			};
		} else {
			url = settings.customApiUrl;
			body = {
				model: settings.model,
				messages,
				max_tokens: settings.maxTokens,
				temperature: settings.temperature
			};
		}

		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`API Error: ${response.status} - ${error}`);
		}

		const data: any = await response.json();
		
		if (settings.apiProvider === 'anthropic') {
			return data.content[0]?.text || 'No response';
		}
		
		return data.choices[0]?.message?.content || 'No response';
	}

	private async callLocalOpenCode(message: string, context: string): Promise<string> {
		const settings = this.plugin.settings;
		const vaultPath = this.plugin.app.vault.adapter.getBasePath();
		
		const fullPrompt = `Please answer in Chinese. ${message}`;
		
		const { execSync } = require('child_process');
		
		try {
			const cmd = `opencode run "${fullPrompt.replace(/"/g, '\\"')}"`;
			console.log('Running opencode command...');
			
			const stdout = execSync(cmd, { 
				cwd: vaultPath, 
				encoding: 'utf8',
				maxBuffer: 10 * 1024 * 1024,
				timeout: 60000
			});
			
			const cleaned = stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();
			console.log('Opencode output:', cleaned);
			return cleaned;
		} catch (e: any) {
			console.error('Opencode error:', e);
			if (e.stdout) {
				const cleaned = e.stdout.replace(/\x1b\[[0-9;]*m/g, '').trim();
				return cleaned;
			}
			throw new Error(`Failed to run opencode: ${e.message}`);
		}
	}

	private setLoading(loading: boolean) {
		this.isLoading = loading;
		if (this.sendButton) {
			this.sendButton.setDisabled(loading);
		}
		if (this.inputField && this.inputField.inputEl) {
			(this.inputField.inputEl as any).disabled = loading;
		}
	}

	private scrollToBottom() {
		if (this.messagesContainer) {
			(this.messagesContainer as any).scrollTop = (this.messagesContainer as any).scrollHeight;
		}
	}
}

export class OpenCodePanel {
	plugin: OpenCodePlugin;

	constructor(plugin: OpenCodePlugin) {
		this.plugin = plugin;
	}

	async open(initialMessage?: string) {
		const leaf = await this.plugin.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_OPENCODE, active: true });
		}
	}
}