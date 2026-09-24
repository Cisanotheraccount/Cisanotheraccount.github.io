import { BrandGlass } from '../shared/brandGlass/BrandGlass';
import './photographyBrand.css';

const logo = new URL('./assets/logo.svg', import.meta.url).href;
const normal = new URL('./assets/logo-optics.png', import.meta.url).href;
const mask = new URL('./assets/logo-mask.png', import.meta.url).href;
const highlight = new URL('./assets/logo-highlight.png', import.meta.url).href;

export function PhotographyBrand({ subtitle }: { subtitle: string }) {
  return <span className="photo-brand-content">
    <span className="photo-brand-lockup">
      <span className="photo-brand-logo" aria-hidden="true">
        <img src={logo} alt="" width="1160" height="1040" />
        <BrandGlass normal={normal} mask={mask} highlight={highlight}/>
      </span>
      <span className="photo-brand-text">GALA X CI</span>
    </span>
    <span className="photo-brand-sub">{subtitle}</span>
  </span>;
}
