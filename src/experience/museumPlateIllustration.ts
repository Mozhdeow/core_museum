/** Authored local hardware illustrations; never product photography or catalog records. */
export function drawHardwareIllustration(c:CanvasRenderingContext2D,kind:string,x:number,y:number,width:number,height:number){
 c.save();c.translate(x,y);c.scale(width/600,height/360)
 const paper=c.createLinearGradient(0,0,600,360);paper.addColorStop(0,'#252726');paper.addColorStop(1,'#101313');c.fillStyle=paper;c.fillRect(0,0,600,360)
 c.strokeStyle='#b2945940';c.lineWidth=.7
 for(let i=20;i<600;i+=28){c.beginPath();c.moveTo(i,0);c.lineTo(i,360);c.stroke()}
 for(let i=12;i<360;i+=28){c.beginPath();c.moveTo(0,i);c.lineTo(600,i);c.stroke()}
 const rect=(x:number,y:number,w:number,h:number,fill='#343b36',stroke='#a8905a')=>{c.fillStyle=fill;c.fillRect(x,y,w,h);c.strokeStyle=stroke;c.lineWidth=1.8;c.strokeRect(x,y,w,h)}
 const chip=(x:number,y:number,w:number,h:number)=>{rect(x,y,w,h,'#202626','#747c72');c.fillStyle='#c7b375';c.fillRect(x+4,y+4,w-8,2);for(let i=5;i<w;i+=9){c.fillRect(x+i,y-4,3,4);c.fillRect(x+i,y+h,3,4)}}
 const fan=(x:number,y:number)=>{const g=c.createRadialGradient(x,y,5,x,y,77);g.addColorStop(0,'#323b3b');g.addColorStop(.65,'#68716d');g.addColorStop(1,'#1a2020');c.fillStyle=g;c.beginPath();c.arc(x,y,78,0,Math.PI*2);c.fill();c.strokeStyle='#c3aa6b';c.stroke();for(let n=0;n<9;n++){c.save();c.translate(x,y);c.rotate(n*Math.PI*2/9);c.fillStyle='#202827';c.beginPath();c.moveTo(12,0);c.quadraticCurveTo(36,-36,71,-19);c.quadraticCurveTo(65,13,19,13);c.closePath();c.fill();c.restore()}c.fillStyle='#8f9b91';c.beginPath();c.arc(x,y,17,0,Math.PI*2);c.fill()}
 if(kind==='gpu'){
  rect(45,86,510,188,'#454c48');rect(61,99,478,161,'#232b29');fan(183,179);fan(417,179);rect(136,275,272,12,'#bda366');rect(32,76,12,215,'#818b85');
 }else if(kind==='memory'){
  rect(32,116,536,131,'#334c3c');for(let i=0;i<8;i++)chip(54+i*64,144,47,64);for(let i=0;i<34;i++)rect(48+i*15,249,10,20,'#baa66a','#cfbc80');rect(309,246,12,26,'#141918','#141918');
 }else if(kind==='motherboard'){
  rect(124,25,352,309,'#34483a');for(let i=0;i<12;i++){c.strokeStyle='#b19a5b66';c.lineWidth=1;c.beginPath();c.moveTo(178+i*11,190);c.lineTo(178+i*11,232+i*3);c.lineTo(423-i*8,232+i*3);c.stroke()}chip(220,86,113,113);rect(239,106,76,75,'#9a9e8a');for(let i=0;i<3;i++)rect(373+i*23,70,12,159,'#9d987b');for(let i=0;i<3;i++)rect(151,255+i*19,168,10,'#a6a997');for(let i=0;i<5;i++)chip(154+i*20,47,14,24);rect(112,50,20,135,'#8d9893');
 }else if(kind==='storage'){
  rect(177,25,246,310,'#737f79');rect(186,35,228,291,'#333e3a');const g=c.createRadialGradient(295,165,10,295,165,103);g.addColorStop(0,'#394b47');g.addColorStop(.45,'#b1b7a6');g.addColorStop(1,'#616e63');c.fillStyle=g;c.beginPath();c.arc(295,165,102,0,Math.PI*2);c.fill();for(const r of [19,40,70,96]){c.strokeStyle='#ded8b266';c.beginPath();c.arc(295,165,r,0,Math.PI*2);c.stroke()}c.strokeStyle='#c8b67d';c.lineWidth=12;c.beginPath();c.moveTo(392,282);c.lineTo(301,168);c.stroke();chip(209,286,63,20);
 }else{
  rect(174,48,252,252,'#3e4a3c');rect(203,78,194,194,'#9b9b80');rect(245,120,109,109,'#59615b');for(let i=0;i<12;i++){const p=187+i*21;for(const side of [0,1]){rect(p,side?302:34,9,13,'#bdab6d');rect(side?428:160,p-135,13,9,'#bdab6d')}}c.fillStyle='#ded3a8';c.textAlign='center';c.font='500 19px sans-serif';c.fillText('CORE',300,185)
 }
 const wash=c.createLinearGradient(0,0,600,330);wash.addColorStop(0,'#ffd79812');wash.addColorStop(.55,'#ffffff00');wash.addColorStop(1,'#00000044');c.fillStyle=wash;c.fillRect(0,0,600,360)
 c.restore()
}
