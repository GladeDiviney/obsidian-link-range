import { App, TFile } from "obsidian";
import { LinkRangeSettings, Pattern } from "./settings";
import * as path from 'path';

export interface ParsedLink {
	// NAME in [[NAME#H1..H2|ALT]]
	note: string;
	// H1 (required!)
	h1: string;
	// (optional) H2
	h2?: string;
	// (optional) ALT
	altText: string;
	// Pattern to apply from settings
	pattern: Pattern;
	// File referred to by note
	file: TFile;
	// h1 row in file
	h1Line: number;
	// (optional) h2 row in file
	h2Line?: number;
}

function parseHrefLink(href: string, settings: LinkRangeSettings): ParsedLink | null {
	const linkRegex = /([^#|]*)#?([^#|]*)?\|?(.*)?/;

	const matches = linkRegex.exec(href);

	if (matches == null || matches.length < 3 || matches[2] == undefined) {
		return null;
	}

	const note = matches[1];

	// Locate the referenced file, including partial paths
	const partialPath = note + ".md"
	const basePart = path.basename(note)
		const file: TFile | undefined = app.vault.getMarkdownFiles().filter(
		x => x.basename == basePart && x.path.endsWith(partialPath)
	).first()

	if (!file) return null;
	
	const pattern = findPatternForFile(file, settings);

	const split = matches[2].split(settings.headingSeparator);
	const h1 = split[0];
	const h2 = split[1];

	// Capture or create alt-text
	let altText = "";
	if (matches.length > 3 && matches[3] != undefined) {
		altText = matches[3]
	} else {
		const headingVisual = pattern.headingVisual === '' ? '#' : pattern.headingVisual;
		const headingSeparatorVisual = pattern.headingSeparatorVisual === '' ? settings.headingSeparator : pattern.headingSeparatorVisual;
		if (h2 !== undefined) {
			altText = `${basePart}${headingVisual}${h1}${headingSeparatorVisual}${h2}`;
		} else {
			altText = `${basePart}${headingVisual}${h1}`;
		}
	}

	return { 
		note: note, 
		h1: h1, 
		h2: h2, 
		altText: altText, 
		pattern: pattern,
		file: file,
		// Will find these later 
		h1Line: 0,  
		h2Line: undefined
	};
}

export function parseLink(app: App, linkHTML: HTMLElement, settings: LinkRangeSettings, isEmbed=false, hrefField = "data-href"): ParsedLink | null {
	const href = linkHTML.getAttribute(hrefField);

	if (href == null) return null;

	const res = parseHrefLink(href, settings)
	if (!res || app.metadataCache == null) return null;

	const alt = linkHTML.getAttribute("alt");

	// non-standard alt text, must be user provided via "|"
	if (alt != null && !alt.contains(res.note)) {
		res.altText = alt;
	}

	if (!isEmbed && !linkHTML.innerText.contains(res.note)) {
		res.altText = linkHTML.innerText;
	}

	const meta = app.metadataCache.getFileCache(res.file);

	if (meta == undefined || meta.headings == undefined) {
		return null;
	}

	// Look for first exact match for h1 text
	const h1Line = meta?.headings?.filter(
		h => h.heading == res.h1
	).first()?.position.start.line;
	if (h1Line == undefined) return null;
	res.h1Line = h1Line;

	// Look for h2Line if we can
	if (res.h2 !== undefined) {
		if (settings.endInclusive) {
			let h2LineIndex = meta?.headings?.findIndex(h => h.heading == res.h2)

			if (meta?.headings?.length > h2LineIndex) {
				h2LineIndex += 1
			}

			res.h2Line = meta?.headings?.at(h2LineIndex)?.position.end.line;
		} else {
			res.h2Line = meta?.headings?.filter(
				h => h.heading == res.h2
			).first()?.position.end.line;
		}
	}

	return res;
}

export function postProcessorUpdate(app: App) {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		// Actually of type MarkdownView, but casting to any because the TS types don't have previewMode.renderer or editor.cm... 
		const view = leaf.view as any;

		view.previewMode.renderer.clear();
		view.previewMode.renderer.set(view.editor.cm.state.doc.toString());
	}

	app.workspace.updateOptions();
}

export function findPatternForFilename(fileName: string, settings: LinkRangeSettings) : Pattern {
	const file = app.vault.getFiles().find((file) => file.basename === fileName);
	return findPatternForFile(file, settings);
}

function findPatternForFile(file: TFile | undefined, settings: LinkRangeSettings) : Pattern {
	if (file) {
		let pattern = [...settings.patterns].reverse().find((pattern: Pattern) =>
			file.path.startsWith(pattern.path)
		)
		if (pattern) return pattern;
	}

	return settings.getDefaultPattern();
}
