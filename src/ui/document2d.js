/** Semantic reading view, built from the shared portfolio content. */
import { content } from '../content.js';
import { doc as cfg } from '../config.js';

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

  const article = el('article', 'doc__article');

  /* ---------------- header ---------------- */
  const header = el('header', 'doc__header');
  header.appendChild(el('p', 'doc__kicker', content.meta.discipline));
  header.appendChild(el('h1', 'doc__title', content.meta.siteName));
  header.appendChild(el('p', 'doc__tagline', content.meta.tagline));
  header.appendChild(el('p', 'doc__intro', ui.intro));
  header.appendChild(el('p', 'doc__status', content.meta.status));
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
    h2.appendChild(el('span', 'doc__heading-text', s.voxelHeading));
    sec.appendChild(h2);

    sec.appendChild(el('p', 'doc__sub', s.subLabel));
    s.body.forEach((para) => sec.appendChild(el('p', 'doc__body', para)));

    if (s.tags) {
      const tags = el('ul', 'doc__tags');
      s.tags.forEach(tag => tags.appendChild(el('li', null, tag)));
      sec.appendChild(tags);
    }
    if (s.cards) {
      const cards = el('div', 'doc__cards');
      s.cards.forEach(card => {
        const item = el('article', 'doc__card');
        item.appendChild(el('p', 'doc__card-label', card.label));
        item.appendChild(el('h3', 'doc__card-title', card.title));
        item.appendChild(el('p', 'doc__card-body', card.text));
        if (card.link) {
          const link = el('a', 'doc__card-link', card.link.label);
          link.href = card.link.url;
          item.appendChild(link);
        }
        cards.appendChild(item);
      });
      sec.appendChild(cards);
    }
    if (s.id === 'connect') {
      content.contact.links.forEach(link => {
        const a = el('a', 'doc__cta', link.label);
        a.href = link.url;
        sec.appendChild(a);
      });
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
  if (content.contact.email) {
  const mail = el('li');
  const mailA = el('a', null, content.contact.email);
  mailA.href = `mailto:${content.contact.email}`;
  mail.appendChild(mailA);
  list.appendChild(mail);
  }

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

  const footer = el('footer', 'doc__footer');
  footer.appendChild(el('span', null, 'Mitch Boswell / 2026'));
  const top = el('button', null, ui.backToTop);
  top.type = 'button';
  top.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    root.focus({ preventScroll: true });
  });
  footer.appendChild(top);
  article.appendChild(footer);
  root.tabIndex = -1;
  root.appendChild(article);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */

  return {
    element: root,

    show() {
      root.hidden = false;
    },

    hide() {
      root.hidden = true;
    },

    /** Scroll so section `i` sits at the top of the viewport. */
    scrollToSection(i, behaviour = cfg.SCROLL_BEHAVIOUR) {
      const target = sectionEls[Math.max(0, Math.min(sectionEls.length - 1, i))];
      if (!target) return;
      const offset = window.innerWidth < 900 ? 154 : 36;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: reduced() ? 'auto' : behaviour });
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
