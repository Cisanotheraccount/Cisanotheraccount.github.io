from pathlib import Path
import sys, json, math
ROOT=Path(__file__).resolve().parents[2]/'public'/'v-next'
sys.path.insert(0,str(ROOT/'tool-deps'))
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
import shapely
from shapely.geometry import Polygon
from shapely.ops import unary_union, transform
from shapely.affinity import translate,scale
import uharfbuzz as hb
font_path=ROOT/'Pacifico-Regular.ttf'
f=TTFont(font_path)
gs=f.getGlyphSet()
class FlattenPen(BasePen):
 def __init__(self, glyphset):
  super().__init__(glyphset); self.contours=[]; self.current=[]
 def _moveTo(self,p): self.current=[p]
 def _lineTo(self,p): self.current.append(p)
 def _qCurveToOne(self,p1,p2):
  p0=self._getCurrentPoint(); l=sum(math.dist(a,b) for a,b in [(p0,p1),(p1,p2)]); n=max(6,math.ceil(l/5))
  for i in range(1,n+1):
   t=i/n; s=1-t; self.current.append((s*s*p0[0]+2*s*t*p1[0]+t*t*p2[0],s*s*p0[1]+2*s*t*p1[1]+t*t*p2[1]))
 def _curveToOne(self,p1,p2,p3):
  p0=self._getCurrentPoint(); l=sum(math.dist(a,b) for a,b in [(p0,p1),(p1,p2),(p2,p3)]); n=max(8,math.ceil(l/5))
  for i in range(1,n+1):
   t=i/n;s=1-t;self.current.append((s**3*p0[0]+3*s*s*t*p1[0]+3*s*t*t*p2[0]+t**3*p3[0],s**3*p0[1]+3*s*s*t*p1[1]+3*s*t*t*p2[1]+t**3*p3[1]))
 def _closePath(self):
  if len(self.current)>2:self.contours.append(self.current)
  self.current=[]
 def _endPath(self): self._closePath()
def to_poly(glyphname):
 p=FlattenPen(gs);gs[glyphname].draw(p)
 out=Polygon()
 for ring in p.contours:
  poly=Polygon(ring)
  if not poly.is_valid:poly=shapely.make_valid(poly)
  out=out.symmetric_difference(poly)
 return out
face=hb.Face(font_path.read_bytes());hf=hb.Font(face);hf.scale=(face.upem,face.upem)
buf=hb.Buffer();buf.add_str('galaxci');buf.guess_segment_properties();hb.shape(hf,buf,{'kern':True,'liga':True,'calt':True})
positions=[];polys=[];cursor=0
# Optical pair adjustment after shaping; narrow only the join while preserving counters.
pair_adjustments=[-4, 2, -3, 3, -4, -2, 0]
for index,(info,pos) in enumerate(zip(buf.glyph_infos,buf.glyph_positions)):
 name=f.getGlyphName(info.codepoint);poly=to_poly(name)
 poly=translate(poly,xoff=cursor+pos.x_offset,yoff=pos.y_offset)
 polys.append(poly);positions.append({'glyph':name,'cluster':info.cluster,'origin':cursor+pos.x_offset,'advance':pos.x_advance,'bounds':poly.bounds});cursor+=pos.x_advance+pair_adjustments[index]
shape=unary_union(polys)
# Slightly compact the ascender and descender for a balanced hero wordmark.
# A small extra lean keeps the full silhouette feeling like one gesture.
def optical_warp(x,y,z=None):
 try:
  return tuple(a+0.022*b for a,b in zip(x,y)), tuple(b*0.91 if b<0 else 468+(b-468)*0.9 if b>468 else b for b in y)
 except TypeError:
  return x+0.022*y, y*0.91 if y<0 else 468+(y-468)*0.9 if y>468 else y
shape=transform(optical_warp,shape)
print('Font upem',face.upem,'Shaping',positions)
print('Natural shape components:',len(shape.geoms) if shape.geom_type=='MultiPolygon' else 1)
for i in range(len(polys)-1): print('gap',i,polys[i].distance(polys[i+1]))
# Natural Pacifico joins share contours, except a few align on their boundary.
# A 1.75-unit soft contour closing unifies such touching joins and rounds the silhouette.
shape=shape.buffer(1.75,quad_segs=5).buffer(-1.75,quad_segs=5)
# Inscribed contour simplification is below 0.4 font units, visually subpixel at display size.
shape=shape.simplify(0.35,preserve_topology=True)
minx,miny,maxx,maxy=shape.bounds
factor=10/(maxy-miny)
shape=scale(translate(shape,xoff=-(maxx+minx)/2,yoff=-(maxy+miny)/2),xfact=factor,yfact=factor,origin=(0,0))
parts=list(shape.geoms) if shape.geom_type=='MultiPolygon' else [shape]
parts.sort(key=lambda p:p.area,reverse=True)
coord=lambda ring:[[round(x,5),round(y,5)] for x,y in list(ring.coords)[:-1]]
output={'width':round((maxx-minx)*factor,5),'height':10,'shapes':[{'outer':coord(p.exterior),'holes':[coord(h) for h in p.interiors]} for p in parts]}
(ROOT/'galaxci-shapes.json').write_text(json.dumps(output,separators=(',',':'))+'\n')
width=output['width'];paths=[]
for part in output['shapes']:
 d=''
 for ring in [part['outer'],*part['holes']]:
  d+='M'+' L'.join(f'{x:.5f},{-y:.5f}' for x,y in ring)+'Z '
 paths.append(d)
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-width/2-0.6} -5.6 {width+1.2} 11.2"><title>galaxci — continuous script wordmark</title><g fill="currentColor" fill-rule="evenodd">'+''.join(f'<path d="{d}"/>' for d in paths)+'</g></svg>'
(ROOT/'galaxci-silhouette.svg').write_text(svg)
manifest={'text':'galaxci','source_font':'Pacifico Regular','source_url':'https://raw.githubusercontent.com/google/fonts/main/ofl/pacifico/Pacifico-Regular.ttf','license':'SIL Open Font License 1.1; see OFL.txt','geometry':'Shaped with HarfBuzz kern/liga/calt; optical pair spacing [-4,+2,-3,+3,-4,-2] font units; 10% ascender and 9% descender compression; 0.022 extra x/y lean; flattened font contours; unioned script letters; 1.75 font-unit contour closing, 0.35 font-unit topology-preserving simplification. Centered, y-up, normalized height 10.','font_upem':face.upem,'glyph_positions':positions,'components':len(parts),'holes':[len(p.interiors) for p in parts],'points':[len(p.exterior.coords)-1+sum(len(h.coords)-1 for h in p.interiors) for p in parts],'bounds':list(shape.bounds),'dependencies':{'fontTools':'4.65.0','shapely':'2.1.2','uharfbuzz':'0.56.1'}}
(ROOT/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Output',manifest)
