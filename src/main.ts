import { App, Plugin, PluginSettingTab, Setting, Notice, TextComponent, WorkspaceLeaf } from 'obsidian';
import { OpenCodePanel, OpenCodeView, VIEW_TYPE_OPENCODE } from './panel';
import { SkillsManager } from './skills';
import { MCPManager } from './mcp';
import { OpenCodeSettings, DEFAULT_SETTINGS } from './settings';
import styles from './styles.css';

export class OpenCodePlugin extends Plugin {
	settings: OpenCodeSettings;
	panel: OpenCodePanel;
	skillsManager: SkillsManager;
	mcpManager: MCPManager;

	async onload() {
		await this.loadSettings();

		this.skillsManager = new SkillsManager(this);
		this.mcpManager = new MCPManager(this);
		this.panel = new OpenCodePanel(this);

		this.register(() => {
			const style = document.createElement('style');
			style.textContent = styles;
			document.head.appendChild(style);
		});

		this.registerView(VIEW_TYPE_OPENCODE, (leaf) => new OpenCodeView(leaf, this));

		this.addCommand({
			id: 'open-opencode-panel',
			name: 'Open OpenCode AI Panel',
			callback: () => this.panel.open()
		});

		this.addCommand({
			id: 'opencode-chat',
			name: 'Chat with OpenCode AI',
			callback: () => this.panel.open()
		});

		this.addRibbonIcon('bot', 'OpenCode AI', () => {
			this.panel.open();
		});

		this.addSettingTab(new OpenCodeSettingTab(this.app, this));

		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => {
			menu.addItem((item) => {
				item.setTitle('Ask OpenCode')
					.setIcon('bot')
					.onClick(() => {
						const selection = editor.getSelection();
						if (selection) {
							this.panel.open(selection);
						}
					});
			});
		}));

		this.skillsManager.loadSkills();
		this.mcpManager.connect();
	}

	onunload() {
		this.mcpManager?.disconnect();
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class OpenCodeSettingTab extends PluginSettingTab {
	plugin: OpenCodePlugin;

	constructor(app: App, plugin: OpenCodePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'OpenCode AI Settings' });

		new Setting(containerEl)
			.setName('API Provider')
			.setDesc('Choose your AI provider')
			.addDropdown(dropdown => dropdown
				.addOption('local', 'Local (OpenCode CLI)')
				.addOption('openai', 'OpenAI')
				.addOption('anthropic', 'Anthropic')
				.addOption('custom', 'Custom Endpoint')
				.setValue(this.plugin.settings.apiProvider)
				.onChange((value) => {
					this.plugin.settings.apiProvider = value as any;
					this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your API key for AI services')
			.addText(text => {
				text.setPlaceholder('Enter API key')
					.setValue(this.plugin.settings.apiKey)
					.onChange((value) => {
						this.plugin.settings.apiKey = value;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Custom API URL')
			.setDesc('Custom endpoint URL (for custom provider)')
			.addText(text => {
				text.setPlaceholder('https://api.example.com/v1/chat')
					.setValue(this.plugin.settings.customApiUrl)
					.onChange((value) => {
						this.plugin.settings.customApiUrl = value;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('System Prompt')
			.setDesc('Default system prompt for AI')
			.addTextArea(text => {
				text.setPlaceholder('You are a helpful coding assistant...')
					.setValue(this.plugin.settings.systemPrompt)
					.onChange((value) => {
						this.plugin.settings.systemPrompt = value;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Skills Directory')
			.setDesc('Directory containing skill definitions')
			.addText(text => {
				text.setPlaceholder('.opencode/skills')
					.setValue(this.plugin.settings.skillsDir)
					.onChange((value) => {
						this.plugin.settings.skillsDir = value;
						this.plugin.saveSettings();
						this.plugin.skillsManager.loadSkills();
					});
			});

		new Setting(containerEl)
			.setName('Enable MCP')
			.setDesc('Enable Model Context Protocol integration')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.enableMcp)
					.onChange((value) => {
						this.plugin.settings.enableMcp = value;
						this.plugin.saveSettings();
						if (value) {
							this.plugin.mcpManager.connect();
						} else {
							this.plugin.mcpManager.disconnect();
						}
					});
			});

		new Setting(containerEl)
			.setName('MCP Servers')
			.setDesc('MCP server configurations (JSON)')
			.addTextArea(text => {
				text.setPlaceholder('[{"name": "filesystem", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]}]')
					.setValue(this.plugin.settings.mcpServers)
					.onChange((value) => {
						this.plugin.settings.mcpServers = value;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Model')
			.setDesc('AI model to use')
			.addDropdown(dropdown => dropdown
				.addOption('gpt-4', 'GPT-4')
				.addOption('gpt-4-turbo', 'GPT-4 Turbo')
				.addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
				.addOption('claude-3-opus-20240229', 'Claude 3 Opus')
				.addOption('claude-3-sonnet-20240229', 'Claude 3 Sonnet')
				.addOption('claude-3-haiku-20240307', 'Claude 3 Haiku')
				.setValue(this.plugin.settings.model)
				.onChange((value) => {
					this.plugin.settings.model = value;
					this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Max Tokens')
			.setDesc('Maximum tokens in response')
			.addText(text => {
				text.setPlaceholder('4096')
					.setValue(String(this.plugin.settings.maxTokens))
					.onChange((value) => {
						this.plugin.settings.maxTokens = parseInt(value) || 4096;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Response creativity (0-1)')
			.addSlider(slider => {
				slider.setValue(this.plugin.settings.temperature)
					.setLimits(0, 1, 0.1)
					.onChange((value) => {
						this.plugin.settings.temperature = value;
						this.plugin.saveSettings();
					});
			});
	}
}

export default OpenCodePlugin;
