import { Console } from 'console';
import { App, Modal, Plugin, PluginSettingTab, Setting, TFile, Notice } from 'obsidian';
import { Configuration, OpenAIApi } from "openai";

const SUBSET_SIZE = 5;

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

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	openai: OpenAIApi;
	lock: boolean;

	async guesser() {
		const selected = window.getSelection()?.toString();
		const response = await this.openai.createChatCompletion({
			model: "gpt-3.5-turbo", messages: [
				{ role: "user", content: "Devinez le mot - \"" + selected + "\". Repondez avec un seul mot." },
			]
		});
		const currName = this.app.workspace.getActiveFile()?.basename;
		new GuessedNameModal(this.app, response.data.choices[0].message?.content!, currName!).open();
	}

	async associator() {
		const currName = this.app.workspace.getActiveFile()?.basename;
		const allFiles = this.app.vault.getFiles()
		const randomFiles = getRandomSubset(allFiles, SUBSET_SIZE)
			.filter(n => !n.basename.startsWith("PNG")) // screenshots are saved in the vault with PNG at the front.
			.filter(n => !n.basename.startsWith("Screenshot")) // screenshots are saved in the vault with Screenshot at the front.
			.filter(n => !n.basename.startsWith("Untitled")); // new notes starts like that
		const obj = {
			main: currName,
			candidates: randomFiles.map(f => f.basename)
		};
		const response = await this.openai.createChatCompletion({
			model: "gpt-3.5-turbo", messages: [
				{ role: "system", content: "Permutate main with every candidate, for each create short sentence that uses both words. Return as JSON with every candidate as key and sentence as value" },
				{ role: "user", content: JSON.stringify(obj) },
			]
		});
		const title = "J'ai trouvé des associations avec " + currName;
		const parsedResp = JSON.parse(response.data.choices[0].message?.content!);
		new AssociatedWordsModal(this.app, parsedResp, title).open();
	}

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('arrow-up-down', 'Sample Plugin', async (evt: MouseEvent) => {
			if (this.lock == true) {
				new Notice('Associator already in progress');
				return;
			}
			this.lock = true;

			const selected = window.getSelection()?.toString();
			if (selected != "") {
				await this.guesser();
			} else {
				await this.associator();
			}
			this.lock = false;
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
class GuessedNameModal extends Modal {
	guessed: string;
	actual: string;

	constructor(app: App, guessed: string, actual: string) {
		super(app);
		this.guessed = guessed;
		this.actual = actual;
	}

	onOpen() {
		const { titleEl, contentEl, } = this;
		titleEl.setText("Toi vs IA");

		contentEl.createEl("h3", { text: "toi" });
		contentEl.createEl("p", { text: this.actual })

		contentEl.createEl("h3", { text: "ia" });
		contentEl.createEl("p", { text: this.guessed })
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

}

class AssociatedWordsModal extends Modal {
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