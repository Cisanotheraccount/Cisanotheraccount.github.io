"""Generate a watertight inflated script without changing the source XY outline.

Uses constrained Delaunay triangulation and a finite-element torsion field.
The field satisfies -Laplacian(u)=1 inside, u=0 on outer and hole boundaries.
Taking z = scale*sqrt(u) produces a rounded front/back meeting with vertical
edge tangent. Unlike a distance field, the interior is smooth across medial axes.
"""
from pathlib import Path
import sys,json,math,time
ROOT=Path(__file__).resolve().parents[2]/'public'/'v-next'
sys.path.insert(0,str(ROOT/'tool-deps'))
import numpy as np
import triangle
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve
from shapely.geometry import Polygon
from collections import Counter
SRC=json.loads((ROOT/'galaxci-shapes.json').read_text())
def cross2(a,b): return a[...,0]*b[...,1]-a[...,1]*b[...,0]
meshes=[]
start=time.time()
for part_id,part in enumerate(SRC['shapes']):
 verts=[];segments=[];holes=[]
 for ring_id,ring in enumerate([part['outer'],*part['holes']]):
  offset=len(verts);verts.extend(ring)
  segments.extend([[offset+i,offset+(i+1)%len(ring)] for i in range(len(ring))])
  if ring_id: holes.append(list(Polygon(ring).representative_point().coords)[0])
 data={'vertices':np.array(verts,dtype=float),'segments':np.array(segments,dtype=np.int32)}
 if holes:data['holes']=np.array(holes,dtype=float)
 tri=triangle.triangulate(data,'pq28a0.0035Q')
 v=np.array(tri['vertices']);t=np.array(tri['triangles'])
 # Force all front facets counterclockwise.
 cross=cross2(v[t[:,1]]-v[t[:,0]],v[t[:,2]]-v[t[:,0]])
 negative=cross<0;t[negative]=t[negative][:,[0,2,1]]
 pts=v[t];area=cross2(pts[:,1]-pts[:,0],pts[:,2]-pts[:,0])/2
 assert np.all(area>1e-14),'Degenerate front facets'
 b=np.stack([pts[:,1,1]-pts[:,2,1],pts[:,2,1]-pts[:,0,1],pts[:,0,1]-pts[:,1,1]],axis=1)
 c=np.stack([pts[:,2,0]-pts[:,1,0],pts[:,0,0]-pts[:,2,0],pts[:,1,0]-pts[:,0,0]],axis=1)
 local=(b[:,:,None]*b[:,None,:]+c[:,:,None]*c[:,None,:])/(4*area[:,None,None])
 rows=np.repeat(t,3,axis=1).ravel();cols=np.tile(t,(1,3)).ravel()
 K=coo_matrix((local.ravel(),(rows,cols)),shape=(len(v),len(v))).tocsr()
 load=np.zeros(len(v));np.add.at(load,t.ravel(),np.repeat(area/3,3))
 bound=np.flatnonzero(tri['vertex_markers'].ravel()!=0);interior=np.setdiff1d(np.arange(len(v)),bound)
 u=np.zeros(len(v));u[interior]=spsolve(K[interior][:,interior],load[interior])
 assert np.min(u)>-1e-9,'Negative torsion field'
 # Include boundaries with inserted Steiner vertices without altering the source curve.
 polygon=Polygon(part['outer'],part['holes'])
 centers=v[t].mean(axis=1)
 assert all(polygon.covers(Polygon(v[ids]).representative_point()) for ids in t),'Facet inside a counter or beyond outline'
 # Recover smooth vertex derivatives from a quadratic fit on two-ring neighborhoods.
 adjacency=[set() for _ in v]
 for ids in t:
  for a_id in ids: adjacency[a_id].update(int(b_id) for b_id in ids if b_id!=a_id)
 grad=np.zeros((len(v),2))
 for v_id in range(len(v)):
  neighbors=set(adjacency[v_id])
  for n_id in adjacency[v_id]: neighbors.update(adjacency[n_id])
  neighbors.add(v_id); ni=np.array(sorted(neighbors))
  delta=v[ni]-v[v_id]; radius=np.linalg.norm(delta,axis=1).max();delta/=radius
  x,y=delta.T; weights=1/np.maximum(np.linalg.norm(delta,axis=1),.18)
  design=np.column_stack([np.ones(len(ni)),x,y,x*x,x*y,y*y])*weights[:,None]
  coeff=np.linalg.lstsq(design,u[ni]*weights,rcond=None)[0]
  grad[v_id]=coeff[1:3]/radius
 meshes.append({'grad':grad,'v':v,'t':t,'u':u,'boundary':bound,'interior':interior,'part':part_id,'holes':len(holes),'area':float(area.sum())})
 print('Triangulated',part_id,'vertices',len(v),'faces',len(t),'boundary',len(bound),'max torsion',u.max(),flush=True)

# One scale for the entire script preserves natural variations in stroke thickness.
scale=.64/math.sqrt(max(float(m['u'].max()) for m in meshes))
positions=[];indices=[];part_info=[];recovered_normals=[]
for m in meshes:
 v=m['v'];t=m['t'];n=len(v);base=len(positions);z=scale*np.sqrt(np.maximum(m['u'],0))
 top=np.arange(n,dtype=np.int32)+base
 bottom=top.copy();bottom[m['interior']]=np.arange(len(m['interior']))+n+base
 positions.extend(np.column_stack([v,z]).tolist())
 positions.extend(np.column_stack([v[m['interior']],-z[m['interior']]]).tolist())
 front_normal=np.column_stack([-scale*m['grad'],2*np.sqrt(np.maximum(m['u'],0))])
 front_normal/=np.linalg.norm(front_normal,axis=1)[:,None]
 recovered_normals.extend(front_normal.tolist())
 back_normal=front_normal[m['interior']].copy();back_normal[:,2]*=-1
 recovered_normals.extend(back_normal.tolist())
 start_face=len(indices);indices.extend(top[t].tolist());indices.extend(bottom[t][:,[0,2,1]].tolist())
 part_info.append({'component':m['part'],'vertex_start':base,'vertex_count':n+len(m['interior']),'triangle_start':start_face,'triangle_count':2*len(t),'xy_area':m['area'],'holes':m['holes'],'max_half_thickness':float(z.max())})
p=np.array(positions);idx=np.array(indices,dtype=np.int32)
assert len(p)<60000, f'Too many vertices: {len(p)}'
# Angle-weighted normals give continuous highlight flow without triangle-size bias.
normals=np.zeros_like(p)
fpoints=p[idx];edges1=fpoints[:,1]-fpoints[:,0];edges2=fpoints[:,2]-fpoints[:,0]
face_cross=np.cross(edges1,edges2);face_length=np.linalg.norm(face_cross,axis=1)
assert np.min(face_length)>1e-12,'Degenerate closed-surface facet'
fn=face_cross/face_length[:,None]
for k in range(3):
 a=fpoints[:,(k+1)%3]-fpoints[:,k];b=fpoints[:,(k+2)%3]-fpoints[:,k]
 a/=np.linalg.norm(a,axis=1)[:,None];b/=np.linalg.norm(b,axis=1)[:,None]
 angle=np.arccos(np.clip(np.einsum('ij,ij->i',a,b),-1,1))
 np.add.at(normals,idx[:,k],fn*angle[:,None])
normals/=np.linalg.norm(normals,axis=1)[:,None]
# Prefer reconstructed continuous field normals over triangle surface averages.
normals=np.array(recovered_normals)
# Closed two-manifold edge and Euler characteristic checks.
edges=Counter();oriented=Counter()
for a,b,c in idx:
 for x,y in [(a,b),(b,c),(c,a)]:
  edges[tuple(sorted((int(x),int(y))))]+=1;oriented[(int(x),int(y))]+=1
bad=[e for e,n in edges.items() if n!=2]
assert not bad,f'Nonmanifold edges: {len(bad)}'
assert all(oriented[(b,a)]==n for (a,b),n in oriented.items()),'Inconsistent winding'
euler=len(p)-len(edges)+len(idx)
assert euler==sum(2-2*m['holes'] for m in meshes),(euler,part_info)
volume=np.einsum('ij,ij->i',fpoints[:,0],np.cross(fpoints[:,1],fpoints[:,2])).sum()/6
assert volume>0,'Inward closed surface'
out={'width':SRC['width'],'height':SRC['height'],'positions':np.round(p,6).ravel().tolist(),'normals':np.round(normals,6).ravel().tolist(),'indices':idx.ravel().tolist()}
(ROOT/'galaxci-inflated-mesh.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
report={'source':'galaxci-shapes.json','method':'Constrained Delaunay triangulation with p,q28,a0.0035; P1 FEM torsion field; mirrored z=scale*sqrt(u); two-ring quadratic recovered-gradient normals; shared boundary vertices','vertices':len(p),'triangles':len(idx),'edges':len(edges),'closed_two_manifold':not bad,'opposed_half_edges':True,'euler_characteristic':euler,'components':len(meshes),'total_genus':sum(m['holes'] for m in meshes),'positive_volume':float(volume),'bounds':[p.min(axis=0).tolist(),p.max(axis=0).tolist()],'parts':part_info,'scale':scale,'dependencies':{'triangle':triangle.__version__,'scipy':__import__('scipy').__version__,'numpy':np.__version__,'shapely':__import__('shapely').__version__},'seconds':round(time.time()-start,2)}
(ROOT/'inflated-mesh-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
