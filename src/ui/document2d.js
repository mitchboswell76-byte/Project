/**
 * document2d.js — 2D mode: the same content as a genuine document.
 *
 * This is not a screenshot of the 3D world and not a stripped-down summary.
 * It is the site's content as semantic HTML: one `<h1>`, `<h2>` per section
 * in source order, real paragraphs you can select, search, print, translate
 * and read with a screen reader, and real links.
 *
 * It is built from the same `content.js` as the world, so the two can never
 * say different things, and it does not import Three.js — 2D mode has to
 * work with WebGL switched off entirely.
 *
 * In 3D mode it is not removed from the page but moved OFFSTAGE: clipped to
 * a single pixel, out of the tab order, and still in the accessibility tree.
 * `hidden` would take the site's entire text away from a screen reader and
 * from find-in-page for anyone who has not found the View control — the world
 * is a way of presenting the content, not a reason to withhold it.
 *
 * The headings are drawn with the same 5x7 bitmap font as the wordmark and
 * the voxel headings, as an image inside the `<h2>`. The heading's real text
 * sits next to it in the accessibility tree, so the document outline is
 * correct even though the visible heading is a pixel image; the section
 * number and label above it are ordinary selectable text.
 */

import { content } from '../content.js';
import { doc as cfg, hex, palette } from '../config.js';
import { rasteriseLine, toCoords } from '../world/bitmapFont.js';
import { applyDotGridCss } from './dotGrid.js';

/* ------------------------------------------------------------------ */
/* Bitmap-font heading → data URI                                      */
/* ------------------------------------------------------------------ */

function pixelHeadingImg(text) {
  const grid = rasteriseLine(text, 1);
  const coords = toCoords(grid);
  const step = cfg.HEADING_PIXEL_PX + cfg.HEADING_GAP_PX;
  const w = Math.max(1, grid.width * step - cfg.HEADING_GAP_PX);
  const h = grid.height * step - cfg.HEADING_GAP_PX;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = hex(palette.ink);
  for (const p of coords) {
    ctx.fillRect(p.x * step, p.y * step, cfg.HEADING_PIXEL_PX, cfg.HEADING_PIXEL_PX);
  }

  const img = document.createElement('img');
  img.src = c.toDataURL('image/png');
  img.alt = ''; // the real text is in the sibling span
  img.setAttribute('aria-hidden', 'true');
  img.className = 'doc__pixels';
  img.style.maxWidth = `${w}px`;
  return img;
}

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
};

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

export function createDocument2d() {
  const root = document.getElementById('doc');
  const ui = content.ui.doc;

  root.innerHTML = '';
  /* Focusable so the skip link has somewhere to land, but not in the tab
   * order itself. */
  root.tabIndex = -1;
  applyDotGridCss(root, cfg.DOT_SPACING_PX, cfg.DOT_SIZE_PX);

  const article = el('article', 'doc__article');

  /* ---------------- header ---------------- */
  const header = el('header', 'doc__header');
  header.appendChild(el('h1', 'doc__title', content.meta.siteName));
  header.appendChild(el('p', 'doc__tagline', content.meta.tagline));
  header.appendChild(el('p', 'doc__intro', ui.intro));
  article.appendChild(header);

  /* ---------------- sections ---------------- */
  const sectionEls = [];

  content.sections.forEach((s) => {
    const sec = el('section', 'doc__section');
    sec.id = `doc-${s.id}`;
    sec.setAttribute('aria-labelledby', `doc-${s.id}-h`);

    sec.appendChild(el('p', 'doc__eyebrow', `${s.number} — ${s.navLabel}`));

    const h2 = el('h2', 'doc__heading');
    h2.id = `doc-${s.id}-h`;
    h2.appendChild(pixelHeadingImg(s.voxelHeading));
    h2.appendChild(el('span', 'visually-hidden', s.voxelHeading));
    sec.appendChild(h2);

    sec.appendChild(el('p', 'doc__sub', s.subLabel));
    s.body.forEach((para) => sec.appendChild(el('p', 'doc__body', para)));

    /* The individual pieces of work behind the section, if there are any.
     * They exist in the reading view only: the 3D world stays at the level of
     * a heading and two paragraphs, which is as much as flat ground text can
     * carry legibly. */
    if (s.items?.length) {
      const list = el('ul', 'doc__items');
      s.items.forEach((item) => {
        const li = el('li', 'doc__item');
        const title = el('p', 'doc__item-title');
        if (item.url) {
          const a = el('a', null, item.title);
          a.href = item.url;
          a.rel = 'noopener noreferrer';
          title.appendChild(a);
        } else {
          title.textContent = item.title;
        }
        li.appendChild(title);
        if (item.meta) li.appendChild(el('p', 'doc__item-meta', item.meta));
        if (item.text) li.appendChild(el('p', 'doc__item-text', item.text));
        list.appendChild(li);
      });
      sec.appendChild(list);
    }

    article.appendChild(sec);
    sectionEls.push(sec);
  });

  /* ---------------- principles ---------------- */
  if (content.philosophyItems.length) {
    const sec = el('section', 'doc__section doc__section--list');
    sec.appendChild(el('h2', 'doc__heading doc__heading--plain', ui.philosophyHeading));
    const ol = el('ol', 'doc__principles');
    content.philosophyItems.forEach((item) => ol.appendChild(el('li', null, item.text)));
    sec.appendChild(ol);
    article.appendChild(sec);
  }

  /* ---------------- contact ---------------- */
  const contact = el('section', 'doc__section doc__section--list');
  contact.appendChild(el('h2', 'doc__heading doc__heading--plain', ui.contactHeading));

  const list = el('ul', 'doc__links');
  const mail = el('li');
  const mailA = el('a', null, content.contact.email);
  mailA.href = `mailto:${content.contact.email}`;
  mail.appendChild(mailA);
  list.appendChild(mail);

  content.contact.links.forEach((l) => {
    const li = el('li');
    const a = el('a', null, l.label);
    a.href = l.url;
    a.rel = 'noopener noreferrer';
    li.appendChild(a);
    list.appendChild(li);
  });

  if (content.contact.cvUrl) {
    const li = el('li');
    const a = el('a', null, ui.cvLabel);
    a.href = content.contact.cvUrl;
    li.appendChild(a);
    list.appendChild(li);
  }

  contact.appendChild(list);
  article.appendChild(contact);

  root.appendChild(article);

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Offstage is not hidden. The document keeps its place in the accessibility
   * tree in 3D mode so the site's text can still be read and searched, but
   * its links leave the tab order — an invisible focus ring stepping through
   * a clipped document is worse than no focus stop at all.
   */
  function setOffstage(offstage) {
    root.classList.toggle('doc--offstage', offstage);
    root.querySelectorAll('a').forEach((a) => {
      if (offstage) a.setAttribute('tabindex', '-1');
      else a.removeAttribute('tabindex');
    });
  }

  root.hidden = false;

  return {
    element: root,

    show() {
      setOffstage(false);
    },

    hide() {
      setOffstage(true);
    },

    /** Scroll so section `i` sits at the top of the viewport. */
    scrollToSection(i, behaviour = cfg.SCROLL_BEHAVIOUR) {
      const target = sectionEls[Math.max(0, Math.min(sectionEls.length - 1, i))];
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: behaviour });
    },

    /**
     * Which section the reader is currently looking at — the last one whose
     * top has passed the upper third of the viewport. Used to carry the
     * reading position back into the 3D world.
     */
    currentSection() {
      const line = window.innerHeight / 3;
      let index = 0;
      sectionEls.forEach((sec, i) => {
        if (sec.getBoundingClientRect().top <= line) index = i;
      });
      return index;
    },
  };
}
