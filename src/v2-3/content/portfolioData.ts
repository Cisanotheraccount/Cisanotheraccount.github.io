/**
 * Public copy distilled from the content library's project.md files.
 * Selection follows the user-approved ten-project plan of 2026-09-16.
 * M box remains in this source catalog for restoration, outside public lists.
 * Source records and web-export provenance: public/portfolio/asset-sources.json.
 * Unknown dates and individual responsibilities are deliberately omitted.
 */
export interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  image: string;
  imageSmall: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  imageFit?: 'cover' | 'contain';
  gallery?: { image: string; alt: string; caption: string }[];
  tags: string[];
  overview: string[];
  highlights: { title: string; body: string }[];
  externalLinks: { label: string; url: string }[];
  video?: { provider: 'youtube'; id: string; title: string };
  role?: string;
  period?: string;
  liveDemo?: {
    status: 'not-connected';
    label: string;
    description: string;
  };
}

export const portfolioProjects: PortfolioProject[] = [
  {
    id: 'P04',
    slug: 'hypnos-cockpit',
    title: 'Hýpnos Cockpit',
    category: 'AI-assisted cabin concept',
    summary: 'Designing an adaptive rest experience around AI and biometric sensing.',
    image: '/portfolio/hypnos-cockpit-1600.webp',
    imageSmall: '/portfolio/hypnos-cockpit-800.webp',
    imageAlt: 'Hýpnos Cockpit concept showing a wide dashboard interface and steering wheel inside a vehicle.',
    imageWidth: 1600,
    imageHeight: 1035,
    tags: ['Human–AI interaction', 'Automotive UI', 'Biometric sensing concept'],
    overview: [
      'Hýpnos Cockpit is an AI-assisted cabin concept that explores how biometric sensing and adaptive controls could support rest inside a vehicle. The design connects privacy, environmental controls, and a staged sleep-to-wake interface.',
      'The concept follows the journey from preparing the cabin to waking up. Storyboards and interface studies connect seating, temperature, lighting, notifications, and a post-rest summary.',
    ],
    highlights: [
      {
        title: 'A journey into rest',
        body: 'A sequence of arrival, preparation, rest, and waking brings the cabin and its interfaces into one experience.',
      },
      {
        title: 'The cabin as an interface',
        body: 'Seat position, privacy, light, and temperature are considered alongside the screen interactions.',
      },
      {
        title: 'Making the concept tangible',
        body: 'The archived work uses storyboards and presentation-based testing. VR and full-scale prototypes are documented as later plans.',
      },
    ],
    externalLinks: [
      { label: 'Original project', url: 'https://www.galaxci.com/hyacutepnos-cockpit.html' },
    ],
  },
  {
    id: 'P01',
    slug: 'psytrain',
    title: 'PsytrAIn',
    category: 'AI avatar · VR concept',
    summary: 'Exploring counseling practice with an AI avatar in virtual reality.',
    image: '/portfolio/psytrain-1600.webp',
    imageSmall: '/portfolio/psytrain-800.webp',
    imageAlt: 'PsytrAIn virtual training scene with a digital character seated on a gray sofa.',
    imageWidth: 1600,
    imageHeight: 1035,
    tags: ['Conversational AI', 'Virtual reality', 'Spatial UI'],
    overview: [
      'PsytrAIn is a VR counseling-training concept built around an AI avatar, emotional cues, and a spatial practice interface.',
      'The archived concept brings together training selection, conversation, help, and a results interface. It examines how emotional states can be expressed through the avatar’s face during practice.',
    ],
    highlights: [
      {
        title: 'Practice in context',
        body: 'A virtual setting places the conversation and its participant within an immersive training environment.',
      },
      {
        title: 'Reading emotional cues',
        body: 'The design material maps emotions to facial expressions as part of the conversational experience.',
      },
      {
        title: 'A guided training flow',
        body: 'Interface studies cover selecting a session, asking for help, ending practice, and reviewing the result.',
      },
    ],
    externalLinks: [
      { label: 'Original project', url: 'https://www.galaxci.com/psytrain.html' },
    ],
  },
  {
    id: 'P19',
    slug: 'introme',
    title: 'IntroMe',
    category: 'Generative video · AI avatar',
    summary: 'A conversational portfolio built around a generative video avatar.',
    image: '/portfolio/introme-1600.webp',
    imageSmall: '/portfolio/introme-800.webp',
    imageAlt: 'Portrait of Ci Song in a light blue hoodie, used in the IntroMe personal avatar presentation.',
    imageWidth: 1600,
    imageHeight: 1114,
    tags: ['Generative video', 'AI voice', 'Conversation design'],
    role: 'Independent project',
    period: 'Sep 2025 — Jan 2026',
    overview: [
      'IntroMe explores generative video and conversational AI through a personal avatar made with HeyGen. My recorded appearance, voice direction and project knowledge shape a digital guide that introduces my work and responds to visitors’ questions.',
      'I developed the project independently, from its interaction question through avatar experiments, capture planning, knowledge and voice direction, response boundaries, and integration with my existing website.',
    ],
    highlights: [
      {
        title: 'Appearance, knowledge, voice',
        body: 'I organized the avatar around a recognizable likeness, useful project knowledge, and a considered speaking pace, energy, and accent.',
      },
      {
        title: 'Designing the limits',
        body: 'I wrote boundaries for personal information and questions outside the avatar’s knowledge, including instructions to avoid fabricated personal experiences.',
      },
      {
        title: 'From experiment to portfolio',
        body: 'After exploring several character and capture workflows, I embedded a HeyGen avatar in my Weebly portfolio. Its integration is preserved in the project archive.',
      },
    ],
    externalLinks: [
      { label: 'Project presentation', url: 'https://www.figma.com/slides/GnJdSjlL0zpi8B0KcNYiLZ' },
      { label: 'Process presentation', url: 'https://www.figma.com/slides/vOWzA3GGuLCJADZCRYzblI' },
    ],
    liveDemo: {
      status: 'not-connected',
      label: 'Live experience coming soon',
      description: 'The avatar is not connected to this preview yet. You can explore the project materials while the live experience is prepared.',
    },
  },
  {
    "id": "P02",
    "slug": "deal-points",
    "title": "Deal Points",
    "category": "Travel rewards experience",
    "summary": "Making travel rewards easier to understand.",
    "image": "/portfolio/deal-points-1100.webp",
    "imageSmall": "/portfolio/deal-points-800.webp",
    "imageAlt": "Deal Points concept presentation with travel search and rewards comparison screens.",
    "imageWidth": 1100,
    "imageHeight": 712,
    "imageFit": "contain",
    "tags": [
      "Product design",
      "Travel experience",
      "UI/UX"
    ],
    "overview": [
      "Deal Points is a platform concept for exploring travel rewards, comparing cash and points, and understanding redemption value.",
      "The design materials connect an introductory experience with flight search, cabin information, redemption guidance, and a wallet. Hotel maps and price-history views extend the concept across travel planning."
    ],
    "highlights": [
      {
        "title": "A clearer starting point",
        "body": "Experience selection and introductory guidance help frame the travel-rewards journey."
      },
      {
        "title": "Comparing the options",
        "body": "Cash-and-points comparisons bring different booking choices into the same decision flow."
      },
      {
        "title": "From search to redemption",
        "body": "Interface studies connect discovery, trip details, and the steps involved in using rewards."
      }
    ],
    "externalLinks": [
      {
        "label": "Original project",
        "url": "https://www.galaxci.com/deal-points.html"
      }
    ]
  },
  {
    "id": "P03",
    "slug": "orbit",
    "title": "Orbit",
    "category": "Physical AI · Wearable concept",
    "summary": "Exploring computer vision and spatial memory in a wearable AI assistant.",
    "image": "/portfolio/orbit-1100.webp",
    "imageSmall": "/portfolio/orbit-800.webp",
    "imageAlt": "Orbit wearable memory-assistant concept, showing a silver necklace device and its design description.",
    "imageWidth": 1100,
    "imageHeight": 712,
    "imageFit": "contain",
    "tags": [
      "Physical AI",
      "Computer vision concept",
      "Wearable design"
    ],
    "overview": [
      "Orbit is a physical AI concept for a wearable memory assistant. It proposes using computer vision and spatial mapping to help people recall where they left everyday objects.",
      "The concept brings together a wearable form and a memory-retrieval experience. The archived proposal identifies object recognition, spatial mapping, and AI feasibility validation as next steps."
    ],
    "highlights": [
      {
        "title": "An everyday memory question",
        "body": "The experience starts with remembering where a familiar object was placed."
      },
      {
        "title": "Wearable and spatial",
        "body": "The proposed necklace form connects a physical object with an interface for revisiting locations."
      },
      {
        "title": "Defining the next experiment",
        "body": "The proposal separates its experience concept from the recognition and mapping capabilities that still need validation."
      }
    ],
    "externalLinks": [
      {
        "label": "Original project",
        "url": "https://www.galaxci.com/orbit.html"
      }
    ]
  },
  {
    "id": "P13",
    "slug": "m-box",
    "title": "M box",
    "category": "Music & personal memory",
    "summary": "Revisiting the moments connected to a song.",
    "image": "/portfolio/m-box-1100.webp",
    "imageSmall": "/portfolio/m-box-800.webp",
    "imageAlt": "M box high-fidelity music app screens showing search, browsing and a personal memory timeline.",
    "imageWidth": 1100,
    "imageHeight": 500,
    "imageFit": "contain",
    "tags": [
      "Product design",
      "Music experience",
      "Mobile UI"
    ],
    "overview": [
      "M box is a music-listening concept that connects songs with personal memories. Research and interview material inform a proposal for context-based playlists and a timeline for revisiting them.",
      "User flows, journey maps, and low- and high-fidelity screens explore browsing memories, searching for music, and adding descriptions to playlists."
    ],
    "highlights": [
      {
        "title": "Music with a personal context",
        "body": "Songs and playlists become entry points into memories and the situations connected to them."
      },
      {
        "title": "A timeline to revisit",
        "body": "The interface explores a visual timeline for finding past listening moments."
      },
      {
        "title": "From flow to interface",
        "body": "Journey maps and interface studies develop the concept from navigation structure to high-fidelity screens."
      }
    ],
    "externalLinks": [
      {
        "label": "Original project",
        "url": "https://www.galaxci.com/m-box.html"
      }
    ]
  },
  {
    "id": "P20",
    "slug": "shotflow",
    "title": "ShotFlow",
    "category": "On-device AI · Filmmaking",
    "summary": "Turning reference footage into a shot list with on-device deep learning.",
    "image": "/portfolio/shotflow-en-workspace-1290.webp",
    "imageSmall": "/portfolio/shotflow-en-workspace-800.webp",
    "imageAlt": "ShotFlow English native interface showing a project workspace, storyboard actions and shooting progress.",
    "imageWidth": 1290,
    "imageHeight": 2796,
    "imageFit": "contain",
    "tags": [
      "Pretrained TransNet V2",
      "Core ML",
      "iOS product"
    ],
    "overview": [
      "ShotFlow uses a pretrained TransNet V2 deep learning model, converted to Core ML, to detect shot boundaries locally on iPhone. It turns reference footage into individual shots that users can review, refine and bring into a shooting plan.",
      "The product centers on using a phone to review and organize references while working with professional cameras. Development materials document local video analysis, source-based shot grouping, shot editing, and an on-set checklist. The project is in active development."
    ],
    "highlights": [
      {
        "title": "From pretrained model to product",
        "body": "A local Core ML integration connects TransNet V2 boundary detection with source timestamps, a reviewable shot list and an on-set workflow."
      },
      {
        "title": "Review shot by shot",
        "body": "Source-based grouping, reference clips, and shot editing support preparation before a shoot."
      },
      {
        "title": "Bring the plan on set",
        "body": "A checklist connects reference shots with shooting progress while the phone serves as a companion to the camera."
      }
    ],
    "gallery": [
      {
        "image": "/portfolio/shotflow-en-workspace-1290.webp",
        "alt": "ShotFlow English project workspace with storyboard review and an on-set checklist.",
        "caption": "English native interface: project workspace and on-set workflow. Captured from the development app with demonstration data."
      },
      {
        "image": "/portfolio/shotflow-en-storyboard-1290.webp",
        "alt": "ShotFlow English native storyboard showing reference shots grouped by source video with timing and completion status.",
        "caption": "English native interface: shots grouped by source video. Demonstration data; the reference videos are not attached to this screenshot fixture."
      }
    ],
    "externalLinks": []
  },
  {
    id: 'P08',
    slug: 'cyber-city',
    video: { provider: 'youtube', id: 'ZXkFvkEzTj0', title: 'Restart' },
    title: 'Cyber City',
    category: '3D environment & moving image',
    summary: 'A virtual city built in Maya.',
    image: '/portfolio/cyber-city-1100.webp',
    imageSmall: '/portfolio/cyber-city-800.webp',
    imageAlt: 'A narrow virtual city street lit by cyan and magenta signs, with reflections on a dark roadway.',
    imageWidth: 1100,
    imageHeight: 619,
    imageFit: 'contain',
    tags: ['3D environment', 'Maya', 'Moving image'],
    overview: [
      'Cyber City is a virtual city built in Maya and presented through moving image. Neon signs, dense building facades, and reflections define the street-level environment.',
      'The project video is titled Restart. The still shown here is the original portfolio cover.',
    ],
    highlights: [
      { title: 'A city at street level', body: 'A narrow view between buildings brings the city’s illuminated surfaces and close-set architecture into focus.' },
      { title: 'Environment in motion', body: 'The video presents the virtual city as a moving-image work.' },
    ],
    externalLinks: [
      { label: 'Watch Restart', url: 'https://www.youtube.com/watch?v=ZXkFvkEzTj0' },
    ],
  },
  {
    id: 'P09',
    slug: 'crystal-city',
    video: { provider: 'youtube', id: 'XHEck7ViX74', title: 'Crystal City' },
    title: 'Crystal City',
    category: 'Light, space & moving image',
    summary: 'An imagined city between transparency and light.',
    image: '/portfolio/crystal-city-1600.webp',
    imageSmall: '/portfolio/crystal-city-800.webp',
    imageAlt: 'Crystal City at sunset, with dense dark towers and fine orange lines illuminating the city’s structure.',
    imageWidth: 1600,
    imageHeight: 900,
    imageFit: 'contain',
    tags: ['3D environment', 'Light and space', 'Moving image'],
    overview: [
      'Crystal City is a 3D city study that shifts between transparent daylight and illuminated night. It explores contrasting ideas of an ideal urban environment through a cityscape that is both recognizable and surreal.',
      'Light and shadow shape the city’s atmosphere. Clear structures and ordered lines give way to glowing buildings and a more vibrant nocturnal world, asking what kind of environment we want to inhabit.',
    ],
    highlights: [
      { title: 'Two states of one city', body: 'Daylight reveals the city’s transparency and structure; night transforms those same forms through illumination.' },
      { title: 'Light as an environment', body: 'Changing light defines the emotional quality of the space as well as its appearance.' },
      { title: 'An imagined urban world', body: 'The work considers different possibilities for an ideal city beyond familiar architectural and planning constraints.' },
    ],
    externalLinks: [
      { label: 'Watch Crystal City', url: 'https://www.youtube.com/watch?v=XHEck7ViX74' },
    ],
  },
  {
    id: 'P07',
    slug: 'last-one',
    video: { provider: 'youtube', id: '359ZBX6A7V8', title: 'Last_One' },
    title: 'Last_One',
    category: 'Animation & moving image',
    summary: 'A character moving through imagined worlds.',
    image: '/portfolio/last-one-1600.webp',
    imageSmall: '/portfolio/last-one-800.webp',
    imageAlt: 'A small animated character and a purple sphere suspended against a bright orange background.',
    imageWidth: 1600,
    imageHeight: 670,
    imageFit: 'contain',
    tags: ['Animation', 'Audiovisual work', 'Moving image'],
    overview: [
      'Last_One is an audiovisual work presented through animation and cinematic stills. A stylized character appears among floating worlds, geometric spaces, and vivid orange light.',
      'The selection below brings together four frames from the project alongside its video.',
    ],
    highlights: [
      { title: 'Character and scale', body: 'Small figures and suspended spherical forms create contrasts of scale across the frames.' },
      { title: 'A changing visual world', body: 'Dark spaces, bright color, and angular environments give each frame a distinct atmosphere.' },
    ],
    externalLinks: [
      { label: 'Watch Last_One', url: 'https://www.youtube.com/watch?v=359ZBX6A7V8' },
    ],
  },
  {
    id: 'P06',
    slug: 'gala-x-ci-vr-gallery',
    video: { provider: 'youtube', id: '70033a2SJx0', title: 'Gala x Ci VR Gallery' },
    title: 'Gala x Ci VR Gallery',
    category: 'Virtual exhibition',
    summary: 'Immersive projects gathered in a shared virtual space.',
    image: '/portfolio/gala-x-ci-vr-gallery-1100.webp',
    imageSmall: '/portfolio/gala-x-ci-vr-gallery-800.webp',
    imageAlt: 'A luminous black hole with a pale blue center and flowing pink light against the virtual gallery’s star-filled background.',
    imageWidth: 1100,
    imageHeight: 689,
    imageFit: 'contain',
    tags: ['Virtual exhibition', 'Immersive media', 'Spatial experience'],
    overview: [
      'Gala x Ci VR Gallery brings Ci Song’s immersive projects into a shared virtual exhibition. The experience begins with a singularity and moves into a sequence of spaces for viewing the work.',
      'The gallery is presented here through its video and a selection of exhibition views, from the entrance to project displays within a star-filled environment.',
    ],
    highlights: [
      { title: 'Beginning at a singularity', body: 'A black-hole image establishes the gallery’s opening and its celestial setting.' },
      { title: 'Projects in a shared space', body: 'Displays are arranged within a virtual environment that brings the individual works together.' },
      { title: 'An exhibition to move through', body: 'Entrances, thresholds, and views along the display sequence give the gallery a spatial progression.' },
    ],
    externalLinks: [
      { label: 'Watch the gallery video', url: 'https://www.youtube.com/watch?v=70033a2SJx0' },
    ],
  },
];

/** Public email explicitly confirmed by Ci Song; never publish the private email. */
export const portfolioContact = {
  name: 'Ci Song',
  siteName: 'Gala X Ci',
  email: 'galaxci.song@gmail.com',
  emailSource: 'User-confirmed public business email',
  status: 'public-email-user-confirmed',
  linkedIn: 'https://www.linkedin.com/in/ci-song-galaxci/',
} as const;

/** Public selection is independent of the preserved source catalog. */
function selectProjects(slugs: readonly string[]): PortfolioProject[] {
  return slugs.map((slug) => {
    const project = portfolioProjects.find((candidate) => candidate.slug === slug);
    if (!project) throw new Error(`Unknown portfolio project: ${slug}`);
    return project;
  });
}
export const workProjects = selectProjects(['psytrain', 'shotflow', 'introme', 'hypnos-cockpit', 'deal-points', 'orbit', 'cyber-city', 'crystal-city', 'last-one', 'gala-x-ci-vr-gallery']);
export const floatingProjects = workProjects.slice(0, 6);
export const heroProjects = workProjects.slice(0, 3);
export const reelProjects = selectProjects(['deal-points', 'orbit']);
