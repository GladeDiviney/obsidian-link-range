import { App, MarkdownRenderer, setIcon, TFile } from "obsidian";
import { LinkRangeSettings } from "./settings";
import { parseLink } from "./utils";

export async function replaceEmbed(embed: Node, settings: LinkRangeSettings) {
	let embedHtml = embed as HTMLElement

	const link = parseLink(app, embedHtml, settings, true, "src");
	if (link == undefined) {
		return;
	}
	const isLinkRange = link.h2 !== undefined;

	if (!isLinkRange) {
		if (link.pattern !== settings.getDefaultPattern()) {
			updateHeading(embedHtml, link.altText);
		}
		return;
	}

	const { vault } = app;

	updateHeading(embedHtml, link.altText);

	const contentDiv = embedHtml.querySelector('div.markdown-embed-content')
	if (contentDiv == null || !(contentDiv instanceof HTMLElement)) return;
	while (contentDiv.lastElementChild) {
		contentDiv.removeChild(contentDiv.lastElementChild)
	}
	contentDiv.childNodes.forEach(x => { x.remove() });

	const fileContent = await vault.cachedRead(link.file);
	let lines = fileContent.split("\n");
	lines = lines.slice(link.h1Line, link.h2Line);
	MarkdownRenderer.renderMarkdown(lines.join("\n"), contentDiv, "", null!)

	const linkDiv = embedHtml.querySelector('div.markdown-embed-link')
	if (linkDiv instanceof HTMLElement) {
		const newLink = linkDiv.cloneNode(true) as HTMLElement;
		linkDiv.replaceWith(newLink)
		newLink.onClickEvent((ev: MouseEvent) => {
			const leaf = app.workspace.getMostRecentLeaf();

			const startLoc = Object.assign({ line: 0, col: 0, offset: 0 }, 0);
			const endLoc = Object.assign({ line: 0, col: 0, offset: 0 }, 0);
			const { line, col } = startLoc;
			const state = {
				eState: {
					startLoc,
					endLoc,
					line,
					cursor: {
						from: { line, ch: 0 },
						to: { line, ch: 0 },
					},
				}
			};

			leaf?.openFile(link.file, state);
		})
	}
}

function updateHeading(
	elem: Element,
	title: string,
	observer: MutationObserver | undefined = undefined
) {
	const titleElem = elem.querySelector('.embed-title.markdown-embed-title');
	const firstHeading = elem.querySelector('H1,H2,H3,H4,H5,H6');
	if (titleElem != null && firstHeading != null) {
		titleElem.setText(title);
		firstHeading.parentNode?.removeChild(firstHeading)
		observer?.disconnect();
		return;
	}

	if (observer == undefined) {
		new MutationObserver((_, observer) => {
			updateHeading(elem, title, observer);
		}).observe(
			elem,
			{ attributes: false, childList: true, subtree: true }
		);
	}
}
