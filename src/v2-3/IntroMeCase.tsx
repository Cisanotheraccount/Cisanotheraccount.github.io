import { useEffect, useRef, useState, type ReactNode, type RefObject, type CSSProperties } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import type { PortfolioProject } from './content/portfolioData';
import { introMeMedia, introMeExplorations, introMeRecordingStates, introMeKnowledge, introMeVoice, introMeIntent, introMeLimits, introMePresentation, type IntroMeStudy } from './introMeCaseContent';
import './introMeCase.css';

type Props = {
  item: PortfolioProject;
  heading: RefObject<HTMLHeadingElement | null>;
  slot: RefObject<HTMLDivElement | null>;
  renderStudy(study: IntroMeStudy): ReactNode;
  instant: boolean;
  active: boolean;
};

function CapstonePresentation({ active }: { active: boolean }) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const restorePlayFocus = useRef(false);
  const { poster, title, caption, durationLabel, url, embedUrl } = introMePresentation;

  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);

  useEffect(() => {
    // Keep focus in the page initially; Tab then enters Vimeo's own controls.
    if (active && playing) frame.current?.focus({ preventScroll: true });
    else if (active && restorePlayFocus.current) {
      playButton.current?.focus({ preventScroll: true });
      restorePlayFocus.current = false;
    }
  }, [active, playing]);

  return <figure className="im-presentation" aria-labelledby="im-presentation-caption" data-im-reveal>
    <div ref={frame} className="im-presentation-frame" tabIndex={-1} role="group" aria-label={title}>
      {active && playing ? <iframe
        src={embedUrl}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      /> : <button
        ref={playButton}
        type="button"
        className="im-presentation-play"
        onClick={() => setPlaying(true)}
        disabled={!active}
        aria-label={`Play ${title} from the beginning (${durationLabel})`}
      >
        {poster && <img src={poster.image} srcSet={poster.srcSet} sizes={poster.sizes} width={poster.width} height={poster.height} alt={poster.alt} loading="lazy" decoding="async"/>}
        <span className="im-presentation-action">
          <span className="im-presentation-play-icon"><Play size={24} fill="currentColor" aria-hidden="true"/></span>
          <span>Watch the presentation<span className="im-presentation-duration">{durationLabel}</span></span>
        </span>
      </button>}
    </div>
    <figcaption id="im-presentation-caption">{caption}</figcaption>
    <div className="im-links">
      <a href={url} target="_blank" rel="noreferrer">Watch on Vimeo<ArrowUpRight size={15} aria-hidden="true"/></a>
      {active && playing && <button type="button" className="im-presentation-stop" onClick={() => { restorePlayFocus.current = true; setPlaying(false); }}>Close video</button>}
    </div>
  </figure>;
}

export function IntroMeCase({ item, heading, slot, renderStudy, instant, active }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const revealed = useRef(new WeakSet<Element>());
  useEffect(() => {
    const container = root.current;
    if (!container || !active) return;
    const elements = [...container.querySelectorAll<HTMLElement>('[data-im-reveal]')];
    if (instant || !('IntersectionObserver' in window)) {
      elements.forEach(element => revealed.current.add(element));
      return;
    }
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || revealed.current.has(entry.target)) continue;
        revealed.current.add(entry.target);
        observer.unobserve(entry.target);
        const animation = entry.target.animate(
          [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 300, easing: 'cubic-bezier(.23,1,.32,1)' },
        );
        animations.add(animation);
        animation.finished.then(() => animations.delete(animation)).catch(() => animations.delete(animation));
      }
    }, { root: container.closest('.gxc-detail-scroll'), threshold: 0.08 });
    elements.forEach(element => { if (!revealed.current.has(element)) observer.observe(element); });
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [active, instant]);

  const media = (study: IntroMeStudy) => {
    const frame = study.frame;
    const crop = frame?.crop;
    const style = frame ? {
      '--im-image-ratio': `${frame.width} / ${frame.height}`,
      '--im-image-radius': `${frame.radius}px`,
      ...(crop ? {
        '--im-image-width': `${100 / crop[0]}%`, '--im-image-height': `${100 / crop[1]}%`,
        '--im-image-left': `${-100 * crop[2] / crop[0]}%`, '--im-image-top': `${-100 * crop[3] / crop[1]}%`,
      } : {}),
    } as CSSProperties : undefined;
    return <div className={`im-media${frame ? ' im-media--frame' : ''}${crop ? ' im-media--crop' : ''}`} style={style} data-figma-node={study.node}>{renderStudy(study)}</div>;
  };

  return <div ref={root} className="gxc-introme" data-introme-preview="native-content-review">
    <section className="im-chapter im-hero" data-introme-chapter="01" data-introme-stage="sample" aria-labelledby="gxc-detail-title">
      <header className="im-hero-copy" data-im-reveal>
        <p className="im-eyebrow"><span>01 / INTRODUCING</span><span>{item.category}</span></p>
        <h2 ref={heading} id="gxc-detail-title" className="im-title" tabIndex={-1}>{item.title}</h2>
        <p className="im-tagline">A portfolio you can<br className="im-desktop-break"/> ask questions about.</p>
        <p className="im-lede">Generative video and conversational AI, brought together through a HeyGen avatar of myself. I shaped its appearance, voice and project knowledge to create another way to meet me and explore my work.</p>

      </header>
      <div className="im-stage">
        <div ref={slot} className="im-portrait">{media(introMeMedia.portrait)}</div>
        <div className="im-website" data-im-reveal>{media(introMeMedia.website)}</div>
      </div>
      <div className="im-hero-details" data-im-reveal>
        <dl className="im-meta"><div><dt>BY</dt><dd>Ci Song</dd></div><div><dt>PROJECT</dt><dd>{item.role}</dd></div><div><dt>WHEN</dt><dd>{item.period}</dd></div></dl>
      </div>
    </section>

    <section className="im-chapter im-intent" data-introme-chapter="02" data-introme-stage="revised" aria-labelledby="im-chapter-02">
      <header className="im-section-heading" data-im-reveal>
        <p className="im-eyebrow">02 / A PORTFOLIO THAT LISTENS</p>
        <h3 id="im-chapter-02">What I want.</h3>
        <p>An AI-driven digital twin of myself to introduce my work. Visitors could go beyond browsing images and ask about the projects that interest them.</p>
      </header>
      <div className="im-intent-scene" data-im-reveal>
        <div className="im-intent-website">{media(introMeMedia.proposalWebsite)}</div>
        <div className="im-conversation">
          <div className="im-concept-avatar">{media(introMeMedia.conceptAvatar)}</div>
          <p className="im-speech">Hi! I’m Ci.<br/>Let me introduce you to IntroMe.</p>
          <p className="im-conversation-labels"><span>Listen</span><span>Voice</span></p>
        </div>
      </div>
      <ol className="im-intent-flow" aria-label="The proposed portfolio conversation">{introMeIntent.map((step, i) => <li key={step.title} data-im-reveal><span className="im-step-index">0{i + 1}</span><h4>{step.title}</h4><p>{step.body}</p></li>)}</ol>
    </section>

    <section className="im-chapter im-exploration" data-introme-chapter="03" data-introme-stage="sample" aria-labelledby="im-chapter-03">
      <header className="im-section-heading" data-im-reveal>
        <p className="im-eyebrow">03 / FINDING A FORM</p>
        <h3 id="im-chapter-03">Finding a<br/>workable likeness.</h3>
        <p>I began with a 3D character, explored scanning, and moved toward a video-based avatar. Each attempt changed what I needed from the next.</p>
      </header>
      <ol className="im-path">{introMeExplorations.map((step, index) => <li className="im-path-step" key={step.title} data-im-reveal>
        <span className="im-step-index">0{index + 1}</span><h4>{step.title}</h4><p className="im-tools">{step.tools}</p>
        <div className="im-path-media">{media(step.image)}</div><p className="im-step-copy">{step.body}</p>
      </li>)}</ol>
    </section>

    <section className="im-chapter im-elements" data-introme-chapter="04" data-introme-stage="sample" aria-labelledby="im-chapter-04">
      <header className="im-section-heading" data-im-reveal>
        <p className="im-eyebrow">04 / MAKING IT PERSONAL</p>
        <h3 id="im-chapter-04" className="im-elements-title"><span>Appearance.</span> <span>Knowledge.</span> <span>Voice.</span></h3>
        <p>A recognizable avatar needed more than a face. I prepared footage, organized material about my work, and considered how the voice should sound.</p>
      </header>
      <div className="im-element im-appearance" data-im-reveal>
        <div className="im-element-copy"><span className="im-kicker">01 / APPEARANCE</span><h4>Start with<br/>a familiar face.</h4><p>The recording plan used 4K footage and covered three states: listening, speaking and idle.</p></div>
        <div className="im-recording">{media(introMeMedia.recording)}<ol className="im-recording-states" aria-label="Planned recording states">{introMeRecordingStates.map(state => <li key={state.label}><span>{state.label}</span><strong>{state.duration}</strong></li>)}</ol><p className="im-recording-note">Planned footage durations</p></div>
      </div>
      <div className="im-element im-knowledge" data-im-reveal>
        <div className="im-element-copy"><span className="im-kicker">02 / KNOWLEDGE</span><h4>Give it something<br/>worth saying.</h4><p>I brought together material about my background, personality and projects, then wrote instructions to help the avatar connect the ideas behind the work.</p></div>
        <div className="im-knowledge-content"><ul className="im-topics">{introMeKnowledge.map((topic, index) => <li key={topic.title}><span>0{index + 1}</span><div><h5>{topic.title}</h5><p>{topic.description}</p></div></li>)}</ul><blockquote className="im-prompt"><p>“Help users quickly understand who Ci is, what he works on, and what themes connect his projects.”</p><cite>From the project introduction prompt</cite></blockquote></div>
      </div>
      <div className="im-element im-voice" data-im-reveal>
        <div className="im-element-copy"><span className="im-kicker">03 / VOICE</span><h4>Consider how it sounds.</h4><p>I explored the avatar’s voice settings with ElevenLabs selected as the voice engine, paying attention to pace, energy and accent.</p></div>
        <div className="im-voice-source">{media({ ...introMeMedia.voice, sizes: '(max-width: 760px) calc(100vw - 44px), (orientation: portrait) and (max-width: 864px) calc(100vw - 64px), (orientation: portrait) 800px, (min-width: 1600px) 826px, (min-width: 1001px) calc(57.6vw - 67.2px), calc(57.6vw - 38.4px)' })}</div>
        <dl className="im-voice-directions">{introMeVoice.map(direction => <div key={direction.title}><dt>{direction.title}</dt><dd>{direction.description}</dd></div>)}</dl>
      </div>
    </section>

    <section className="im-chapter im-limits" data-introme-chapter="05" data-introme-stage="revised" aria-labelledby="im-chapter-05">
      <header className="im-section-heading" data-im-reveal><p className="im-eyebrow">05 / DESIGNING THE LIMITS</p><h3 id="im-chapter-05">A voice with boundaries.</h3><p>I wrote these as design rules for the avatar. They describe the intended behavior; they are not evidence of systematically tested reliability.</p></header>
      <ol className="im-limit-list">{introMeLimits.map((rule, i) => <li key={rule.title} data-im-reveal><span className="im-step-index">0{i + 1}</span><h4>{rule.title}</h4><p>{rule.body}</p></li>)}</ol>
    </section>

    <section className="im-chapter im-reflection" data-introme-chapter="06" data-introme-stage="revised" aria-labelledby="im-chapter-06">
      <header className="im-section-heading" data-im-reveal><p className="im-eyebrow">06 / BRINGING IT INTO THE PORTFOLIO</p><h3 id="im-chapter-06">AI as a tool.</h3><p>I embedded a HeyGen avatar into my Weebly portfolio, giving visitors another way to meet me and learn about my work.</p></header>
      <div className="im-reflection-layout" data-im-reveal>
        <div className="im-reflection-copy"><p className="im-reflection-statement">A way to make what wasn’t possible before.</p><p>For me, AI’s value was in making a new kind of portfolio experience possible. Preparing the material, shaping the instructions and refining the output remained my work.</p><p className="im-kicker">MY CONTRIBUTION</p><ul className="im-contribution" aria-label="Working with AI"><li>Feed content</li><li>Write documents</li><li>Adjust the outcome</li></ul><p>I explored avatar workflows, prepared appearance, knowledge and voice, wrote the conversation rules, and brought the avatar into the website.</p></div>
        <div className="im-reflection-media">{media(introMeMedia.aiTool)}<p className="im-diagram-description">The concept connects project input, an agent, HeyGen and a portfolio website, with video, a knowledge base, ElevenLabs and a language model as supporting inputs.</p></div>
      </div>
      <CapstonePresentation active={active}/>
    </section>
  </div>;
}
