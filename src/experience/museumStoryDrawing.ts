export type StoryPoint={anchor:string;title:string;detail:string}
export type MuseumStory={kind:string;labels:string[];milestones?:StoryPoint[]}
/** Conceptual line diagrams and timelines; labels always come from i18n. */
export function drawMuseumStory(c:CanvasRenderingContext2D,story:MuseumStory,x:number,y:number,w:number,h:number,rtl:boolean){
 c.save();c.translate(x,y);c.scale(w/600,h/360);c.fillStyle='#141a19';c.fillRect(0,0,600,360);c.strokeStyle='#9e86512b';c.lineWidth=.7
 for(let n=20;n<600;n+=30){c.beginPath();c.moveTo(n,0);c.lineTo(n,360);c.stroke()}for(let n=15;n<360;n+=30){c.beginPath();c.moveTo(0,n);c.lineTo(600,n);c.stroke()}
 const line=(x:number,y:number,x2:number,y2:number)=>{c.strokeStyle='#c9a86a';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()}
 const text=(value:string,x:number,y:number,size=25,max=560)=>{c.direction=rtl?'rtl':'ltr';c.textAlign='center';c.font=`500 ${size}px "Vazirmatn","Space Grotesk",sans-serif`;c.fillStyle='#e3dcc9';c.fillText(value,x,y,max)}
 const box=(x:number,y:number,w:number,h:number)=>{c.fillStyle='#202826';c.fillRect(x,y,w,h);c.strokeStyle='#bda36b';c.lineWidth=2;c.strokeRect(x,y,w,h)}
 const circle=(x:number,y:number,r:number)=>{c.strokeStyle='#d2b477';c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke()}
 if(story.milestones){
  const side=rtl?566:34;line(side,30,side,324)
  story.milestones.forEach((point,i)=>{const yy=42+i*108;circle(side,yy+16,6);c.textAlign=rtl?'right':'left';c.direction=rtl?'rtl':'ltr';const xx=rtl?535:66;c.fillStyle='#e2b66c';c.font='500 55px "Space Grotesk","Vazirmatn",sans-serif';c.fillText(point.anchor,xx,yy+29,164);c.fillStyle='#e3dcc9';c.font='500 30px "Vazirmatn","Space Grotesk",sans-serif';c.fillText(point.title,rtl?352:248,yy+8,310);c.fillStyle='#c2c7bd';c.font='400 24px "Vazirmatn","Space Grotesk",sans-serif';c.fillText(point.detail,rtl?352:248,yy+44,310)})
 }else if(story.kind==='memory'){
  for(let row=0;row<4;row++)for(let col=0;col<5;col++){box(40+col*48,75+row*44,34,28);line(34,89+row*44,290,89+row*44)}
  for(let col=0;col<5;col++)line(57+col*48,58,57+col*48,264)
  c.strokeStyle='#ffb547';c.strokeRect(131,114,44,40);line(175,134,354,134);box(354,91,202,155);line(375,163,428,163);line(428,132,428,191);line(440,142,440,183);line(440,163,509,163);line(500,153,518,153);line(500,174,518,174);line(509,174,509,213)
  text(story.labels[0],160,35,24,280);text(story.labels[1],160,300,24,280);text(story.labels[2],457,283,24,260);text(story.labels[3],457,56,24,260)
 }else if(story.kind==='gpu'){
  for(let i=0;i<4;i++)box(46+(i%2)*84,92+Math.floor(i/2)*100,65,77)
  for(let i=0;i<24;i++)box(300+(i%6)*44,96+Math.floor(i/6)*48,33,34)
  text(story.labels[0],125,55,26,220);text(story.labels[1],425,55,26,280);line(64,301,546,301);for(const xx of [85,163,330,414,500]){line(xx,286,xx,301);circle(xx,301,3)}text(story.labels[2],300,345,27)
 }else if(story.kind==='motherboard'){
  const nodes=[[75,80,195,75],[360,80,200,75],[45,246,215,72],[355,246,205,72],[207,8,190,52]]
  for(const [a,b,d,e]of nodes)box(a,b,d,e)
  line(270,117,360,117);line(300,60,300,214);line(172,155,172,214);line(172,214,454,214);line(454,214,454,246);line(151,214,151,246);line(454,155,454,214)
  nodes.forEach(([a,b,d,e],i)=>text(story.labels[i],a+d/2,b+e/2+9,25,d-12))
 }else if(story.kind==='terminal'){
  box(162,35,276,172);box(189,60,222,118);line(200,92,330,92);line(200,118,365,118);line(200,144,289,144);box(118,245,364,70);for(let i=0;i<10;i++)box(132+i*34,259,25,14);text(story.labels[0],300,227,24);text(story.labels[1],300,348,24)
 }else if(story.kind==='cycle'){
  const nodes=[[35,65,185,74],[380,65,185,74],[209,232,185,74]];nodes.forEach(([a,b,d,e],i)=>{box(a,b,d,e);text(story.labels[i],a+d/2,b+46,27,d-12)})
  line(220,100,375,100);line(472,139,398,234);line(209,269,126,141);for(const [a,b]of [[367,100],[400,228],[131,148]]){line(a,b,a-10,b-6);line(a,b,a-10,b+6)}
  story.labels.slice(3).forEach((label,i)=>text(label,100+i*200,348,23,190))
 }else{
  circle(166,167,106);circle(166,167,73);circle(166,167,15);line(267,265,176,150);circle(267,265,8)
  for(let i=0;i<9;i++)box(365+(i%3)*58,86+Math.floor(i/3)*53,44,35)
  text(story.labels[0],151,35,24,280);text(story.labels[1],135,310,23,250);text(story.labels[2],270,348,23,370);text(story.labels[3],455,282,24,275)
 }
 c.restore()
}
