
// Horde Heroes - Pages Safe Build (no service worker).
// Contains menu with character + difficulty select. Fully self-contained.

const W=900,H=600;

const config={
  type:Phaser.AUTO,
  parent:'game',
  backgroundColor:'#141a25',
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},
  physics:{default:'arcade',arcade:{debug:false}},
  scene:[Menu,Play]
};

new Phaser.Game(config);

function Menu(){Phaser.Scene.call(this,{key:'menu'});} Menu.prototype=Object.create(Phaser.Scene.prototype); Menu.prototype.constructor=Menu;
function Play(){Phaser.Scene.call(this,{key:'play'});} Play.prototype=Object.create(Phaser.Scene.prototype); Play.prototype.constructor=Play;

const HEROES=[
  {name:'Balanced',color:0x7fd0ff,speed:220,fire:200,hp:3,dmg:1},
  {name:'Speedy',color:0x8dff9e,speed:300,fire:230,hp:2,dmg:1},
  {name:'Tank',color:0xffd37f,speed:170,fire:260,hp:5,dmg:1},
  {name:'Sharpshooter',color:0xff9ef2,speed:210,fire:120,hp:3,dmg:2}
];

Menu.prototype.create=function(){
  this.add.text(W/2,60,'HORDE  HEROES',{fontFamily:'monospace',fontSize:40,color:'#ffffff'}).setOrigin(0.5);
  this.add.text(W/2,100,'High Score: '+(localStorage.getItem('hh_high')||0),{fontFamily:'monospace',fontSize:18,color:'#9ad0ff'}).setOrigin(0.5);
  this.add.text(W/2,140,'Choose a Hero',{fontFamily:'monospace',fontSize:18,color:'#ddd'}).setOrigin(0.5);

  // hero cards
  const startX=140,gap=190,y=300;
  this.selectedHero=0; this.selectedDiff='Normal';

  HEROES.forEach((c,i)=>{
    const x=startX+i*gap;
    const card=this.add.rectangle(x,y,160,240,0x23262b).setStrokeStyle(2,0x3b3f46).setInteractive({useHandCursor:true});
    this.add.circle(x,y-60,26,c.color).setStrokeStyle(2,0xffffff);
    this.add.text(x,y+20,c.name,{fontFamily:'monospace',fontSize:18,color:'#fff'}).setOrigin(0.5);
    card.on('pointerdown',()=>{this.selectedHero=i; highlight.call(this);});
    card.name='card'+i;
  });

  const diffY=440; this.add.text(W/2,410,'Difficulty',{fontFamily:'monospace',fontSize:22,color:'#fff'}).setOrigin(0.5);
  const makeBtn=(x,label)=>{
    const r=this.add.rectangle(x,diffY,140,40,0x237a45).setInteractive({useHandCursor:true});
    this.add.text(x,diffY,label,{fontFamily:'monospace',fontSize:18,color:'#fff'}).setOrigin(0.5);
    return r;
  };
  makeBtn(300,'Easy').on('pointerdown',()=>{this.selectedDiff='Easy'; startGame.call(this);});
  makeBtn(450,'Normal').on('pointerdown',()=>{this.selectedDiff='Normal'; startGame.call(this);});
  makeBtn(600,'Hard').on('pointerdown',()=>{this.selectedDiff='Hard'; startGame.call(this);});

  this.add.text(W/2,H-24,'Starting...',{fontFamily:'monospace',fontSize:16,color:'#8aa'}).setOrigin(0.5);
  highlight.call(this);

  function highlight(){
    for(let i=0;i<HEROES.length;i++){
      const obj=this.children.getByName('card'+i); if(!obj) continue;
      obj.setStrokeStyle( i===this.selectedHero?3:2, i===this.selectedHero?0xffffff:0x3b3f46 );
    }
  }

  function startGame(){ // <-- replaces missing selectMode()
    const hero=HEROES[this.selectedHero];
    const diff=this.selectedDiff;
    this.scene.start('play',{hero,diff});
  }
};

// --- PLAY ---
let ui,player,bullets,enemies,buddies,gates,ctrl,score,wave,lives,lastShot,spawnTimer,gateTimer,bossTimer;
Play.prototype.init=function(data){ this.hero=data.hero||HEROES[0]; this.diff=data.diff||'Normal'; };
Play.prototype.create=function(){
  score=0; wave=1; lives=this.hero.hp; lastShot=0; spawnTimer=0; gateTimer=0; bossTimer=0;

  // bg lanes
  this.add.rectangle(W*0.25,H*0.5,W*0.4,H*0.9,0x2a2d32).setStrokeStyle(2,0x3b3f46);
  this.add.rectangle(W*0.75,H*0.5,W*0.4,H*0.9,0x25282d).setStrokeStyle(2,0x3b3f46);

  // player
  player=this.add.circle(W*0.5,H*0.85,16,this.hero.color);
  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);

  bullets=this.physics.add.group(); enemies=this.physics.add.group(); buddies=this.physics.add.group(); gates=this.physics.add.group();
  addBuddy(this);

  ctrl={cursors:this.input.keyboard.createCursorKeys(), keys:this.input.keyboard.addKeys('W,A,S,D,SPACE')};
  ui={};
  ui.score=this.add.text(12,10,'Score: 0',{fontFamily:'monospace',fontSize:18,color:'#fff'});
  ui.wave=this.add.text(12,32,'Wave: 1',{fontFamily:'monospace',fontSize:18,color:'#fff'});
  ui.lives=this.add.text(12,54,'Hearts: '+lives,{fontFamily:'monospace',fontSize:18,color:'#fff'});
  ui.hero=this.add.text(W-12,10,this.hero.name+' - '+this.diff,{fontFamily:'monospace',fontSize:18,color:'#9ad0ff'}).setOrigin(1,0);

  // collisions
  this.physics.add.overlap(bullets,enemies,(b,e)=>{ b.destroy(); hitEnemy(e,this.hero.dmg,this); },null,this);
  this.physics.add.overlap(buddies,enemies,(buddy,e)=>{ hitEnemy(e,1,this); },null,this);
  this.physics.add.overlap(player,enemies,(p,e)=>{ e.destroy(); loseLife(this); },null,this);
  this.physics.add.overlap(player,gates,(p,g)=>{ g.destroy(); addBuddy(this); addScore(5); },null,this);
};

Play.prototype.update=function(time,delta){
  const mult = this.diff==='Easy'?0.85 : this.diff==='Hard'?1.2 : 1.0;
  const speed=this.hero.speed;

  let vx=0,vy=0,k=ctrl.keys,c=ctrl.cursors;
  if (c.left.isDown||k.A.isDown) vx-=speed;
  if (c.right.isDown||k.D.isDown) vx+=speed;
  if (c.up.isDown||k.W.isDown) vy-=speed*0.8;
  if (c.down.isDown||k.S.isDown) vy+=speed*0.8;
  player.body.setVelocity(vx,vy);

  if (Phaser.Input.Keyboard.JustDown(k.SPACE) && time-lastShot>this.hero.fire){
    shootBullet(this,player.x,player.y-18,-400);
    lastShot=time;
  }

  buddies.children.iterate(b=>{ if(!b) return; if(Phaser.Math.Between(0,20-Math.min(wave,10))===0) shootBullet(this,b.x,b.y-10,-350); });

  spawnTimer+=delta; if (spawnTimer > Math.max(520 - wave*25, 160)/mult){ spawnTimer=0; spawnEnemy(this,mult); }
  gateTimer+=delta; if (gateTimer > (3600 - Math.min(wave*80,1500))/mult){ gateTimer=0; spawnGate(this,mult); }
  bossTimer+=delta; if (wave>0 && wave%5===0 && bossTimer > 12000/mult){ bossTimer=0; spawnBoss(this,mult); }

  if (score > wave*220){ wave++; ui.wave.setText('Wave: '+wave); }

  cleanup(this);
};

// helpers
function shootBullet(scene,x,y,vy){ const b=scene.add.rectangle(x,y,4,12,0xffffaa); scene.physics.add.existing(b); b.body.setVelocityY(vy); bullets.add(b); }
function addBuddy(scene){ const b=scene.add.circle(Phaser.Math.Clamp(player.x+Phaser.Math.Between(-50,50),40,W-40), player.y+Phaser.Math.Between(20,50),10,0x99ff99); scene.physics.add.existing(b); b.body.setCollideWorldBounds(true); buddies.add(b); }
function spawnGate(scene,m){ const gx=Phaser.Math.Between(W*0.62,W*0.9); const g=scene.add.rectangle(gx,-16,44,30,0x66aaff).setStrokeStyle(2,0xffffff); const label=scene.add.text(gx-10,-26,'+1',{fontFamily:'monospace',fontSize:16,color:'#fff'}); scene.physics.add.existing(g); g.body.setVelocityY(110*m); g.on('destroy',()=>label.destroy()); gates.add(g); }
function cleanup(scene){ [bullets,enemies,gates].forEach(gr=>{ gr.children.iterate(o=>{ if(o && (o.y<-60||o.y>H+60)) o.destroy(); }); }); }
function hitEnemy(e,dmg,scene){ e.hp-=dmg||1; if(e.hp<=0){ pop(e,scene); addScore(10+(e.kind==='giant'?15:0)+(e.kind==='shield'?10:0)+(e.kind==='runner'?5:0)+(e.kind==='boss'?50:0)); } else { e.fillColor=0xff8888; scene.tweens.add({targets:e,duration:120,onComplete:()=>{e.fillColor=e.baseColor;}}); } }
function pop(e,scene){ for(let i=0;i<8;i++){ const p=scene.add.rectangle(e.x,e.y,3,3,0xffaaaa); scene.tweens.add({targets:p,x:e.x+Phaser.Math.Between(-18,18),y:e.y+Phaser.Math.Between(-18,18),alpha:0,duration:300,onComplete:()=>p.destroy()}); } e.destroy(); }
function addScore(n){ score+=n; ui.score.setText('Score: '+score); }
function loseLife(scene){ lives--; ui.lives.setText('Hearts: '+lives); if(lives<=0){ const high=Math.max(Number(localStorage.getItem('hh_high')||0),score); localStorage.setItem('hh_high',high); scene.scene.pause(); const txt=scene.add.text(W/2,H/2,'Great run!\nScore: '+score+'\nHigh: '+high+'\nPress R for Menu',{fontFamily:'monospace',fontSize:28,color:'#fff',align:'center'}).setOrigin(0.5); const r=scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R); r.once('down',()=>{ scene.scene.start('menu'); }); } }

function spawnEnemy(scene,m){
  const roll=Phaser.Math.Between(1,100);
  if (roll<=55) makeGrunt(scene,m);
  else if(roll<=75) makeRunner(scene,m);
  else if(roll<=92) makeShield(scene,m);
  else makeGiant(scene,m);
}
function makeGrunt(scene,m){ const x=Phaser.Math.Between(W*0.1,W*0.9); const e=scene.add.rectangle(x,-20,20,20,0xff6666); e.baseColor=0xff6666; e.kind='grunt'; e.hp=1+Math.floor(wave/4); scene.physics.add.existing(e); e.body.setVelocityY((70+wave*10)*m); enemies.add(e); }
function makeRunner(scene,m){ const x=Phaser.Math.Between(W*0.1,W*0.9); const e=scene.add.triangle(x,-20,0,20,10,0,20,20,0xff8855); e.baseColor=0xff8855; e.kind='runner'; e.hp=1; scene.physics.add.existing(e); e.body.setVelocityY((150+wave*15)*m); enemies.add(e); }
function makeGiant(scene,m){ const x=Phaser.Math.Between(W*0.15,W*0.85); const e=scene.add.rectangle(x,-40,40,40,0xff5544); e.baseColor=0xff5544; e.kind='giant'; e.hp=4+Math.floor(wave/3); scene.physics.add.existing(e); e.body.setVelocityY((50+wave*7)*m); enemies.add(e); }
function makeShield(scene,m){ const x=Phaser.Math.Between(W*0.1,W*0.9); const e=scene.add.rectangle(x,-24,28,28,0xcc6666).setStrokeStyle(3,0xffffff); e.baseColor=0xcc6666; e.kind='shield'; e.hp=2+Math.floor(wave/5); scene.physics.add.existing(e); e.body.setVelocityY((80+wave*9)*m); enemies.add(e); }
function spawnBoss(scene,m){ const e=scene.add.rectangle(W/2,-80,80,80,0xff3333).setStrokeStyle(4,0xffffff); e.baseColor=0xff3333; e.kind='boss'; e.hp=12+wave; scene.physics.add.existing(e); e.body.setVelocityY(60*m); enemies.add(e); }
