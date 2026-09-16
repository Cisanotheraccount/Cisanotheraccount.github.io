export type Language = "en" | "zh";

export type LocalizedText = Record<Language, string>;

export type Project = {
  id: string;
  title: string;
  category: LocalizedText;
  role: LocalizedText;
  tools: string[];
  status: LocalizedText;
  summary: LocalizedText;
  image: string;
  featured?: boolean;
};

export type PhotoCategory = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  image: string;
};

export const content = {
  contactEmail: "galaxci.song@gmail.com",
  resumeUrl: "/about#resume-placeholder",
  identity: {
    brand: "Gala X Ci",
    legalName: "Ci Song",
    title: {
      en: "Artist · Creative Technologist · Prototype Maker",
      zh: "艺术家 · 创意技术创作者 · 原型开发者",
    },
    oneLine: {
      en: "Photography, moving image, real-time worlds, and AI-assisted experiments inside a personal visual universe.",
      zh: "在个人视觉宇宙中连接摄影、动态影像、实时世界与 AI 辅助实验。",
    },
    logos: {
      darkFill: "/assets/gala-x-ci-logo-dark-fill.svg?v=3",
      darkOutline: "/assets/gala-x-ci-logo-dark-outline.svg?v=3",
      silverFill: "/assets/gala-x-ci-logo-silver-fill.svg?v=3",
      silverOutline: "/assets/gala-x-ci-logo-silver-outline.svg?v=3",
    },
  },
  nav: {
    home: { en: "Home", zh: "首页" },
    lab: { en: "Lab", zh: "实验室" },
    projects: { en: "Projects", zh: "项目" },
    photography: { en: "Photography", zh: "摄影影像" },
    about: { en: "About", zh: "关于" },
    contact: { en: "Contact", zh: "联系" },
    resume: { en: "Resume", zh: "简历" },
  },
  hero: {
    eyebrow: {
      en: "Future media prototypes from a personal orbit",
      zh: "来自个人轨道的未来媒体原型",
    },
    primaryCta: { en: "Contact Me", zh: "联系我" },
    secondaryCta: { en: "Explore Lab", zh: "进入实验室" },
    resumeCta: { en: "Resume / CV", zh: "简历 / CV" },
    metrics: [
      { value: "AI", label: { en: "assisted development", zh: "辅助开发" } },
      { value: "3D", label: { en: "real-time systems", zh: "实时系统" } },
      { value: "HW", label: { en: "display control", zh: "硬件控制" } },
    ],
    heroImage:
      "https://www.galaxci.com/uploads/1/3/7/4/137482580/project-4-15_orig.png",
    supportImages: [
      "https://www.galaxci.com/uploads/1/3/7/4/137482580/class-city-2-0-0003_orig.png",
      "https://www.galaxci.com/uploads/1/3/7/4/137482580/ci-song-studio-project-1-light-up-still-image_orig.png",
      "https://www.galaxci.com/uploads/1/3/7/4/137482580/self-collage-final2_orig.jpg",
    ],
  },
  home: {
    signalEyebrow: {
      en: "Personal signal field",
      zh: "个人信号场",
    },
    manifest: [
      {
        kicker: { en: "image", zh: "影像" },
        label: { en: "cinematic memory", zh: "电影感记忆" },
      },
      {
        kicker: { en: "space", zh: "空间" },
        label: { en: "real-time worlds", zh: "实时世界" },
      },
      {
        kicker: { en: "prototype", zh: "原型" },
        label: { en: "AI-assisted systems", zh: "AI 辅助系统" },
      },
    ],
    orbitNodes: [
      {
        id: "lab",
        route: "/lab",
        icon: "lab",
        x: "23%",
        y: "25%",
        accent: "#7de6ff",
        label: { en: "Lab", zh: "实验室" },
        kicker: { en: "prototype systems", zh: "原型系统" },
        summary: {
          en: "Hardware displays, personal tools, and AI-assisted build loops.",
          zh: "硬件屏幕、个人工具，以及 AI 辅助的开发循环。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/ci-song-porfolio-17-weebly_orig.png",
      },
      {
        id: "projects",
        route: "/projects",
        icon: "projects",
        x: "72%",
        y: "19%",
        accent: "#f4c77b",
        label: { en: "Projects", zh: "项目" },
        kicker: { en: "selected work", zh: "精选作品" },
        summary: {
          en: "A curated index across product, real-time 3D, AI experience, and media.",
          zh: "横跨产品、实时 3D、AI 体验与媒体创作的精选索引。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/class-city-2-0-0003_orig.png",
      },
      {
        id: "photography",
        route: "/photography",
        icon: "photo",
        x: "84%",
        y: "54%",
        accent: "#ff9dbd",
        label: { en: "Photography", zh: "摄影影像" },
        kicker: { en: "visual archive", zh: "视觉档案" },
        summary: {
          en: "Commercial and personal image work organized as its own archive.",
          zh: "以独立档案形式组织商业与个人影像作品。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/self-collage-final2_orig.jpg",
      },
      {
        id: "about",
        route: "/about",
        icon: "about",
        x: "68%",
        y: "82%",
        accent: "#d8dee8",
        label: { en: "About", zh: "关于" },
        kicker: { en: "identity", zh: "身份" },
        summary: {
          en: "Education, capabilities, and the path behind Gala X Ci.",
          zh: "教育背景、能力方向，以及 Gala X Ci 背后的路径。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/ci-song-studio-project-1-light-up-still-image_orig.png",
      },
      {
        id: "contact",
        route: "/contact",
        icon: "contact",
        x: "22%",
        y: "76%",
        accent: "#b7f2ff",
        label: { en: "Contact", zh: "联系" },
        kicker: { en: "open channel", zh: "建立联系" },
        summary: {
          en: "For collaborations, prototype teams, creative tech roles, and image work.",
          zh: "用于合作、原型团队、创意技术岗位与影像项目。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/project-4-15_orig.png",
      },
    ],
    signalTitle: {
      en: "Enter through the image. Move through the systems.",
      zh: "从影像进入，在系统之间移动。",
    },
    signalBody: {
      en: "The homepage behaves like a cinematic interface: images, spatial experiments, and prototype systems open as different scenes inside one personal field.",
      zh: "首页像一个电影感界面：影像、空间实验与原型系统作为不同场景，在同一个个人场域中展开。",
    },
    focusAreas: [
      {
        title: { en: "Cinematic Image", zh: "电影感影像" },
        body: {
          en: "Photography, video, portraits, commercial visuals, and atmospheric image systems.",
          zh: "摄影、视频、人像、商业视觉，以及带有氛围感的图像系统。",
        },
      },
      {
        title: { en: "Real-time Worlds", zh: "实时世界" },
        body: {
          en: "Interactive 3D scenes, spatial interfaces, virtual production language, and responsive screens.",
          zh: "交互 3D 场景、空间界面、虚拟制作语言，以及可响应的屏幕。",
        },
      },
      {
        title: { en: "Prototype Systems", zh: "原型系统" },
        body: {
          en: "AI-assisted tools, hardware displays, small-screen UI, and product experiments.",
          zh: "AI 辅助工具、硬件屏幕、小屏幕 UI，以及产品实验。",
        },
      },
    ],
  },
  lab: {
    eyebrow: { en: "Lead case placeholder", zh: "主案例占位" },
    title: { en: "Ulanzi Personal Mission Control", zh: "Ulanzi 个人任务控制台" },
    intro: {
      en: "A future-facing case study for a physical display system that turns small hardware screens into a personal creative operations console.",
      zh: "一个面向未来的技术案例：把小型硬件屏幕变成个人创作工作流的操作控制台。",
    },
    role: {
      en: "Independent system designer and AI-assisted developer",
      zh: "独立系统设计者与 AI 辅助开发者",
    },
    modules: [
      {
        title: { en: "Device and system monitoring", zh: "设备与系统监控" },
        body: {
          en: "Disk capacity, device state, power display, refresh behavior, and compact screen information design.",
          zh: "磁盘容量、设备状态、电力显示、刷新行为，以及小屏幕信息设计。",
        },
      },
      {
        title: { en: "Small-screen interface logic", zh: "小屏幕界面逻辑" },
        body: {
          en: "Screen states, status colors, short error messages, and readable layouts under strict space constraints.",
          zh: "屏幕状态、状态颜色、短错误提示，以及在极小空间里的可读布局。",
        },
      },
      {
        title: { en: "AI-assisted build loop", zh: "AI 辅助构建循环" },
        body: {
          en: "Rapid iterations from need, UI concept, plugin behavior, local testing, and installation workflow.",
          zh: "从需求、界面概念、插件行为、本地测试到安装流程的快速迭代。",
        },
      },
    ],
    shootListTitle: { en: "Future asset shot list", zh: "后续素材拍摄清单" },
    shootList: [
      { en: "Desk setup with Ulanzi screens active", zh: "Ulanzi 屏幕点亮的桌面全景" },
      { en: "Close-up device shots and screen details", zh: "设备与屏幕细节特写" },
      { en: "Hands interacting with physical controls", zh: "手部操作实体按键的画面" },
      { en: "Short GIF/video showing refresh and status changes", zh: "展示刷新与状态变化的短 GIF / 视频" },
    ],
  },
  projects: {
    title: { en: "Projects as launch slots", zh: "项目发射位" },
    intro: {
      en: "V1 keeps the project taxonomy real while leaving space for final case selection. Cards are ready for media, role, tools, and bilingual case summaries.",
      zh: "第一版先保留真实项目分类，并为后续最终案例选择预留空间。每张卡片都已经准备好放入媒介、角色、工具和双语案例摘要。",
    },
    filters: [
      { id: "all", label: { en: "All", zh: "全部" } },
      { id: "hardware", label: { en: "Hardware/Product", zh: "硬件 / 产品" } },
      { id: "realtime", label: { en: "Real-time 3D", zh: "实时 3D" } },
      { id: "ai", label: { en: "AI Experience", zh: "AI 体验" } },
      { id: "media", label: { en: "Visual/Media", zh: "视觉 / 媒体" } },
    ],
    items: [
      {
        id: "ulanzi",
        title: "Ulanzi Personal Mission Control",
        category: { en: "Hardware/Product", zh: "硬件 / 产品" },
        role: { en: "Independent system builder", zh: "独立系统构建者" },
        tools: ["AI-assisted dev", "Ulanzi Studio", "Device UI"],
        status: { en: "Anchor case, assets pending", zh: "主案例，素材待补" },
        summary: {
          en: "A personal hardware display control system for monitoring creative tools, devices, and workflow states.",
          zh: "一个用于监控创作工具、设备与工作流状态的个人硬件屏幕控制系统。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/ci-song-porfolio-17-weebly_orig.png",
        featured: true,
      },
      {
        id: "psytrain",
        title: "AI Psychology Counselor + Real-time 3D Space",
        category: { en: "AI Experience", zh: "AI 体验" },
        role: { en: "3D / real-time visual contribution", zh: "3D / 实时视觉贡献" },
        tools: ["Real-time 3D", "AI product experience", "Interactive space"],
        status: { en: "Internship case", zh: "实习项目案例" },
        summary: {
          en: "An AI counseling experience supported by a real-time 3D virtual space and emotional visual atmosphere.",
          zh: "一个由实时 3D 虚拟空间与情绪化视觉氛围支撑的 AI 心理辅导体验。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/hero-pic_orig.png",
        featured: true,
      },
      {
        id: "realtime-worlds",
        title: "Real-time 3D Interaction Suite",
        category: { en: "Real-time 3D", zh: "实时 3D" },
        role: { en: "Scene and interaction designer", zh: "场景与交互设计" },
        tools: ["Unity", "Unreal", "Virtual production"],
        status: { en: "Placeholder slot", zh: "占位项目" },
        summary: {
          en: "A future slot for Unity/Unreal worlds, screen-based interaction, and virtual production experiments.",
          zh: "为 Unity/Unreal 世界、屏幕交互与虚拟制作实验预留的项目位置。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/class-city-2-0-0003_orig.png",
      },
      {
        id: "product-lab",
        title: "AI Product Prototype Lab",
        category: { en: "AI Experience", zh: "AI 体验" },
        role: { en: "AI-assisted prototyper", zh: "AI 辅助原型开发者" },
        tools: ["AI workflow", "Prototype design", "Product thinking"],
        status: { en: "Columbia year slot", zh: "Columbia 年度项目位" },
        summary: {
          en: "A living area for future AI-native creative tools and product prototypes developed during the Columbia CDP year.",
          zh: "用于承载 Columbia CDP 期间开发的 AI 原生创作工具与产品原型。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/ci-song-porfolio-12-weebly_orig.png",
      },
      {
        id: "visual-media",
        title: "Cinematic Visual Systems",
        category: { en: "Visual/Media", zh: "视觉 / 媒体" },
        role: { en: "Photographer and visual storyteller", zh: "摄影师与视觉叙事创作者" },
        tools: ["Photo", "Video", "Color", "Social media"],
        status: { en: "Placeholder slot", zh: "占位项目" },
        summary: {
          en: "A slot for commercial interviews, real estate, restaurant, portrait, and landscape image systems.",
          zh: "为采访、房产、餐厅、人像与风景等商业和个人影像系统预留的位置。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/background-images/1899835062.jpg",
      },
      {
        id: "archive-slot",
        title: "Legacy Project Archive",
        category: { en: "Visual/Media", zh: "视觉 / 媒体" },
        role: { en: "Curated project migration", zh: "精选项目迁移" },
        tools: ["Archive", "Curation", "Case writing"],
        status: { en: "Selection pending", zh: "待选择迁移项目" },
        summary: {
          en: "A reserved position for selected legacy projects from the existing Gala X Ci portfolio.",
          zh: "为旧版 Gala X Ci 作品集中值得迁移的精选项目预留的位置。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/ci-song-still-image-2_orig.png",
      },
    ] satisfies Project[],
  },
  photography: {
    title: { en: "Photography / Video Portfolio", zh: "摄影 / 影像作品集" },
    intro: {
      en: "An independent archive for commercial and personal image work, organized by theme rather than by technical medium.",
      zh: "一个独立的商业与个人影像档案，以主题而不是技术媒介来组织。",
    },
    categories: [
      {
        id: "real-estate",
        title: { en: "Real Estate", zh: "房产" },
        description: {
          en: "Clean spatial storytelling for property, interiors, and social-media-ready real estate content.",
          zh: "面向房产、室内空间与社交媒体发布的清晰空间叙事。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/ci-song-porfolio-01_orig.png",
      },
      {
        id: "interviews",
        title: { en: "Interviews", zh: "采访" },
        description: {
          en: "Professional interview setups with controlled lighting, framing, and social-ready edits.",
          zh: "具备专业布光、构图与社交媒体成片能力的采访拍摄。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/ci-song-porfolio-07-pic_orig.png",
      },
      {
        id: "portraits",
        title: { en: "Portraits", zh: "人像" },
        description: {
          en: "Portrait images focused on atmosphere, presence, identity, and controlled visual style.",
          zh: "关注氛围、人物存在感、身份表达与可控视觉风格的人像作品。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/self-collage-final2_orig.jpg",
      },
      {
        id: "landscape",
        title: { en: "Landscape", zh: "风景" },
        description: {
          en: "Personal visual studies of places, light, scale, and atmospheric structure.",
          zh: "关于地点、光线、尺度与氛围结构的个人视觉研究。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/editor/509a4710.jpeg?1729886623",
      },
      {
        id: "restaurant-commercial",
        title: { en: "Restaurant / Commercial", zh: "餐厅 / 商业" },
        description: {
          en: "Short-form commercial content built for brands, restaurants, and social publication.",
          zh: "为品牌、餐厅与社交发布制作的商业短片和视觉内容。",
        },
        image:
          "https://www.galaxci.com/uploads/1/3/7/4/137482580/project-4-15_orig.png",
      },
    ] satisfies PhotoCategory[],
  },
  about: {
    title: { en: "Ci Song behind Gala X Ci", zh: "Gala X Ci 背后的 Ci Song" },
    body: {
      en: "I work across real-time 3D, virtual production, photography, commercial video, and hardware/product prototypes. The throughline is future media: using AI-assisted development and cinematic visual language to make experimental experiences feel real, usable, and memorable.",
      zh: "我横跨实时 3D、虚拟制作、摄影、商业视频与硬件 / 产品原型。贯穿其中的主线是未来媒体：用 AI 辅助开发与电影感视觉语言，让实验性体验变得真实、可用，并且令人记住。",
    },
    education: [
      {
        school: "NYU Interactive Media Arts",
        meta: { en: "Undergraduate background", zh: "本科背景" },
      },
      {
        school: "Columbia CDP",
        meta: { en: "Graduate direction in product and prototype methods", zh: "研究生阶段聚焦产品与原型方法" },
      },
    ],
    capabilities: [
      { en: "AI-assisted independent prototyping", zh: "AI 辅助独立原型开发" },
      { en: "Unity / Unreal real-time interaction", zh: "Unity / Unreal 实时交互" },
      { en: "Hardware display systems and small-screen UI", zh: "硬件屏幕系统与小屏幕 UI" },
      { en: "Photography, commercial video, and visual storytelling", zh: "摄影、商业视频与视觉叙事" },
    ],
    resumePlaceholder: {
      title: { en: "Resume / CV", zh: "简历 / CV" },
      body: {
        en: "Resume PDF slot reserved. Replace this placeholder with the final file when the resume is ready.",
        zh: "简历 PDF 位置已预留。简历准备好后，把这里替换成最终文件即可。",
      },
    },
  },
  contact: {
    title: { en: "Open a channel", zh: "建立联系" },
    intro: {
      en: "For product prototype teams, creative technology roles, future media collaborations, or commercial image work.",
      zh: "适用于产品原型团队、创意技术岗位、未来媒体合作，或商业影像项目。",
    },
    fields: {
      name: { en: "Name", zh: "姓名" },
      email: { en: "Email", zh: "邮箱" },
      message: { en: "Message", zh: "消息" },
      submit: { en: "Open email draft", zh: "打开邮件草稿" },
    },
  },
};

export const routeLabels = {
  "/": content.nav.home,
  "/lab": content.nav.lab,
  "/projects": content.nav.projects,
  "/photography": content.nav.photography,
  "/about": content.nav.about,
  "/contact": content.nav.contact,
};
