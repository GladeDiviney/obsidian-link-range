import { App, MarkdownRenderer, setIcon, TFile } from "obsidian";
import { LinkRangeSettings } from "./settings";
import { checkLink } from "./utils";

export async function replaceEmbed(app: App, embed: Node, settings: LinkRangeSettings, isMarkdownPost = false) {
	let embedHtml = embed as HTMLElement

	const res = checkLink(app, embedHtml, settings, true, "src");
	if (res == undefined) {
		return;
	}

	const isLinkRange = res !== null && res.h2 !== undefined;
	const file = res.file
	let title = res.altText;
	if (file == undefined || title == undefined) {
		return;
	}

	if (!isLinkRange) {
		if (res.pattern !== settings.getDefaultPattern()) {
			updateHeading(embedHtml, title);
		}
		return;
	}

	const { vault } = app;

	updateHeading(embedHtml, title);

	const contentDiv = embedHtml.querySelector('div.markdown-embed-content')
	if (contentDiv == null || !(contentDiv instanceof HTMLElement)) return;
	while (contentDiv.lastElementChild) {
		contentDiv.removeChild(contentDiv.lastElementChild)
	}
	contentDiv.childNodes.forEach(x => { x.remove() });

	const fileContent = await vault.cachedRead(file);
	let lines = fileContent.split("\n");
	lines = lines.slice(res.h1Line, res.h2Line);
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

			leaf?.openFile(file, state);
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
