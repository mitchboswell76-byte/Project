/** Public portfolio copy. Only add credentials, links and work you can verify. */
export const content = {
  meta: {
    siteName: 'Mitch Boswell',
    nameLines: ['Mitch', 'Boswell', 'Portfolio'],
    logoText: 'MB',
    since: '2026',
    tagline: 'Politics. People. What comes next.',
    description: 'Politics and American Studies student at the University of Nottingham, interested in public policy, social mobility and AI governance.',
    soundNotice: 'Sound is optional. Start exploring in silence.',
    enterLabel: 'Explore in 3D',
    readLabel: 'Read the portfolio',
    discipline: 'Politics & American Studies',
    status: 'Looking ahead to 2027',
  },
  ui: {
    navLabel: 'Portfolio sections', viewLabel: 'View', soundLabel: 'Sound', zoomLabel: 'Zoom',
    zoomOut: '−', zoomIn: '+', on: 'On', off: 'Off', separator: '/',
    a11y: {
      logo: 'Return to the introduction', navItem: label => `Go to ${label}`,
      view3d: 'Switch to the 3D view', view2d: 'Switch to the reading view',
      soundOn: 'Turn sound on', soundOff: 'Turn sound off', zoomOut: 'Zoom out', zoomIn: 'Zoom in',
      skipToContent: 'Skip to the reading view', sectionAnnounce: label => `${label} section`,
    },
    doc: {
      intro: 'I study how political decisions shape everyday life — and how careful research can help us make better ones.',
      contactHeading: 'Keep in touch', philosophyHeading: 'How I approach a question',
      backToTop: 'Back to top ↑', cvLabel: 'Download CV (PDF)',
    },
  },
  sections: [
    {
      id: 'profile', number: '01', navLabel: 'Profile', markerLabel: 'PROFILE',
      voxelHeading: 'People & power', subLabel: 'University of Nottingham · Class of 2027',
      summary: 'Understanding the decisions that shape everyday life.',
      body: [
        'I’m a final-year Politics and American Studies student at the University of Nottingham. My interests sit where politics meets everyday life: work, opportunity, public institutions and the distribution of power.',
        'I enjoy taking a broad question, testing competing explanations and turning what I find into a clear argument. I’m working towards a career in policy, research or public affairs, with a particular interest in technology governance.',
      ],
      tags: ['Political analysis', 'Research', 'Clear communication'], district: 'plaza',
    },
    {
      id: 'research', number: '02', navLabel: 'Research', markerLabel: 'RESEARCH',
      voxelHeading: 'Open questions', subLabel: 'Class · Ideas · Political change',
      summary: 'Questions about opportunity, political change and the American experience.',
      body: [
        'My research interests centre on the American middle and working classes. I’m interested in how unions, public policy and regional politics shape social mobility — and why economic interests do not always translate into the political choices we might expect.',
        'For my dissertation, I’m exploring how Cold War competition may have influenced post-war US political economy. It is a developing question: the task is to establish what the evidence can support, and where other explanations carry more weight.',
      ],
      cards: [
        { label: 'Dissertation direction', title: 'Competition abroad. Reform at home?', text: 'How far did competition with the Soviet Union influence US domestic economic policy? A research direction in development, with the period and causal mechanism still to be narrowed.' },
        { label: 'Research interest', title: 'Class and conservatism', text: 'How do identity, region and economic change shape working-class support for conservative politics?' },
        { label: 'Research interest', title: 'Opportunity and institutions', text: 'What can the history of organised labour tell us about the conditions that support social mobility?' },
      ], district: 'harbour',
    },
    {
      id: 'experience', number: '03', navLabel: 'Experience', markerLabel: 'EXPERIENCE',
      voxelHeading: 'Ideas into practice', subLabel: 'Learning · Explaining · Building',
      summary: 'From AI governance discussions to one-to-one teaching.',
      body: [
        'In 2026 I completed the Nottingham AI Safety Initiative’s Introduction to AI Safety Fellowship, following the Frontier AI Governance stream. It gave me a setting to examine technology policy questions, assess arguments and discuss approaches to governing advanced AI.',
        'Alongside my studies, I have worked as a private tutor: planning lessons, explaining unfamiliar ideas and adapting to individual learners. This portfolio is another ongoing project — an experiment in making a personal website feel spatial, playful and easy to read.',
      ],
      cards: [
        { label: 'February–May 2026', title: 'AI governance fellowship', text: 'Nottingham AI Safety Initiative · Frontier AI Governance stream. Research, discussion and analysis of technology policy.' },
        { label: 'Self-employed', title: 'Private tutoring', text: 'One-to-one tuition, lesson planning and progress feedback. Practice in making an explanation work for the person in front of me.' },
        { label: 'Digital project', title: 'A portfolio in voxels', text: 'A scrolling 3D portfolio with a reading view, keyboard controls and a quiet, optional soundtrack.', link: { label: 'View the project on GitHub ↗', url: 'https://github.com/mitchboswell76-byte/Project' } },
      ], district: 'gardens',
    },
    {
      id: 'connect', number: '04', navLabel: 'Next', markerLabel: 'NEXT',
      voxelHeading: 'What comes next', subLabel: 'Policy · Research · Public affairs',
      summary: 'Looking for work where good questions lead to useful decisions.',
      body: [
        'I’m looking towards graduate opportunities for 2027 in public policy, research, public affairs and AI governance. I’m drawn to work that calls for careful judgement, clear writing and an interest in how institutions affect people.',
        'You can find my digital work on GitHub. This site will grow alongside my research and experience; for now, it is a snapshot of the questions I’m asking and the direction I’m taking.',
      ], district: 'snowfield',
    },
  ],
  philosophyItems: [
    { n: '1', text: 'Start with a question that can be answered.' },
    { n: '2', text: 'Take competing explanations seriously.' },
    { n: '3', text: 'Make the argument clear, including its limits.' },
  ],
  contact: {
    email: null,
    links: [{ label: 'Find me on GitHub ↗', url: 'https://github.com/mitchboswell76-byte' }],
    cvUrl: null,
  },
};
export default content;
