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
			const SUBSET_SIZE = 3;
			const randomFiles = getRandomSubset(allFiles, SUBSET_SIZE);

			const message = "Utilisez les mots " + randomFiles[0].basename + " et " + currName + " dans court sentence.";

			console.log(message);

			const response = await this.openai.createChatCompletion({
				model: "gpt-3.5-turbo", messages: [
					{ role: "user", content: message },
				]
			});

			const title = "Je connecte `" + randomFiles[0].basename + "` et `" + currName + "` pour toi.\n\n"
			const responseText = response.data.choices[0].message?.content;

			new SampleModal(this.app, responseText!, title).open();
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class'); // we could change it into loading while user is waiting for response?

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
			.setDesc("Used to call Chat GPT on your behalf")
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
			// .setDesc("Used to call Chat GPT on your behalf")
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