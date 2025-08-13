
// Horde Heroes - Pages Upload Build (no SW, no manifest)
// Menu -> Character Select -> Difficulty -> Game. Works on PC, Tablet, Phone.
// Uses only shapes so it's asset-free.

const W=900,H=600;

const config={
  type:Phaser.AUTO,
  parent:'game',
  backgroundColor:'#10151c',
  scale:{ mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH, width:W, height:H },
  physics:{ default:'arcade', arcade:{ debug:false } },
  scene:[MenuScene, GameScene]
};
new Phaser.Game(config);

function MenuScene(){ Phaser.Scene.call(this,{key:'menu'}); }
MenuScene.prototype=Object.create(Phaser.Scene.prototype); MenuScene.prototype.constructor=MenuScene;

function GameScene(){ Phaser.Scene.call(this,{key:'game'}); }
GameScene.prototype=Object.create(Phaser.Scene.prototype); GameScene.prototype.constructor=GameScene;

const HEROES=[
  {name:'Balanced', color:0x7fd0ff, speed:220, fire:200, hp:3, dmg:1},
  {name:'Speedy', color:0x8dff9e, speed:300, fire:220, hp:2, dmg:1},
  {name:'Tank', color:0xffd37f, speed:170, fire:260, hp:5, dmg:1},
  {name:'Sharpshooter', color:0xff9ef2, speed:210, fire:120, hp:3, dmg:2},
];
const DIFFS=[{name:'Easy', mult:0.8},{name:'Normal', mult:1},{name:'Hard', mult:1.3}];

MenuScene.prototype.create=function(){
  this.add.text(W/2,60,'HORDE  HEROES',{fontFamily:'monospace',fontSize:44,color:'#ffffff'}).setOrigin(0.5);
  const hs=localStorage.getItem('hh_high')||0;
  this.add.text(W/2,105,'High Score: '+hs,{fontFamily:'monospace',fontSize:18,color:'#8ec3ff'}).setOrigin(0.5);
  this.add.text(W/2,150,'Choose a Hero',{fontFamily:'monospace',fontSize:22,color:'#ffffff'}).setOrigin(0.5);

  const startX=140,gap=190,y=300;
  HEROES.forEach((c,i)=>{
    const x=startX+i*gap;
    const card=this.add.rectangle(x,y,160,240,0x1c232d).setStrokeStyle(2,0x2a3340).setInteractive({useHandCursor:true});
    this.add.circle(x,y-60,26,c.color).setStrokeStyle(2,0xffffff);
    this.add.text(x,y+20,c.name,{fontFamily:'monospace',fontSize:18,color:'#ffffff'}).setOrigin(0.5);
    this.add.text(x,y+48,desc(c),{fontFamily:'monospace',fontSize:12,color:'#9aa7b4',align:'center'}).setOrigin(0.5);
    card.on('pointerdown',()=>{ this.selectHero=c; showDifficulties(this,c); });
  });

  this.diffGroup=this.add.group();
  this.startTip=this.add.text(W/2,H-30,'',{fontFamily:'monospace',fontSize:16,color:'#9aa7b4'}).setOrigin(0.5);
  function desc(c){ if(c.name==='Sharpshooter') return 'Stronger shots'; if(c.name==='Speedy') return 'Fast, fragile'; if(c.name==='Tank') return 'Many hearts'; return 'All-around hero'; }
};

function showDifficulties(scene,hero){
  // clear old
  scene.diffGroup.clear(true,true);
  scene.add.text(W/2,420,'Difficulty',{fontFamily:'monospace',fontSize:22,color:'#ffffff'}).setOrigin(0.5);
  DIFFS.forEach((d,i)=>{
    const btn=scene.add.rectangle(260+i*190,470,160,48,0x2a6e3c).setStrokeStyle(2,0xffffff).setInteractive({useHandCursor:true});
    scene.add.text(260+i*190,470,d.name,{fontFamily:'monospace',fontSize:18,color:'#ffffff'}).setOrigin(0.5);
    btn.on('pointerdown',()=>{
      scene.scene.start('game',{hero, diff:d});
    });
    scene.diffGroup.addMultiple([btn]);
  });
  scene.startTip.setText('Tap a difficulty to start…');
}

// -------- GameScene
let ui={}, controls={}, hero, bullets, enemies, buddies, gates;
let score, wave, lives, lastShot, spawnTimer, gateTimer, bossTimer, diffMult;

GameScene.prototype.init=function(data){
  this.cfg=data.hero||HEROES[0];
  this.diff=data.diff||DIFFS[1];
  diffMult=this.diff.mult;
};

GameScene.prototype.create=function(){
  score=0; wave=1; lives=this.cfg.hp; lastShot=0; spawnTimer=0; gateTimer=0; bossTimer=0;
  // lanes
  this.add.rectangle(W*0.25,H*0.5,W*0.4,H*0.9,0x272f39).setStrokeStyle(2,0x383f48);
  this.add.rectangle(W*0.75,H*0.5,W*0.4,H*0.9,0x232a33).setStrokeStyle(2,0x383f48);

  // hero
  hero=this.add.circle(W*0.5,H*0.85,16,this.cfg.color); this.physics.add.existing(hero); hero.body.setCollideWorldBounds(true);
  bullets=this.physics.add.group(); enemies=this.physics.add.group(); buddies=this.physics.add.group(); gates=this.physics.add.group();
  addBuddy(this);

  // keyboard + touch
  controls.cursors=this.input.keyboard.createCursorKeys();
  controls.keys=this.input.keyboard.addKeys('W,A,S,D,SPACE');
  buildTouch(this);

  // UI
  ui.score=this.add.text(12,10,'Score: 0',{fontFamily:'monospace',fontSize:22,color:'#ffffff'});
  ui.wave=this.add.text(12,38,'Wave: 1',{fontFamily:'monospace',fontSize:22,color:'#ffffff'});
  ui.lives=this.add.text(12,66,'Hearts: '+lives,{fontFamily:'monospace',fontSize:22,color:'#ffffff'});
  this.add.text(W-12,10,`${this.cfg.name} - ${this.diff.name}`,{fontFamily:'monospace',fontSize:22,color:'#8ec3ff'}).setOrigin(1,0);

  // collisions
  this.physics.add.overlap(bullets,enemies,(b,e)=>{ b.destroy(); hurt(e,this.cfg.dmg,this);},null,this);
  this.physics.add.overlap(buddies,enemies,(buddy,e)=>{ hurt(e,1,this);},null,this);
  this.physics.add.overlap(hero,enemies,(p,e)=>{ e.destroy(); loseLife(this);},null,this);
  this.physics.add.overlap(hero,gates,(p,g)=>{ g.destroy(); addBuddy(this); addScore(5);},null,this);
};

GameScene.prototype.update=function(time,delta){
  // movement
  const s=this.cfg.speed;
  let vx=0,vy=0; const k=controls.keys,c=controls.cursors,t=controls.touch;
  if(c.left.isDown||k.A.isDown||(t&&t.left)) vx-=s;
  if(c.right.isDown||k.D.isDown||(t&&t.right)) vx+=s;
  if(c.up.isDown||k.W.isDown||(t&&t.up)) vy-=s*0.8;
  if(c.down.isDown||k.S.isDown||(t&&t.down)) vy+=s*0.8;
  hero.body.setVelocity(vx,vy);

  // shoot
  const shootPressed=Phaser.Input.Keyboard.JustDown(k.SPACE)||(t&&t.shootOnce); if(t) t.shootOnce=false;
  if(shootPressed && time-lastShot>this.cfg.fire){ fire(this, hero.x, hero.y-18, -420); lastShot=time; }

  // buddies
  buddies.children.iterate(b=>{ if(!b) return; if(Phaser.Math.Between(0,20-Math.min(wave,10))===0) fire(this,b.x,b.y-10,-360); });

  // spawn enemies and gates
  spawnTimer+=delta; if(spawnTimer>Math.max(520 - wave*25*diffMult, 160)){ spawnTimer=0; spawnEnemy(this); }
  gateTimer+=delta; if(gateTimer>3500 - Math.min(wave*80, 1500)){ gateTimer=0; spawnGate(this); }

  // boss
  bossTimer+=delta; if(wave>0 && wave%5===0 && bossTimer>12000){ bossTimer=0; spawnBoss(this); }

  if(score>wave*230) { wave++; ui.wave.setText('Wave: '+wave); }

  cleanup(this);
};

function fire(scene,x,y,vy){ const b=scene.add.rectangle(x,y,4,12,0xffffaa); scene.physics.add.existing(b); b.body.setVelocityY(vy); bullets.add(b); }

function addBuddy(scene){ const b=scene.add.circle(Phaser.Math.Clamp(hero.x+Phaser.Math.Between(-50,50),40,W-40), hero.y+Phaser.Math.Between(20,50), 10, 0x99ff99); scene.physics.add.existing(b); b.body.setCollideWorldBounds(true); buddies.add(b); }

function spawnGate(scene){ const gx=Phaser.Math.Between(W*0.62, W*0.9); const g=scene.add.rectangle(gx,-16,44,30,0x66aaff).setStrokeStyle(2,0xffffff); const label=scene.add.text(gx-10,-26,'+1',{fontFamily:'monospace',fontSize:16,color:'#ffffff'}); scene.physics.add.existing(g); g.body.setVelocityY(110*diffMult); g.on('destroy',()=>label.destroy()); gates.add(g); }

function spawnEnemy(scene){ const r=Phaser.Math.Between(1,100); if(r<=55) grunt(scene); else if(r<=75) runner(scene); else if(r<=92) shield(scene); else giant(scene); }
function grunt(scene){ const x=Phaser.Math.Between(W*0.1, W*0.9); const e=scene.add.rectangle(x,-20,20,20,0xff6666); e.baseColor=0xff6666; e.kind='grunt'; e.hp=1+Math.floor(wave/4*diffMult); scene.physics.add.existing(e); e.body.setVelocityY((70+wave*10)*diffMult); enemies.add(e); }
function runner(scene){ const x=Phaser.Math.Between(W*0.1, W*0.9); const e=scene.add.triangle(x,-20,0,20,10,0,20,20,0xff8855); e.baseColor=0xff8855; e.kind='runner'; e.hp=1; scene.physics.add.existing(e); e.body.setVelocityY((150+wave*15)*diffMult); enemies.add(e); }
function giant(scene){ const x=Phaser.Math.Between(W*0.15, W*0.85); const e=scene.add.rectangle(x,-40,40,40,0xff5544); e.baseColor=0xff5544; e.kind='giant'; e.hp=4+Math.floor(wave/3*diffMult); scene.physics.add.existing(e); e.body.setVelocityY((50+wave*7)*diffMult); enemies.add(e); }
function shield(scene){ const x=Phaser.Math.Between(W*0.1, W*0.9); const e=scene.add.rectangle(x,-24,28,28,0xcc6666).setStrokeStyle(3,0xffffff); e.baseColor=0xcc6666; e.kind='shield'; e.hp=2+Math.floor(wave/5*diffMult); scene.physics.add.existing(e); e.body.setVelocityY((80+wave*9)*diffMult); enemies.add(e); }
function spawnBoss(scene){ const e=scene.add.rectangle(W/2,-80,80,80,0xff3333).setStrokeStyle(4,0xffffff); e.baseColor=0xff3333; e.kind='boss'; e.hp=12+wave; scene.physics.add.existing(e); e.body.setVelocityY(60*diffMult); enemies.add(e); }

function cleanup(scene){ [bullets,enemies,gates].forEach(g=>{ g.children.iterate(o=>{ if(o&&(o.y<-60||o.y>H+60)) o.destroy(); }); }); }

function hurt(e, dmg, scene){ e.hp -= (dmg||1); if(e.hp<=0){ burst(e,scene); addScore(10 + (e.kind==='giant'?15:0) + (e.kind==='shield'?10:0) + (e.kind==='runner'?5:0) + (e.kind==='boss'?50:0)); } else { e.fillColor=0xff8888; scene.tweens.add({targets:e,duration:120,onComplete:()=>{ e.fillColor=e.baseColor; }}); } }

function burst(e, scene){ for(let i=0;i<8;i++){ const p=scene.add.rectangle(e.x,e.y,3,3,0xffaaaa); scene.tweens.add({targets:p,x:e.x+Phaser.Math.Between(-18,18), y:e.y+Phaser.Math.Between(-18,18), alpha:0, duration:300, onComplete:()=>p.destroy()}); } e.destroy(); }

function addScore(n){ score+=n; ui.score.setText('Score: '+score); }

function loseLife(scene){ lives--; ui.lives.setText('Hearts: '+lives); if(lives<=0){ const hs=localStorage.getItem('hh_high')||0; const nh=Math.max(hs,score); localStorage.setItem('hh_high',nh); scene.scene.pause(); const tx=scene.add.text(W/2,H/2,`Great run!\nScore: ${score}\nHigh: ${nh}\nPress R to restart`,{fontFamily:'monospace',fontSize:28,color:'#ffffff',align:'center'}).setOrigin(0.5); const r=scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R); r.once('down',()=>scene.scene.start('menu')); } }

function buildTouch(scene){
  if(!scene.sys.game.device.input.touch){ controls.touch=null; return; }
  controls.touch={left:false,right:false,up:false,down:false,shootOnce:false};
  const A=0.25;
  function btn(x,y,w,h,label,down,up){ const r=scene.add.rectangle(x,y,w,h,0xffffff,A).setStrokeStyle(2,0xffffff,0.5).setInteractive(); const t=scene.add.text(x,y,label,{fontFamily:'monospace',fontSize:16,color:'#000'}).setOrigin(0.5); r.on('pointerdown',()=>{down(); r.setAlpha(0.4);}); r.on('pointerup',()=>{up(); r.setAlpha(A);}); r.on('pointerout',()=>{up(); r.setAlpha(A);}); r.on('pointermove',(p)=>{ if(p.isDown) down(); }); return r; }
  const size=60,g=6; const lx=80,ly=H-80;
  btn(lx,ly,size,size,'↑',()=>controls.touch.up=true,()=>controls.touch.up=false);
  btn(lx,ly+size+g,size,size,'↓',()=>controls.touch.down=true,()=>controls.touch.down=false);
  btn(lx-size-g,ly+size/2,size,size,'←',()=>controls.touch.left=true,()=>controls.touch.left=false);
  btn(lx+size+g,ly+size/2,size,size,'→',()=>controls.touch.right=true,()=>controls.touch.right=false);
  btn(W-80,H-80,90,90,'Shoot',()=>controls.touch.shootOnce=true,()=>{});
}
