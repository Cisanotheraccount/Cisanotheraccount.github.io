/**
 * Preview copy distilled from the content library's project.md files.
 * This is not final editorial approval or a final selection of featured work.
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
    category: 'In-vehicle rest experience',
    summary: 'Reimagining the car as a place to rest.',
    image: '/portfolio/hypnos-cockpit-1600.webp',
    imageSmall: '/portfolio/hypnos-cockpit-800.webp',
    imageAlt: 'Hýpnos Cockpit concept showing a wide dashboard interface and steering wheel inside a vehicle.',
    imageWidth: 1600,
    imageHeight: 1035,
    tags: ['Automotive UI', 'Spatial experience', 'Interaction design'],
    overview: [
      'Hýpnos Cockpit explores an in-vehicle rest experience through cabin design, privacy, environmental controls, and a staged sleep-to-wake interface.',
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
    category: 'VR counseling training',
    summary: 'A space to practice the conversations that matter.',
    image: '/portfolio/psytrain-1600.webp',
    imageSmall: '/portfolio/psytrain-800.webp',
    imageAlt: 'PsytrAIn virtual training scene with a digital character seated on a gray sofa.',
    imageWidth: 1600,
    imageHeight: 1035,
    tags: ['Virtual reality', 'AI interaction', 'Spatial UI'],
    overview: [
      'PsytrAIn explores immersive counseling practice through an AI avatar, emotional cues, and a spatial training interface.',
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
    category: 'Conversational portfolio',
    summary: 'A portfolio you can ask questions about.',
    image: '/portfolio/introme-1600.webp',
    imageSmall: '/portfolio/introme-800.webp',
    imageAlt: 'Portrait of Ci Song in a light blue hoodie, used in the IntroMe personal avatar presentation.',
    imageWidth: 1600,
    imageHeight: 1114,
    tags: ['AI avatar', 'Conversation design', 'Web experience'],
    role: 'Independent project',
    period: 'Sep 2025 — Jan 2026',
    overview: [
      'IntroMe is a personal AI avatar designed to introduce my work through conversation. It explores how visitors could ask about a project’s context and the decisions behind it, alongside browsing the images and written descriptions in my portfolio.',
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
    "category": "Wearable memory assistant",
    "summary": "Connecting everyday objects with the places we leave them.",
    "image": "/portfolio/orbit-1100.webp",
    "imageSmall": "/portfolio/orbit-800.webp",
    "imageAlt": "Orbit wearable memory-assistant concept, showing a silver necklace device and its design description.",
    "imageWidth": 1100,
    "imageHeight": 712,
    "imageFit": "contain",
    "tags": [
      "Wearable design",
      "Spatial interaction",
      "Physical AI"
    ],
    "overview": [
      "Orbit explores a wearable memory assistant that connects everyday objects with a spatial view of where they were placed.",
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
    "category": "Storyboarding & on-set workflow",
    "summary": "From reference footage to a shoot-ready shot list.",
    "image": "/portfolio/shotflow-1290.webp",
    "imageSmall": "/portfolio/shotflow-800.webp",
    "imageAlt": "ShotFlow development screenshot showing a project workspace with reference-video analysis and shot progress.",
    "imageWidth": 1290,
    "imageHeight": 2796,
    "imageFit": "contain",
    "tags": [
      "iOS product",
      "Filmmaking workflow",
      "Interaction design"
    ],
    "overview": [
      "ShotFlow is an iOS tool for organizing reference footage, reviewing individual shots, and bringing a structured checklist to a shoot. The workflow connects project organization, shot-level reference playback, and shooting progress in one place.",
      "The product centers on using a phone to review and organize references while working with professional cameras. Development materials document local video analysis, source-based shot grouping, shot editing, and an on-set checklist. The project is in active development."
    ],
    "highlights": [
      {
        "title": "Organize the references",
        "body": "A project workspace keeps source videos, analysis progress, and the resulting shots together."
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
        "image": "/portfolio/shotflow-storyboard-1290.webp",
        "alt": "ShotFlow development screenshot showing shots grouped by source video with timing and completion status.",
        "caption": "Development capture: shots grouped by their source video. The pictured project is demonstration data."
      }
    ],
    "externalLinks": []
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

/** Explicit placement: ShotFlow is a visible project, not a reserved slot. */
function selectProjects(slugs: readonly string[]): PortfolioProject[] {
  return slugs.map((slug) => {
    const project = portfolioProjects.find((candidate) => candidate.slug === slug);
    if (!project) throw new Error(`Unknown portfolio project: ${slug}`);
    return project;
  });
}
export const workProjects = selectProjects(['hypnos-cockpit', 'introme', 'shotflow', 'psytrain', 'deal-points', 'orbit', 'm-box']);
export const heroProjects = workProjects.slice(0, 3);
export const reelProjects = selectProjects(['deal-points', 'orbit', 'm-box']);
