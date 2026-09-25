import { defineConfig } from 'vite';

import { content } from './src/content.js';
import { palette, hex } from './src/config.js';
import { makeOgImage } from './tools/make-og.mjs';

/* ------------------------------------------------------------------ */
/* Static rendering of the head and the document                       */
/* ------------------------------------------------------------------ */
/**
 * Everything the site says lives in src/content.js, which is a module — so
 * without this plugin the built page's <title>, its description and its whole
 * text only exist once JavaScript has run. A crawler, a link preview card and
 * a visitor with JavaScript off would all get an empty page.
 *
 * So the same content is rendered into index.html at build time:
 *   - the title, description, canonical link, Open Graph / Twitter tags and
 *     a schema.org Person block, in place of the <!--seo--> marker;
 *   - the reading view as real HTML, in place of the <!--doc--> marker.
 *
 * document2d.js empties that element and rebuilds it on load, so the runtime
 * document is unchanged and there is no second copy of the markup to keep in
 * step — the static version is the same content, one level plainer (no pixel
 * headings, since those are canvases).
 */

const escape = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** An absolute URL for `path` against meta.siteUrl, or '' if that is unset. */
const absolute = (path = '') => {
  const base = content.meta.siteUrl;
  if (!base) return '';
  return base.replace(/\/+$/, '/') + String(path).replace(/^\/+/, '');
};

function headTags() {
  const { meta } = content;
  const title = meta.tagline ? `${meta.siteName} — ${meta.tagline}` : meta.siteName;
  /* The description is the site's own intro line rather than a second piece
   * of copy written into the build: one source, in content.js. */
  const description = `${meta.tagline} ${content.ui.doc.intro}`.trim();
  const url = absolute('');
  const image = absolute('og.png');

  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<meta name="theme-color" content="${hex(palette.background)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escape(meta.siteName)}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];

  if (url) {
    tags.push(
      `<link rel="canonical" href="${escape(url)}" />`,
      `<meta property="og:url" content="${escape(url)}" />`,
      `<meta property="og:image" content="${escape(image)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:image" content="${escape(image)}" />`
    );
  }

  /* Structured data, so a search engine can tell that this is a person and
   * not a product. Only the fields that are actually known are emitted. */
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: meta.siteName,
    description: meta.tagline,
    ...(url ? { url } : {}),
    ...(content.contact.email.includes('@') ? { email: content.contact.email } : {}),
    ...(content.contact.links.some((l) => l.url.startsWith('http'))
      ? { sameAs: content.contact.links.filter((l) => l.url.startsWith('http')).map((l) => l.url) }
      : {}),
  };
  tags.push(
    `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>`
  );

  return tags.join('\n    ');
}

function documentMarkup() {
  const ui = content.ui.doc;
  const parts = [];

  parts.push('<article class="doc__article">');
  parts.push(
    '<header class="doc__header">',
    `<h1 class="doc__title">${escape(content.meta.siteName)}</h1>`,
    `<p class="doc__tagline">${escape(content.meta.tagline)}</p>`,
    `<p class="doc__intro">${escape(ui.intro)}</p>`,
    '</header>'
  );

  for (const s of content.sections) {
    parts.push(
      `<section class="doc__section" id="doc-${escape(s.id)}" aria-labelledby="doc-${escape(s.id)}-h">`,
      `<p class="doc__eyebrow">${escape(`${s.number} — ${s.navLabel}`)}</p>`,
      `<h2 class="doc__heading doc__heading--plain" id="doc-${escape(s.id)}-h">${escape(s.voxelHeading)}</h2>`,
      `<p class="doc__sub">${escape(s.subLabel)}</p>`,
      ...s.body.map((p) => `<p class="doc__body">${escape(p)}</p>`)
    );
    if (s.items?.length) {
      parts.push('<ul class="doc__items">');
      for (const item of s.items) {
        const title = item.url
          ? `<a href="${escape(item.url)}" rel="noopener noreferrer">${escape(item.title)}</a>`
          : escape(item.title);
        parts.push(
          '<li class="doc__item">',
          `<p class="doc__item-title">${title}</p>`,
          item.meta ? `<p class="doc__item-meta">${escape(item.meta)}</p>` : '',
          item.text ? `<p class="doc__item-text">${escape(item.text)}</p>` : '',
          '</li>'
        );
      }
      parts.push('</ul>');
    }
    parts.push('</section>');
  }

  if (content.philosophyItems.length) {
    parts.push(
      '<section class="doc__section doc__section--list">',
      `<h2 class="doc__heading doc__heading--plain">${escape(ui.philosophyHeading)}</h2>`,
      '<ol class="doc__principles">',
      ...content.philosophyItems.map((i) => `<li>${escape(i.text)}</li>`),
      '</ol>',
      '</section>'
    );
  }

  const links = [
    `<li><a href="mailto:${escape(content.contact.email)}">${escape(content.contact.email)}</a></li>`,
    ...content.contact.links.map(
      (l) => `<li><a href="${escape(l.url)}" rel="noopener noreferrer">${escape(l.label)}</a></li>`
    ),
  ];
  if (content.contact.cvUrl) {
    links.push(`<li><a href="${escape(content.contact.cvUrl)}">${escape(ui.cvLabel)}</a></li>`);
  }
  parts.push(
    '<section class="doc__section doc__section--list">',
    `<h2 class="doc__heading doc__heading--plain">${escape(ui.contactHeading)}</h2>`,
    `<ul class="doc__links">${links.join('')}</ul>`,
    '</section>',
    '</article>'
  );

  return parts.filter(Boolean).join('\n      ');
}

function staticContent() {
  return {
    name: 'site-static-content',
    transformIndexHtml(html) {
      return html.replace('<!--seo-->', headTags()).replace('<!--doc-->', documentMarkup());
    },
    generateBundle() {
      // The social card, drawn from the same palette and font as the site.
      this.emitFile({ type: 'asset', fileName: 'og.png', source: makeOgImage() });
    },
  };
}

export default defineConfig({
  // Relative base so the built site works from a subdirectory or from file://
  base: './',
  plugins: [staticContent()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0, // keep the audio files as real files, not data URIs
    rollupOptions: {
      output: {
        // Split three out so the app code can be re-cached on its own.
        manualChunks: { three: ['three'], gsap: ['gsap'] },
      },
    },
  },
});
