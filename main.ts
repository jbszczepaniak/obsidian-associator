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
import { workerData } from 'worker_threads';



export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	openai: OpenAIApi;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('arrow-up-down', 'Sample Plugin', async (evt: MouseEvent) => {
			const currName = this.app.workspace.getActiveFile()?.basename;

			const allFiles = this.app.vault.getFiles()
			const SUBSET_SIZE = 3;
			const randomFiles = getRandomSubset(allFiles, SUBSET_SIZE)
				.filter(n => !n.basename.startsWith("PNG")) // screenshots are saved in the vault with PNG at the front.
				.filter(n => !n.basename.startsWith("Screenshot")) // screenshots are saved in the vault with Screenshot at the front.
				.filter(n => !n.basename.startsWith("Untitled")); // new notes starts like that

			const obj = {
				main: currName,
				candidates: randomFiles.map(f => f.basename)
			};
			console.log(JSON.stringify(obj));

			const response = await this.openai.createChatCompletion({
				model: "gpt-3.5-turbo", messages: [
					{ role: "system", content: "Permutate main with every candidate, for each create short sentence that uses both words. Return as JSON with every candidate as key and sentence as value" },
					{ role: "user", content: JSON.stringify(obj) },
				]
			});

			const title = "J'ai trouvé des associations avec " + currName;
			console.log(response.data)
			const parsedResp = JSON.parse(response.data.choices[0].message?.content!);

			new SampleModal(this.app, parsedResp, title).open();
		});

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
	msg: object;


	constructor(app: App, msg: object, title: string) {
		super(app);
		this.msg = msg;
		this.title = title;
	}

	onOpen() {
		const { titleEl, contentEl, } = this;
		titleEl.setText(this.title);

		Object.keys(this.msg).forEach(k => {
			console.log(k, this.msg[k])
			contentEl.createDiv
			contentEl.createEl("h3", { text: k });
			contentEl.createEl("p", { text: this.msg[k] })
		})
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