/**
 * content.js — ALL of the site's text lives here and nowhere else.
 *
 * Everything in [SQUARE BRACKETS] is placeholder copy at roughly the right
 * length. Search for "[" to find every spot that still needs your words.
 * You can edit any string in this file without touching application logic.
 *
 * To add or remove a section, add or remove an entry in `sections` AND add
 * or remove a matching anchor in `world.SECTION_ANCHORS` in config.js.
 */

export const content = {
  meta: {
    siteName: 'Mitch Boswell',
    /* The address this site is served from, with a trailing slash. Used for
     * the canonical link and the social-card tags, which have to be absolute
     * URLs — a card with a relative image is a card with no image. Set it to
     * '' to leave those tags out entirely (they would be wrong, not missing,
     * if this were left pointing somewhere else). */
    siteUrl: 'https://mitchboswell76-byte.github.io/project/',
    nameLines: ['Mitch', 'Boswell', 'Portfolio'],
    logoText: 'MB',
    since: '2026',
    tagline: '[ONE SHORT LINE ABOUT WHAT YOU DO]',
    soundNotice: 'Sound plays on this site.',
    enterLabel: 'Enter',
    /* The way past the gate for anyone who would rather read than travel,
     * and for anyone whose machine is taking too long to build the world. */
    readInsteadLabel: 'Read it as a document instead',
    /* Shown once, briefly, after the Enter transition hands over. Nothing on
     * screen otherwise says that the page scroll is what moves the camera. */
    scrollHint: 'Scroll to travel',
  },

  /* ------------------------------------------------------------------ */
  /* UI CHROME — the persistent overlay and 2D document.                  */
  /* Every visible word of interface text is here too, so the whole site  */
  /* can be re-worded (or translated) without opening a module.           */
  /* ------------------------------------------------------------------ */
  ui: {
    navLabel: 'Sections',           // aria-label on the <nav>
    viewLabel: 'View :',
    soundLabel: 'Sound :',
    zoomLabel: 'Zoom :',
    keysLabel: 'Keys :',
    /* Shown under the controls, and the only place the shortcuts are
     * documented. Keep it in step with the handler in main.js. */
    keysHint: '\u2191\u2193 section \u00b7 +\u2013 zoom \u00b7 Esc read',
    zoomOut: '\u2013', // en dash, reads better than a hyphen at this size
    zoomIn: '+',
    on: 'On',
    off: 'Off',
    separator: '/',

    /* Accessible names for the controls. Kept separate from the visible
     * labels above because a screen reader needs the whole sentence. */
    a11y: {
      logo: 'Home',
      navItem: (label) => `Go to ${label}`,
      view3d: 'Switch to the 3D world',
      view2d: 'Switch to the reading view',
      soundOn: 'Turn sound on',
      soundOff: 'Turn sound off',
      zoomOut: 'Zoom out',
      zoomIn: 'Zoom in',
      skipToContent: 'Skip to the text of this site',
      progress: 'Position on the route',
      sectionAnnounce: (label) => `${label} section`,
    },

    /* 2D reading view. */
    doc: {
      intro:
        'The reading view. The same content as the 3D world, as a plain document you can select, search, print and read with a screen reader.',
      contactHeading: 'Contact',
      philosophyHeading: 'Principles',
      backToTop: 'Back to top',
      cvLabel: 'Curriculum vitae (PDF)',
    },
  },

  /* Each section may also carry `items`: the individual pieces of work,
   * writing or study behind it. They are rendered as a list in the reading
   * view (and are what a reader actually scans for), and left out of the 3D
   * world, which stays at the level of a heading and two paragraphs.
   *
   * Shape — every field except `title` is optional:
   *   { title: 'Dissertation title',
   *     meta:  'Final year \u00b7 2026',
   *     url:   'https://example.com/the-thing',
   *     text:  'One sentence on what it was and what came of it.' }
   */
  sections: [
    {
      id: 'profile',
      number: '01',
      navLabel: 'Profile',
      markerLabel: 'PROFILE',
      voxelHeading: '[HEADING ONE]',
      subLabel: '[SUB-LABEL ONE]',
      body: [
        '[PARAGRAPH 1 — about forty words of your own copy goes here. Introduce who you are and what you are working towards, in plain sentences. This placeholder is deliberately the length of a real paragraph so the ground text plane is sized correctly.]',
        '[PARAGRAPH 2 — a second paragraph of similar length. Use it for the detail that supports the first: what you study, what you are good at, and what you want to do next. Replace all of this text.]',
      ],
      items: [],
      district: 'plaza',
    },
    {
      id: 'projects',
      number: '02',
      navLabel: 'Projects',
      markerLabel: 'PROJECTS',
      voxelHeading: '[HEADING TWO]',
      subLabel: '[SUB-LABEL TWO]',
      body: [
        '[PARAGRAPH 1 — describe the work itself. What you built or researched, what your role was, and what came out of it. Concrete detail reads better here than adjectives, and this placeholder matches the length of a paragraph that works.]',
        '[PARAGRAPH 2 — a second project, or the outcome of the first. If you have numbers, use them. Replace all of this text with your own copy.]',
      ],
      items: [],
      district: 'harbour',
    },
    {
      id: 'writing',
      number: '03',
      navLabel: 'Writing',
      markerLabel: 'WRITING',
      voxelHeading: '[HEADING THREE]',
      subLabel: '[SUB-LABEL THREE]',
      body: [
        '[PARAGRAPH 1 — what you write about and why. Name the subjects, the arguments you are interested in, and anything published or assessed. This placeholder runs to about the length of a paragraph that sits well on the ground plane.]',
        '[PARAGRAPH 2 — a second paragraph, perhaps on method or the questions you keep returning to. Replace all of this text with your own copy.]',
      ],
      items: [],
      district: 'gardens',
    },
    {
      id: 'about',
      number: '04',
      navLabel: 'About',
      markerLabel: 'ABOUT',
      voxelHeading: '[HEADING FOUR]',
      subLabel: '[SUB-LABEL FOUR]',
      body: [
        '[PARAGRAPH 1 — the closing note. Where you are, what you are looking for, and how someone should get in touch. Keep it short and specific. This placeholder is about the length of a paragraph that reads well at the end of the route.]',
        '[PARAGRAPH 2 — optional second paragraph, or delete this line entirely and the layout will close up on its own.]',
      ],
      items: [],
      district: 'snowfield',
    },
  ],

  /* Optional numbered-principle block. Rendered as flat ground text at the
   * end of the route, and as a numbered list in 2D mode.
   * Set to an empty array [] to remove it entirely. */
  philosophyItems: [
    { n: '1', text: '[PRINCIPLE ONE — a single line you actually believe about your work.]' },
    { n: '2', text: '[PRINCIPLE TWO — another single line, similar length to the first.]' },
    { n: '3', text: '[PRINCIPLE THREE — a third line. Add or remove entries freely.]' },
  ],

  contact: {
    email: '[YOU@EXAMPLE.COM]',
    links: [
      { label: '[LinkedIn]', url: '[https://www.linkedin.com/in/your-handle]' },
      { label: '[GitHub]', url: '[https://github.com/your-handle]' },
    ],
    /* Put a PDF at public/cv.pdf and set this to "/cv.pdf", or leave null
     * and the CV link will not be rendered at all. */
    cvUrl: null,
  },
};

export default content;
