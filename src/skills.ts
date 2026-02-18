import { TFile, Notice } from 'obsidian';
import { OpenCodePlugin } from './main';

export interface Skill {
	name: string;
	description: string;
	version: string;
	instructions: string;
	triggers: string[];
	enabled: boolean;
}

export class SkillsManager {
	plugin: OpenCodePlugin;
	skills: Map<string, Skill> = new Map();

	constructor(plugin: OpenCodePlugin) {
		this.plugin = plugin;
	}

	async loadSkills() {
		this.skills.clear();
		
		const vault = this.plugin.app.vault;
		const skillsDir = this.plugin.settings.skillsDir;
		
		try {
			const dir = vault.getFolderByPath(skillsDir);
			if (!dir) {
				this.loadDefaultSkills();
				return;
			}

			const files = dir.children.filter((f: any): f is TFile => f instanceof TFile && f.extension === 'md');
			
			for (const file of files) {
				const content = await vault.cachedRead(file);
				const skill = this.parseSkillFile(content, file.basename);
				if (skill) {
					this.skills.set(skill.name, skill);
				}
			}
		} catch (error) {
			this.loadDefaultSkills();
		}

		new Notice(`Loaded ${this.skills.size} skills`);
	}

	private loadDefaultSkills() {
		const defaultSkills: Skill[] = [
			{
				name: 'code-review',
				description: 'Review and analyze code for improvements',
				version: '1.0.0',
				instructions: `You are a code review expert. When asked to review code:
1. Analyze the code structure and readability
2. Identify potential bugs or issues
3. Suggest improvements for performance and maintainability
4. Check for security vulnerabilities
Provide constructive feedback with specific suggestions.`,
				triggers: ['review code', 'analyze code', 'code review'],
				enabled: true
			},
			{
				name: 'refactor',
				description: 'Refactor and improve existing code',
				version: '1.0.0',
				instructions: `You are a refactoring expert. When asked to refactor:
1. Preserve the original functionality
2. Improve code readability and maintainability
3. Apply SOLID principles
4. Reduce code duplication
5. Suggest incremental improvements
Explain your refactoring decisions.`,
				triggers: ['refactor', 'improve code', 'restructure'],
				enabled: true
			},
			{
				name: 'explain',
				description: 'Explain code and concepts clearly',
				version: '1.0.0',
				instructions: `You are a programming educator. When asked to explain:
1. Break down complex concepts into simple parts
2. Use analogies where helpful
3. Provide concrete examples
4. Consider the user's skill level
5. Be thorough but concise`,
				triggers: ['explain', 'what does', 'how does', 'why is'],
				enabled: true
			},
			{
				name: 'test',
				description: 'Generate tests for code',
				version: '1.0.0',
				instructions: `You are a testing expert. When asked to create tests:
1. Cover edge cases and error conditions
2. Use descriptive test names
3. Follow AAA pattern (Arrange, Act, Assert)
4. Include both positive and negative test cases
5. Suggest testing strategies`,
				triggers: ['test', 'write tests', 'generate tests', 'unit test'],
				enabled: true
			},
			{
				name: 'doc',
				description: 'Generate documentation for code',
				version: '1.0.0',
				instructions: `You are a technical writer. When asked to document:
1. Write clear, concise documentation
2. Include code examples where helpful
3. Document parameters, return values, and exceptions
4. Keep docs in sync with code
5. Use appropriate format (JSDoc, README, etc.)`,
				triggers: ['document', 'docs', 'readme', 'generate docs'],
				enabled: true
			}
		];

		defaultSkills.forEach(skill => {
			this.skills.set(skill.name, skill);
		});
	}

	private parseSkillFile(content: string, filename: string): Skill | null {
		const lines = content.split('\n');
		let name = filename;
		let description = '';
		let version = '1.0.0';
		let instructions = '';
		let triggers: string[] = [];
		let inFrontmatter = false;
		let inInstructions = false;

		for (const line of lines) {
			if (line.trim() === '---') {
				if (!inFrontmatter) {
					inFrontmatter = true;
					continue;
				} else {
					inFrontmatter = false;
					continue;
				}
			}

			if (inFrontmatter) {
				if (line.startsWith('name:')) {
					name = line.replace('name:', '').trim();
				} else if (line.startsWith('description:')) {
					description = line.replace('description:', '').trim();
				} else if (line.startsWith('version:')) {
					version = line.replace('version:', '').trim();
				} else if (line.startsWith('triggers:')) {
					triggers = line.replace('triggers:', '').split(',').map(t => t.trim());
				}
			} else if (!inInstructions && line.trim()) {
				inInstructions = true;
				instructions = line;
			} else if (inInstructions) {
				instructions += '\n' + line;
			}
		}

		if (!instructions) {
			instructions = content;
		}

		return {
			name,
			description,
			version,
			instructions,
			triggers,
			enabled: true
		};
	}

	getSkills(): Skill[] {
		return Array.from(this.skills.values());
	}

	getSkill(name: string): Skill | undefined {
		return this.skills.get(name);
	}

	findMatchingSkill(prompt: string): Skill | undefined {
		const lowerPrompt = prompt.toLowerCase();
		
		for (const skill of this.skills.values()) {
			if (!skill.enabled) continue;
			
			for (const trigger of skill.triggers) {
				if (lowerPrompt.includes(trigger.toLowerCase())) {
					return skill;
				}
			}
		}
		
		return undefined;
	}

	enableSkill(name: string, enabled: boolean) {
		const skill = this.skills.get(name);
		if (skill) {
			skill.enabled = enabled;
		}
	}

	addSkill(skill: Skill) {
		this.skills.set(skill.name, skill);
	}

	removeSkill(name: string) {
		this.skills.delete(name);
	}
}
