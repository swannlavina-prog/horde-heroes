
const W=900,H=600;
const config={type:Phaser.AUTO,parent:'game',backgroundColor:'#1a1d21',
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},
  physics:{default:'arcade',arcade:{debug:false}},scene:[Menu,Game]};
new Phaser.Game(config);

function Menu(){Phaser.Scene.call(this,{key:'m'})} Menu.prototype=Object.create(Phaser.Scene.prototype);
Menu.prototype.constructor=Menu;
function Game(){Phaser.Scene.call(this,{key:'g'})} Game.prototype=Object.create(Phaser.Scene.prototype);
Game.prototype.constructor=Game;

Menu.prototype.create=function(){
  this.add.text(W/2,70,'HORDE  HEROES',{fontFamily:'monospace',fontSize:40,color:'#fff'}).setOrigin(0.5);
  const heroes=[
    {name:'Balanced',color:0x7fd0ff,speed:220,fire:200,hp:3,dmg:1},
    {name:'Speedy',color:0x8dff9e,speed:300,fire:230,hp:2,dmg:1},
    {name:'Tank',color:0xffd37f,speed:170,fire:260,hp:5,dmg:1},
    {name:'Sharpshooter',color:0xff9ef2,speed:210,fire:120,hp:3,dmg:2},
  ];
  const startX=140,gap=190,y=260;
  heroes.forEach((c,i)=>{
    let x=startX+i*gap;
    const card=this.add.rectangle(x,y,160,220,0x23262b).setStrokeStyle(2,0x3b3f46).setInteractive({useHandCursor:true});
    this.add.circle(x,y-60,26,c.color).setStrokeStyle(2,0xffffff);
    this.add.text(x,y+20,c.name,{fontFamily:'monospace',fontSize:18,color:'#ffffff'}).setOrigin(0.5);
    card.on('pointerdown',()=>this.scene.start('g',{hero:c}));
  });
};

let hero,bullets,enemies,buddies,gates,ui={},ctrl={},score,wave,lives,lastShot,spawnT,gateT;

Game.prototype.init=function(data){this.h=data.hero||{speed:220,fire:200,hp:3,dmg:1,color:0x7fd0ff,name:'Balanced'}};
Game.prototype.create=function(){
  score=0;wave=1;lives=this.h.hp;lastShot=0;spawnT=0;gateT=0;
  this.add.rectangle(W*0.25,H*0.5,W*0.4,H*0.9,0x2a2d32).setStrokeStyle(2,0x3b3f46);
  this.add.rectangle(W*0.75,H*0.5,W*0.4,H*0.9,0x25282d).setStrokeStyle(2,0x3b3f46);
  hero=this.add.circle(W*0.5,H*0.85,16,this.h.color); this.physics.add.existing(hero); hero.body.setCollideWorldBounds(true);
  bullets=this.physics.add.group(); enemies=this.physics.add.group(); buddies=this.physics.add.group(); gates=this.physics.add.group();
  addBuddy(this);
  ctrl.cursors=this.input.keyboard.createCursorKeys(); ctrl.keys=this.input.keyboard.addKeys('W,A,S,D,SPACE');
  ui.score=this.add.text(12,10,'Score: 0',{fontFamily:'monospace',fontSize:18,color:'#fff'});
  ui.wave=this.add.text(12,32,'Wave: 1',{fontFamily:'monospace',fontSize:18,color:'#fff'});
  ui.lives=this.add.text(12,54,'Hearts: '+lives,{fontFamily:'monospace',fontSize:18,color:'#fff'});
  buildTouch(this);
  this.physics.add.overlap(bullets,enemies,(b,e)=>{b.destroy(); hit(e,this.h.dmg,this);});
  this.physics.add.overlap(buddies,enemies,(b,e)=>{hit(e,1,this);});
  this.physics.add.overlap(hero,enemies,(_,e)=>{e.destroy(); lose(this);});
  this.physics.add.overlap(hero,gates,(_,g)=>{g.destroy(); addBuddy(this); addScore(5);});
};
Game.prototype.update=function(time,dt){
  const sp=this.h.speed; let vx=0,vy=0; const t=ctrl.touch, k=ctrl.keys, c=ctrl.cursors;
  if(c.left.isDown||k.A.isDown||(t&&t.left)) vx-=sp;
  if(c.right.isDown||k.D.isDown||(t&&t.right)) vx+=sp;
  if(c.up.isDown||k.W.isDown||(t&&t.up)) vy-=sp*0.8;
  if(c.down.isDown||k.S.isDown||(t&&t.down)) vy+=sp*0.8;
  hero.body.setVelocity(vx,vy);
  if((Phaser.Input.Keyboard.JustDown(k.SPACE)||(t&&t.shootOnce)) && time-lastShot>this.h.fire){
    shoot(this,hero.x,hero.y-18,-400); lastShot=time;
  }
  if(t) t.shootOnce=false;
  buddies.children.iterate(b=>{ if(!b) return; if(Phaser.Math.Between(0,20-Math.min(wave,10))===0) shoot(this,b.x,b.y-10,-350); });
  spawnT+=dt; if(spawnT > Math.max(500-wave*25,160)){ spawnT=0; spawnEnemy(this); }
  gateT+=dt; if(gateT > 3500-Math.min(wave*80,1500)){ gateT=0; spawnGate(this); }
  if(score>wave*220){ wave++; ui.wave.setText('Wave: '+wave); }
  [bullets,enemies,gates].forEach(g=>g.children.iterate(o=>{ if(o && (o.y<-60||o.y>H+60)) o.destroy(); }));
};

function shoot(s,x,y,vy){ const b=s.add.rectangle(x,y,4,12,0xffffaa); s.physics.add.existing(b); b.body.setVelocityY(vy); bullets.add(b); }
function addBuddy(s){ const b=s.add.circle(Phaser.Math.Clamp(hero.x+Phaser.Math.Between(-50,50),40,W-40),hero.y+Phaser.Math.Between(20,50),10,0x99ff99); s.physics.add.existing(b); b.body.setCollideWorldBounds(true); buddies.add(b); }
function spawnGate(s){ const x=Phaser.Math.Between(W*0.62,W*0.9), g=s.add.rectangle(x,-16,44,30,0x66aaff).setStrokeStyle(2,0xffffff); const t=s.add.text(x-10,-26,'+1',{fontFamily:'monospace',fontSize:16,color:'#fff'}); s.physics.add.existing(g); g.body.setVelocityY(110); g.on('destroy',()=>t.destroy()); gates.add(g); }
function hit(e,d,s){ e.hp-=d||1; if(e.hp<=0){ for(let i=0;i<8;i++){ const p=s.add.rectangle(e.x,e.y,3,3,0xffaaaa); s.tweens.add({targets:p,x:e.x+Phaser.Math.Between(-18,18),y:e.y+Phaser.Math.Between(-18,18),alpha:0,duration:300,onComplete:()=>p.destroy()}); } e.destroy(); addScore(10);} }
function addScore(n){ score+=n; ui.score.setText('Score: '+score); }
function lose(s){ lives--; ui.lives.setText('Hearts: '+lives); if(lives<=0){ s.scene.start('m'); } }
function spawnEnemy(s){ const r=Phaser.Math.Between(1,100); const x=Phaser.Math.Between(W*0.1,W*0.9); let e; if(r<=60){ e=s.add.rectangle(x,-20,20,20,0xff6666); e.hp=1+Math.floor(wave/4);} else if(r<=80){ e=s.add.triangle(x,-20,0,20,10,0,20,20,0xff8855); e.hp=1; } else { e=s.add.rectangle(x,-40,40,40,0xff5544); e.hp=4+Math.floor(wave/3);} s.physics.add.existing(e); e.body.setVelocityY(70+wave*12); enemies.add(e); e.baseColor=e.fillColor; }
function buildTouch(s){
  if(!s.sys.game.device.input.touch){ ctrl.touch=null; return;}
  ctrl.touch={left:false,right:false,up:false,down:false,shootOnce:false};
  const a=0.25;
  const btn=(x,y,w,h,label,down,up)=>{
    const r=s.add.rectangle(x,y,w,h,0xffffff,a).setStrokeStyle(2,0xffffff,0.5).setInteractive();
    s.add.text(x,y,label,{fontFamily:'monospace',fontSize:16,color:'#fff'}).setOrigin(0.5);
    r.on('pointerdown',()=>{down(); r.setAlpha(0.4)});
    r.on('pointerup',()=>{up(); r.setAlpha(a)});
    r.on('pointerout',()=>{up(); r.setAlpha(a)});
    r.on('pointermove',(p)=>{ if(p.isDown) down(); });
    return r;
  };
  const size=60,g=6,lx=80,ly=H-80;
  btn(lx,ly,size,size,'↑',()=>ctrl.touch.up=true,()=>ctrl.touch.up=false);
  btn(lx,ly+size+g,size,size,'↓',()=>ctrl.touch.down=true,()=>ctrl.touch.down=false);
  btn(lx-size-g,ly+size/2,size,size,'←',()=>ctrl.touch.left=true,()=>ctrl.touch.left=false);
  btn(lx+size+g,ly+size/2,size,size,'→',()=>ctrl.touch.right=true,()=>ctrl.touch.right=false);
  btn(W-80,H-80,80,80,'Shoot',()=>ctrl.touch.shootOnce=true,()=>{});
}
