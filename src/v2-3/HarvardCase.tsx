import type { ReactNode, RefObject } from 'react';
import type { HarvardCaseData, HarvardMedia, HarvardSection } from './harvardCaseTypes';
import './harvardCase.css';

export type HarvardStudy = {
  image: string; alt: string; caption: string; width: number; height: number;
  srcSet?: string; sizes?: string; loading?: 'lazy' | 'eager';
};

type Props = {
  data: HarvardCaseData;
  heading: RefObject<HTMLHeadingElement | null>;
  slot: RefObject<HTMLDivElement | null>;
  renderStudy(study: HarvardStudy): ReactNode;
};

const number = (index: number) => String(index + 1).padStart(2, '0');
function Copy({ paragraphs }: { paragraphs?: string[] }) {
  return paragraphs?.length ? <div className="hc-copy">{paragraphs.map((text, i) => <p key={i}>{text}</p>)}</div> : null;
}

export function HarvardCase({ data, heading, slot, renderStudy }: Props) {
  const media = (asset: HarvardMedia, eager = false) => <div className="hc-media" key={asset.id} data-source-node={asset.sourceNode} data-surface={asset.background}>
    {renderStudy({ ...asset, caption: asset.caption ?? asset.alt, sizes: '(max-width: 760px) calc(100vw - 44px), (max-width: 1000px) calc(100vw - 64px), 80vw', loading: eager ? 'eager' : 'lazy' })}
  </div>;
  const section = (block: HarvardSection) => <section className="hc-section" key={block.id} data-layout={block.layout} data-section-id={block.id} data-source-nodes={block.sourceNodes?.join(' ')} aria-labelledby={block.title ? `${data.slug}-${block.id}` : undefined}>
    {(block.title || block.body?.length) && <div className="hc-section-copy">
      {block.title && <h4 id={`${data.slug}-${block.id}`}>{block.title}</h4>}
      <Copy paragraphs={block.body}/>
    </div>}
    {!!block.media?.length && <div className="hc-media-set" data-count={block.media.length} data-portrait={block.media.every(asset => asset.height / asset.width > 1.3) || undefined}>{block.media.map(asset => media(asset))}</div>}
    {block.table && <div className="hc-table-scroll" data-columns={block.table.columns.length} tabIndex={0} role="region" aria-label={block.table.caption}><table><caption>{block.table.caption}</caption><thead><tr>{block.table.columns.map((label, i) => <th key={i} scope="col">{label}</th>)}</tr></thead><tbody>{block.table.rows.map((row, i) => <tr key={i}>{row.map((value, j) => j === 0 ? <th key={j} scope="row">{value}</th> : <td key={j}>{value}</td>)}</tr>)}</tbody></table></div>}
    {!!block.items?.length && <div className="hc-items" role={block.layout === 'steps' ? 'list' : undefined} data-count={block.items.length} data-portrait={block.items.every(item => item.media && item.media.height / item.media.width > 1.3) || undefined}>{block.items.map((item, i) => <div className="hc-item" role={block.layout === 'steps' ? 'listitem' : undefined} key={i} data-source-nodes={item.sourceNodes?.join(' ')}>
      <div className="hc-item-heading">{block.layout === 'steps' && <span className="hc-step-number">{number(i)}</span>}{item.title && !(block.layout === 'steps' && /^\d+$/.test(item.title.trim())) && <h5>{item.title}</h5>}</div>
      {item.media && media(item.media)}
      <Copy paragraphs={item.body}/>
    </div>)}</div>}
  </section>;

  return <div className="hc-case" data-case={data.slug}>
    <section className="hc-intro" data-source-frame={data.coverFrame} aria-labelledby="gxc-detail-title">
      <header className="hc-hero-heading">
        <div className="hc-kicker"><span className="gxc-mono">SELECTED WORK / {data.kind}</span>{data.mark && <img className="hc-project-mark" src={data.mark.image} alt="" width={data.mark.width} height={data.mark.height}/>}</div>
        <h2 ref={heading} id="gxc-detail-title" tabIndex={-1}>{data.title}</h2>
        {data.subtitle && <p className="hc-subtitle">{data.subtitle}</p>}
        <div className="hc-project-meta"><p>{data.period}</p><ul aria-label="Project disciplines">{data.tags.map((tag, i) => <li key={i}>{tag}</li>)}</ul></div>
      </header>
      <div className="hc-hero-media" ref={slot}>{media(data.hero, true)}</div>
    </section>
    <nav className="hc-contents" aria-label={`${data.title} chapters`}>{data.chapters.map((chapter, i) => <button key={chapter.id} onClick={() => {
      const target = document.getElementById(`${data.slug}-chapter-${chapter.id}`);
      target?.scrollIntoView({ block: 'start', behavior: 'instant' });
      target?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    }}><span>{number(i)}</span>{chapter.title}</button>)}</nav>
    {data.chapters.map((chapter, i) => <section className="hc-chapter" key={chapter.id} id={`${data.slug}-chapter-${chapter.id}`} data-source-frame={chapter.sourceFrame} aria-labelledby={`${data.slug}-chapter-title-${chapter.id}`}>
      <header className="hc-chapter-heading"><span className="hc-chapter-number" aria-hidden="true">{number(i)}</span><div><h3 id={`${data.slug}-chapter-title-${chapter.id}`} tabIndex={-1}>{chapter.title}</h3><Copy paragraphs={chapter.lead}/></div></header>
      <div className="hc-chapter-body">{chapter.sections.map(section)}</div>
    </section>)}
  </div>;
}
