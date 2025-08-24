import { EditorView, Decoration, DecorationSet, PluginValue, ViewUpdate } from "@codemirror/view";
import { App, editorLivePreviewField } from "obsidian";
import { LinkRangeSettings } from "./settings";
import { RangeSetBuilder } from "@codemirror/state";
import { replaceEmbed } from "./embeds";

export class LifePreviewEmbedReplacer implements PluginValue {
	decorations: DecorationSet = Decoration.none;
	settings: LinkRangeSettings;
	app: App;
	embedCount: number;

	constructor(settings: LinkRangeSettings, app: App) {
		this.settings = settings;
		this.app = app;
		this.embedCount = 0;
	}

	buildDecorations(view: EditorView, embeds: NodeList): DecorationSet {
		const buffer = new RangeSetBuilder<Decoration>()
		embeds.forEach(embed => {
			replaceEmbed(embed, this.settings)
		});
		return buffer.finish();
	}

	update(update: ViewUpdate) {
		if (!update.state.field(editorLivePreviewField)) {
			// live preview only, not rendered in strict source code view
			this.decorations = Decoration.none;
			return;
		}
		const embeds = update.view.contentDOM.querySelectorAll("div.markdown-embed");

		if ((embeds.length > 0 && embeds.length != this.embedCount) || update.docChanged) {
			this.embedCount = embeds.length;
			this.decorations = this.buildDecorations(update.view, embeds);
		}
	}	
}
