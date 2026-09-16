import projectGalleries from "./projectGalleries.json";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, ArrowLeft, X, Plus, Pause, Play } from "lucide-react";
import { heroProjects, workProjects, reelProjects, portfolioContact, type PortfolioProject } from "./portfolioData";
import { usePortfolioMotion, useReducedMotion } from "./usePortfolioMotion";
import { useSmoothScroll } from "./useSmoothScroll";

const number = (n: number) => String(n + 1).padStart(2, "0");

export function App() {
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [featured, setFeatured] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const motionDisabled = reducedMotion || motionPaused;
  const [sceneVersion, setSceneVersion] = useState(0);
  const [opened, setOpened] = useState<PortfolioProject | null>(() => workProjects.find(item => window.location.pathname === "/work/" + item.slug || window.location.pathname === "/work/" + item.slug + "/") ?? null);
  const [activeSection, setActiveSection] = useState("work");
  const openProject = (item: PortfolioProject) => {
    window.history.pushState({ portfolioProject: true }, "", "/work/" + item.slug);
    setOpened(item);
  };
  const closeProject = () => {
    if (window.history.state?.portfolioProject) window.history.back();
    else { window.history.replaceState(null, "", "/#work"); setOpened(null); }
  };
  useEffect(() => {
    const sync = () => setOpened(workProjects.find(item => window.location.pathname.replace(/\/$/, "") === "/work/" + item.slug) ?? null);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    document.title = opened ? opened.title + " — Ci Song / Gala X Ci" : "Gala X Ci — Ci Song / Design";
  }, [opened]);
  const project = heroProjects[featured];
  usePortfolioMotion(root, motionDisabled, opened !== null);
  useSmoothScroll(motionDisabled, opened !== null);

  const selectFeatured = (next: number) => {
    if (next === featured) return;
    setFeatured(next);
    setSceneVersion((version) => version + 1);
  };

  useEffect(() => {
    // Keep every scene mounted: an interrupted transition continues from its
    // current visual state. Decode the other full-size images before selection.
    const preload = () => root.current?.querySelectorAll<HTMLImageElement>(".featured-image").forEach((image) => {
      void image.decode?.().catch(() => undefined);
    });
    const timeout = window.setTimeout(preload, 700);
    const introTimer = window.setTimeout(() => root.current?.setAttribute("data-intro-complete", "true"), 1100);
    return () => { window.clearTimeout(timeout); window.clearTimeout(introTimer); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = "en";
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      }), { rootMargin: "-15% 0px -55% 0px" }
    );
    document.querySelectorAll("[data-section]").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className="portfolio" data-reduced-motion={reducedMotion ? "true" : "false"} data-motion-paused={motionPaused ? "true" : "false"}>
      <WorkViewfinder />
      <div className="reading-progress" aria-hidden="true"><span /></div>
      <div className="cosmic-backdrop" aria-hidden="true">
        <div className="cosmic-camera"><picture>
          <source media="(max-width: 700px)" srcSet="/portfolio/cosmic-photograph-960.webp" />
          <img className="cosmic-photograph" src="/portfolio/cosmic-photograph-1920.webp" width="1920" height="1281" alt="" {...{ fetchpriority: "high" }} decoding="async" />
        </picture></div>
      </div>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <a href="#top" className="wordmark" aria-label="Gala X Ci, back to top">Gala <span className="brand-x">X</span> Ci<span className="wordmark-dot" aria-hidden="true">.</span></a>
        <nav aria-label="Main navigation">
          {["work", "about", "contact"].map((section) => <a key={section} href={"#" + section} className={activeSection === section ? "nav-link is-current" : "nav-link"}><span className="nav-label"><span>{section[0].toUpperCase() + section.slice(1)}</span><span aria-hidden="true">{section[0].toUpperCase() + section.slice(1)}</span></span></a>)}
        </nav>
        <a className="header-note discipline-link" href="/photography/">Photography &amp; Film <ArrowUpRight size={14} /></a>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero" id="top" aria-label="Gala X Ci, portfolio of Ci Song" data-cosmic-region>
          <div className="hero-eyebrow enter-item"><span>Ci Song <span className="quiet-slash">/</span> Design &amp; exploration</span><div className="hero-meta"><span className="hero-coordinate">Digital <Plus size={12} strokeWidth={1.4} /> Physical</span><button className="motion-toggle" type="button" onClick={() => setMotionPaused((paused) => !paused)} disabled={reducedMotion} aria-label={reducedMotion ? "System reduced motion is enabled" : motionPaused ? "Resume motion" : "Pause motion"} aria-pressed={motionPaused || reducedMotion} title={reducedMotion ? "System reduced motion is enabled" : motionPaused ? "Resume motion" : "Pause motion"}>{motionDisabled ? <Play size={13} strokeWidth={1.5} /> : <Pause size={13} strokeWidth={1.5} />}<span>{motionDisabled ? "Motion paused" : "Pause motion"}</span></button></div></div>
          <h1 className="hero-name" aria-label="Gala X Ci">
            {["Gala", "X", "Ci"].map((word, index) => <span className={"name-window name-window-" + index} key={word} aria-hidden="true"><span style={{ "--order": index } as CSSProperties} className={index === 1 ? "name-part name-cross" : "name-part"}>{word}</span></span>)}
          </h1>
          <div className="hero-intro enter-item">
            <p>Designing experiences across<br className="desktop-break" /> digital and physical worlds.</p>
            <span className="hero-aside">Interfaces, experiments,<br />and environments.</span>
            <a className="text-link magnetic-link" href="#work" data-magnetic>View work <ArrowDown size={19} strokeWidth={1.5} /></a>
          </div>
          <div className="featured-shell" data-cosmic-reveal>
            <button className={"featured-stage stage-" + project.slug} onClick={() => openProject(project)} aria-label={"Explore " + project.title} data-pointer-motion>
              <div className="stage-image-container">
                {heroProjects.map((item, index) => <SceneFrame key={item.id} project={item} active={index === featured} />)}
              </div>
              <span className="stage-label"><span className="status-mark" /> In focus <span className="stage-number">{number(featured)} / {String(heroProjects.length).padStart(2, "0")}</span></span>
              <span className="stage-corner" aria-hidden="true"><ArrowUpRight size={25} strokeWidth={1.3} /></span>
              <span className="explore-orb" aria-hidden="true">Explore<ArrowUpRight size={19} strokeWidth={1.5} /></span>
            </button>
            <div className="featured-caption">
              <div className="featured-caption-title" aria-live="polite" aria-atomic="true"><span className="index-number">{number(featured)}</span><div key={sceneVersion} className="caption-enter"><h2>{project.title}</h2><p>{project.category}</p></div></div>
              <div className="scene-controls" role="group" aria-label="Choose featured project">{heroProjects.map((item, index) => <button key={item.id} className={"scene-button" + (featured === index ? " is-selected" : "")} aria-label={"Show " + item.title} aria-pressed={featured === index} onClick={() => selectFeatured(index)} title={item.title}><span>{number(index)}</span><span className="scene-line" aria-hidden="true" /></button>)}</div>
            </div>
          </div>
        </section>
        <section id="work" className="work-section page-section" data-section aria-labelledby="work-heading">
          <div className="section-heading" data-reveal><span className="eyebrow">01 / Selected explorations</span><h2 id="work-heading"><span className="reveal-line"><span>Selected</span></span><span className="reveal-line"><span className="muted-word">work.</span></span></h2><p>Conversation. Environments.<br />New ways to interact.</p></div>
          <div className="work-list">{workProjects.map((item, index) => <button className="work-row" key={item.id} onClick={() => openProject(item)} data-reveal data-work-index={index}>
            <span className="work-index">{number(index)}</span>
            <span data-image-fit={item.imageFit} className={"work-thumbnail thumbnail-" + item.slug}><img src={item.imageSmall} width={item.imageWidth} height={item.imageHeight} alt="" loading="lazy" /></span>
            <span className="work-title-wrap"><span className="work-title">{item.title}</span><span className="work-mobile-category">{item.category}</span></span>
            <span className="work-category">{item.tags[0]}<br /><span>{item.tags[1]}</span></span>
            <ArrowUpRight className="work-arrow" size={31} strokeWidth={1.2} aria-hidden="true" />
          </button>)}</div>
          <div className="work-endnote" data-reveal><span>From conversation to environments.</span><span>Always exploring.<Plus size={16} strokeWidth={1.2} /></span></div>
        </section>
        <div className="project-reel" data-reel-region aria-label="Project image collection">
          <div className="reel-heading"><span className="eyebrow">A closer look</span><span>Ideas, made tangible <ArrowDown size={14} /></span></div>
          <div className="project-reel-track" data-native-scroll>{reelProjects.map((item, index) => <button className={"reel-frame reel-" + item.slug} key={item.id} onClick={() => openProject(item)} aria-label={"Explore " + item.title}>
            <span className="reel-image" data-image-fit={item.imageFit}><img src={item.image} srcSet={item.imageSmall + " 800w, " + item.image + " " + item.imageWidth + "w"} sizes="(max-width:700px) 80vw, 48vw" width={item.imageWidth} height={item.imageHeight} alt={item.imageAlt} loading="lazy" /></span>
            <span className="reel-caption"><span>{number(index)} <span className="reel-name">{item.title}</span></span><ArrowUpRight size={18} /></span>
          </button>)}</div>
        </div>
        <section id="about" className="about-section page-section" data-section aria-labelledby="about-heading">
          <div className="about-meta" data-reveal><span className="eyebrow">02 / A little about me</span><span className="about-name">Ci Song<ArrowDown size={22} strokeWidth={1.2} /></span></div>
          <div className="about-main" data-reveal><h2 id="about-heading"><span className="reveal-line"><span>Between people,</span></span><span className="reveal-line"><span>interfaces</span></span><span className="reveal-line"><span className="accent-word">&amp; environments.</span></span></h2><div className="about-detail"><p>People and technology. Screens and spaces. An idea and the moment it becomes an experience.</p><p>My work explores conversational AI, virtual environments, and physical interfaces. I make things to understand how they might feel, work, and fit into our lives.</p></div><a href={"mailto:" + portfolioContact.email + "?subject=Resume%20request"} className="text-link">Request my résumé <ArrowUpRight size={19} strokeWidth={1.5} /></a></div>
        </section>
        <section id="contact" className="contact-section page-section" data-section aria-labelledby="contact-heading">
          <div className="contact-top" data-reveal><span className="eyebrow">03 / What’s next?</span><span>Open to opportunities</span></div>
          <a href={"mailto:" + portfolioContact.email} className="contact-cta" data-reveal><h2 id="contact-heading"><span className="reveal-line"><span>Let’s work</span></span><span className="reveal-line"><span>together.</span></span></h2><span className="contact-arrow" data-magnetic><ArrowUpRight strokeWidth={1} aria-hidden="true" /></span></a>
          <div className="contact-bottom"><a className="email-link" href={"mailto:" + portfolioContact.email}>{portfolioContact.email}<ArrowUpRight size={18} /></a><a href={portfolioContact.linkedIn} target="_blank" rel="noreferrer" className="text-link">LinkedIn<ArrowUpRight size={15} /></a></div>
        </section>
      </main>
      <footer className="site-footer"><span>Gala X Ci <span className="footer-slash">/</span> Ci Song</span><a href="/photography/">Photography &amp; Film<ArrowUpRight size={15} /></a><a href="#top">Back to top<ArrowUpRight size={15} /></a></footer>
      {opened && <ProjectDialog project={opened} motionDisabled={motionDisabled} onClose={closeProject} />}
    </div>
  );
}

function SceneFrame({ project, active }: { project: PortfolioProject; active: boolean }) {
  return <div data-image-fit={project.imageFit} className={"scene-frame scene-" + project.slug + (active ? " is-active" : "")} aria-hidden={!active}>
    <img className="featured-image" src={project.image} srcSet={project.imageSmall + " 800w, " + project.image + " " + project.imageWidth + "w"} sizes="(max-width: 700px) 100vw, 94vw" width={project.imageWidth} height={project.imageHeight} alt={active ? project.imageAlt : ""} {...{ fetchpriority: active ? "high" : "auto" }} decoding="async" />
  </div>;
}

function WorkViewfinder() {
  return <div className="work-viewfinder" aria-hidden="true" data-visible="false">
    <div className="viewfinder-body">
      <div className="viewfinder-window"><div className="viewfinder-strip">{workProjects.map((item) => <div data-image-fit={item.imageFit} className={"viewfinder-frame viewfinder-" + item.slug} key={item.id}><img src={item.imageSmall} width={item.imageWidth} height={item.imageHeight} alt="" loading="lazy" /></div>)}</div><span className="viewfinder-crosshair"><ArrowUpRight size={21} strokeWidth={1.25} /></span></div>
      <div className="viewfinder-caption"><span>Explore</span><div className="viewfinder-caption-window"><div className="viewfinder-caption-track">{workProjects.map((item, index) => <span key={item.id}>{number(index)} / {item.title}</span>)}</div></div></div>
    </div>
  </div>;
}

function ProjectDialog({ project, motionDisabled, onClose }: { project: PortfolioProject; motionDisabled: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const dismiss = () => {
    if (closing) return;
    if (motionDisabled) { onClose(); return; }
    if (dialog.current) dialog.current.style.setProperty("--case-exit-from", getComputedStyle(dialog.current).transform);
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 520);
  };
  useEffect(() => {
    if (closing && motionDisabled) onClose();
  }, [closing, motionDisabled, onClose]);
  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.documentElement.dataset.caseOpen = "true";
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      delete document.documentElement.dataset.caseOpen;
      document.body.style.overflow = previousOverflow;
      if (element.open) element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog className={"project-dialog" + (closing ? " is-closing" : "")} data-lenis-prevent ref={dialog} onCancel={(event) => { event.preventDefault(); dismiss(); }} aria-labelledby="case-title">
      <div className="case-topbar"><span>Gala X Ci <span>/</span> A closer look</span><button onClick={dismiss} className="close-button" aria-label="Close project" autoFocus><span>Close</span><X size={21} strokeWidth={1.4} /></button></div>
      <article className="case-content">
        <div className="case-intro"><span className="eyebrow">{project.category}</span><h2 id="case-title">{project.title}</h2><p className="case-summary">{project.summary}</p></div>
        <figure data-image-fit={project.imageFit} className={"case-image case-image-" + project.slug}><img src={project.image} width={project.imageWidth} height={project.imageHeight} alt={project.imageAlt} /></figure>
        {project.gallery && <div className="case-gallery">{project.gallery.map((item) => <figure key={item.image}><a href={item.image} target="_blank" rel="noreferrer" aria-label="Open full-size project image"><img src={item.image} alt={item.alt} loading="lazy" /></a><figcaption>{item.caption}</figcaption></figure>)}</div>}
        <div className="case-overview"><aside><span className="eyebrow">Project overview</span>{project.period && <p>{project.period}</p>}{project.role && <p>{project.role}</p>}<ul className="tags">{project.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul></aside><div>{project.overview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></div>
        <div className="case-highlights">{project.highlights.map((highlight, index) => <section key={highlight.title}><span className="index-number">{number(index)}</span><h3>{highlight.title}</h3><p>{highlight.body}</p></section>)}</div>
        {project.liveDemo && <section className="live-demo-note"><span className="status-mark" /><div><h3>{project.liveDemo.label}</h3><p>The live avatar is being prepared. In the meantime, explore the presentations below.</p></div></section>}
        {project.externalLinks.length > 0 && <div className="case-links">{project.externalLinks.map((link) => <a href={link.url} target="_blank" rel="noreferrer" className="text-link" key={link.url}>{link.label}<ArrowUpRight size={18} /></a>)}</div>}
        {projectGalleries[project.slug as keyof typeof projectGalleries]?.length > 0 && <section className="case-studies" aria-label="Project process and original design studies"><div className="case-studies-heading"><span className="eyebrow">Inside the project</span><h3>Process &amp; design studies.</h3><p>Open a study to view it at full size.</p></div>{projectGalleries[project.slug as keyof typeof projectGalleries].map(item => <figure key={item.image}><a href={item.image} target="_blank" rel="noreferrer" aria-label={"Open " + item.alt}><img src={item.image} alt={item.alt} width={item.width} height={item.height} loading="lazy" /></a><figcaption>{item.caption}<ArrowUpRight size={14} /></figcaption></figure>)}</section>}
        <button className="text-link case-back" onClick={dismiss}><ArrowLeft size={18} />Back to work</button>
      </article>
    </dialog>
  );
}

