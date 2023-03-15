import { App, Modal, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface MyPluginSettings {
	OpenAItoken: string;
	OpenAIorganisation: string;
}

function getRandomSubset(arr: TFile[], size: Number) {
	let random = new Set();
	while (random.size < size) {
		random.add(Math.floor(Math.random() * arr.length));
	}
	return arr.filter((v, i) => random.has(i));
}

import { Configuration, OpenAIApi } from "openai";



export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	openai: OpenAIApi;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('arrow-up-down', 'Sample Plugin', async (evt: MouseEvent) => {
			const currName = this.app.workspace.getActiveFile()?.basename;
			console.log(currName);
			const allFiles = this.app.vault.getFiles()
			const SUBSET_SIZE = 20;
			const randomFiles = getRandomSubset(allFiles, SUBSET_SIZE)
				.filter(n => !n.basename.startsWith("PNG")); // screenshots are saved in the vault with PNG at the front.

			let message = "Entre les mots: "
			randomFiles.forEach((file: TFile) => {
				message += file.basename + ", "
			})
			message += ". Choisit un mot entre , qui et mieux associé avec "
				+ currName + ". Utilisiez un mot choisit avec un mot donne dans un court sentence."

			console.log(message);
			const response = await this.openai.createChatCompletion({
				model: "gpt-3.5-turbo", messages: [
					{ role: "user", content: message },
				]
			});

			const title = "J'ai trouvé un association";
			const responseText = response.data.choices[0].message?.content;

			new SampleModal(this.app, responseText!, title).open();
		});

		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class'); // we could change it into loading while user is waiting for response?

		this.addSettingTab(new ExampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, await this.loadData());
		const configuration = new Configuration({
			organization: this.settings.OpenAIorganisation,
			apiKey: this.settings.OpenAItoken,
		});
		this.openai = new OpenAIApi(configuration);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	title: string;
	msg: string;


	constructor(app: App, msg: string, title: string) {
		super(app);
		this.msg = msg;
		this.title = title;
	}

	onOpen() {
		const { titleEl, contentEl } = this;
		titleEl.setText(this.title);
		contentEl.setText(this.msg);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class ExampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("OpenAI Token")
			.setDesc("Used to call Chat GPT on your behalf. Can be found https://platform.openai.com/account/api-keys")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.OpenAItoken)
					.onChange(async (value) => {
						this.plugin.settings.OpenAItoken = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("OpenAI Organisation")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.OpenAIorganisation)
					.onChange(async (value) => {
						this.plugin.settings.OpenAIorganisation = value;
						await this.plugin.saveSettings();
					})
			);
	}
}