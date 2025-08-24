import { App, MarkdownPostProcessorContext } from "obsidian";
import { replaceEmbed } from "./embeds";
import { LinkRangeSettings } from "./settings";
import { parseLink } from "./utils";


export function linkRangePostProcessor(el: HTMLElement, settings: LinkRangeSettings): void {
	const links = el.querySelectorAll('a.internal-link');

	// Handle links
	links.forEach(link => {
		const htmlLink = link as HTMLElement
		const res = parseLink(app, htmlLink, settings);

		if (res !== null) {
			if (res.altText) {
				htmlLink.setText(res.altText)
			}
			htmlLink.setAttribute("href", res.note + "#" + res.h1);
			htmlLink.setAttribute("data-href", res.note + "#" + res.h1);
			htmlLink.setAttribute("range-href", res.note + "#" + res.h1 + settings.headingSeparator + res.h2);
		}
	});

	// Handle embeds
	const embeds = el.querySelectorAll('span.internal-embed');
	embeds.forEach(embed => {
		replaceEmbed(embed, settings)	
	});
}
