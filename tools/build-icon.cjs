// Format conversion only: preserve the supplied artwork, no generative redraw.
const {app,nativeImage}=require('electron'),fs=require('node:fs'),path=require('node:path');
app.whenReady().then(()=>{
const root=path.join(__dirname,'..','desktop','assets'),original=nativeImage.createFromPath(path.join(root,'app-icon-source.png'));
if(original.isEmpty())throw Error('Falta la imagen original del icono');
const sizes=[16,24,32,48,64,128,256],images=sizes.map(size=>{
  const image=original.resize({width:size,height:size,quality:'best'});
  if(size===256)return image.toPNG();
  // Standard bottom-up BGRA DIB + AND mask for Windows/GDI small icons.
  const bitmap=image.toBitmap(),stride=Math.ceil(size/32)*4,dib=Buffer.alloc(40+size*size*4+stride*size);
  dib.writeUInt32LE(40,0);dib.writeInt32LE(size,4);dib.writeInt32LE(size*2,8);dib.writeUInt16LE(1,12);dib.writeUInt16LE(32,14);dib.writeUInt32LE(size*size*4,20);
  for(let row=0;row<size;row++)bitmap.copy(dib,40+(size-1-row)*size*4,row*size*4,(row+1)*size*4);
  return dib;
});
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
images.forEach((image,index)=>{const at=6+index*16,size=sizes[index];header[at]=header[at+1]=size===256?0:size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(image.length,at+8);header.writeUInt32LE(offset,at+12);offset+=image.length;});
fs.writeFileSync(path.join(root,'lqtac-studio.ico'),Buffer.concat([header,...images]));fs.writeFileSync(path.join(root,'lqtac-studio.png'),original.resize({width:256,height:256,quality:'best'}).toPNG());console.log('Icono LQTAC: ICO multirresolución + PNG, desde la imagen original');
app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
