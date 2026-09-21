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
    nameLines: ['Mitch', 'Boswell', 'Portfolio'],
    logoText: 'MB',
    since: '2026',
    tagline: '[ONE SHORT LINE ABOUT WHAT YOU DO]',
    soundNotice: 'Sound plays on this site.',
    enterLabel: 'Enter',
  },

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
