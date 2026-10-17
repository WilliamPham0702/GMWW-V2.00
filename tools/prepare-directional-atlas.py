from PIL import Image,ImageDraw,ImageFilter
import numpy as np
from scipy import ndimage
from pathlib import Path
root=Path('assets/characters/v5');im=Image.open(root/'directional/inferred-turnaround-source.png').convert('RGBA')
atlas=Image.new('RGBA',(2160,1440))
order=[0,7,6,5,4,3,2,1]
for direction,idx in enumerate(order):
 if direction==0:
  c=Image.open(root/'hybrid/approved-front.jpeg').convert('RGBA')
  # Only remove white connected to exterior, preserving interior white fabric/flowers.
  import collections
  rgb=c.load();w,h=c.size;seen=set();q=collections.deque()
  for x in range(w):q.append((x,0));q.append((x,h-1))
  for y in range(h):q.append((0,y));q.append((w-1,y))
  while q:
   x,y=q.popleft()
   if x<0 or y<0 or x>=w or y>=h or (x,y) in seen:continue
   seen.add((x,y));r,g,b,a=rgb[x,y]
   if min(r,g,b)>239:
    rgb[x,y]=(r,g,b,0);q.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
  c=c.resize((540,720),Image.Resampling.LANCZOS)
 else:
  col,row=idx%4,idx//4
  c=im.crop((round(col*im.width/4),round(row*im.height/2),round((col+1)*im.width/4),round((row+1)*im.height/2)))
  box=c.getchannel('A').point(lambda a:255 if a>160 else 0).getbbox();c=c.crop(box)
  scale=712/c.height;c=c.resize((round(c.width*scale*.90),712),Image.Resampling.LANCZOS)
  padded=Image.new('RGBA',(540,720));padded.alpha_composite(c,((540-c.width)//2,4));c=padded
  # Align generated neutral-pose head/waist/knee heights to the existing rig's approved front.
  warped=Image.new('RGBA',(540,720));anchors=[(0,0),(.40,.37),(.65,.63),(.8,.76),(1,1)]
  for (sy0,dy0),(sy1,dy1) in zip(anchors,anchors[1:]):
   strip=c.crop((0,round(sy0*720),540,round(sy1*720))).resize((540,round(dy1*720)-round(dy0*720)),Image.Resampling.BICUBIC)
   warped.alpha_composite(strip,(0,round(dy0*720)))
  c=warped
 # Sprite-matte preparation: remove isolated low-alpha fringe and external marker specks.
 a=np.array(c);mask=a[:,:,3]>180
 red=(a[:,:,0]>180)&(a[:,:,1]<105)&(a[:,:,2]<105)
 mask &= ~red
 labels,n=ndimage.label(mask);sizes=np.bincount(labels.ravel());keep=sizes>=24;keep[0]=False;mask=keep[labels]
 distance=ndimage.distance_transform_edt(mask)
 cyan=(a[:,:,0]<80)&(a[:,:,1]>210)&(a[:,:,2]>210)
 mask &= ~(cyan&(distance<4))
 mask=ndimage.binary_erosion(mask,iterations=1)
 alpha=Image.fromarray((mask*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.4));c.putalpha(alpha)
 atlas.alpha_composite(c,((direction%4)*540,(direction//4)*720))
atlas.save(root/'directional/layers-eight-v573.webp',quality=94,method=6)
print('atlas',atlas.size,(root/'directional/layers-eight-v573.webp').stat().st_size)
