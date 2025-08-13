
// Horde Heroes - rebuilt project
// Features:
// - Character select with 4 heroes
// - Difficulty modes (Easy/Normal/Hard)
// - Multiple enemy types + boss
// - Keyboard + touch controls (phone/tablet friendly)
// - Pause menu, persistent high score (localStorage)
// - Service worker for offline play

const W = 900, H = 600;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0f172a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [Boot, Menu, Game]
};
new Phaser.Game(config);

function getSave(){ try { return JSON.parse(localStorage.getItem('horde-save')||'{}'); } catch(e){ return {}; } }
function putSave(s){ localStorage.setItem('horde-save', JSON.stringify(s)); }
let SAVE = getSave();

// --- Scenes
function Boot(){ Phaser.Scene.call(this,{key:'boot'}); } Boot.prototype = Object.create(Phaser.Scene.prototype);
Boot.prototype.constructor = Boot;
Boot.prototype.create = function(){ this.scene.start('menu'); };

function Menu(){ Phaser.Scene.call(this,{key:'menu'}); } Menu.prototype = Object.create(Phaser.Scene.prototype);
Menu.prototype.constructor = Menu;

function Game(){ Phaser.Scene.call(this,{key:'game'}); } Game.prototype = Object.create(Phaser.Scene.prototype);
Game.prototype.constructor = Game;

// --- Menu
Menu.prototype.create = function(){
  const title = this.add.text(W/2, 70, 'HORDE HEROES', {fontFamily:'monospace', fontSize:44, color:'#ffffff'}).setOrigin(0.5);
  const hs = SAVE.high||0;
  this.add.text(W/2, 110, 'High Score: '+hs, {fontFamily:'monospace', fontSize:16, color:'#a7f3d0'}).setOrigin(0.5);

  const heroes = [
    {name:'Balanced', color:0x7fd0ff, speed:220, fire:200, hp:3, dmg:1},
    {name:'Speedy', color:0x8dff9e, speed:300, fire:230, hp:2, dmg:1},
    {name:'Tank', color:0xffd37f, speed:170, fire:260, hp:5, dmg:1},
    {name:'Sharpshooter', color:0xff9ef2, speed:210, fire:120, hp:3, dmg:2},
  ];
  const modes = [
    {name:'Easy', mult:0.85},
    {name:'Normal', mult:1.0},
    {name:'Hard', mult:1.25},
  ];

  this.add.text(W/2, 150, 'Choose Hero', {fontFamily:'monospace', fontSize:20, color:'#ffffff'}).setOrigin(0.5);
  heroes.forEach((h,i)=>{
    const x = 150 + i*200, y=260;
    const card = this.add.rectangle(x,y,170,230,0x1f2937).setStrokeStyle(2,0x374151).setInteractive({useHandCursor:true});
    this.add.circle(x, y-60, 28, h.color).setStrokeStyle(2,0xffffff);
    this.add.text(x,y+18, h.name, {fontFamily:'monospace', fontSize:16, color:'#e5e7eb'}).setOrigin(0.5);
    card.on('pointerdown', ()=> selectHero(h));
  });

  this.add.text(W/2, 370, 'Difficulty', {fontFamily:'monospace', fontSize:20, color:'#ffffff'}).setOrigin(0.5);
  modes.forEach((m,i)=>{
    const x = 250 + i*200, y = 420;
    const btn = this.add.rectangle(x,y,120,40,0x16a34a).setInteractive({useHandCursor:true});
    const t = this.add.text(x,y,m.name,{fontFamily:'monospace',fontSize:16,color:'#ffffff'}).setOrigin(0.5);
    btn.alpha = (i===1?1:0.5); // default Normal
    btn.on('pointerdown', ()=>{
      modes.forEach((mm,j)=>{ /* visual only */ });
      selectMode = m;
      [btn].forEach(()=>{});
      // brighten selected
      this.children.list.filter(o=>o===btn).forEach(b=>b.alpha=1);
      // dim others by name match
      this.children.list.forEach(o=>{ if (o!==btn && o.width===120 && o.height===40) o.alpha= (o.text===m.name?1:0.5); });
    });
    if (i===1) var selectMode = m;
  });

  const playTxt = this.add.text(W/2, H-60, 'Tap a HERO card, then tap a DIFFICULTY button to start', {fontFamily:'monospace', fontSize:14, color:'#93c5fd'}).setOrigin(0.5);

  let chosen = null;
  const selectHero = (h)=>{
    chosen = h;
    playTxt.setText('Starting...');
    this.time.delayedCall(200, ()=>{
      this.scene.start('game', {hero:chosen, mode:selectMode});
    });
  };
};

// --- Game
let ui, hero, bullets, enemies, buddies, gates;
let score, wave, lives, lastShot, spawnTimer, gateTimer, bossTimer;
let controls;

Game.prototype.init = function(data){
  this.heroCfg = data.hero;
  this.mode = data.mode || {mult:1.0};
};
Game.prototype.create = function(){
  score=0; wave=1; lives=this.heroCfg.hp; lastShot=0; spawnTimer=0; gateTimer=0; bossTimer=0;

  // lane bg
  this.add.rectangle(W*0.25, H*0.5, W*0.4, H*0.9, 0x0b1220).setStrokeStyle(2, 0x1f2937);
  this.add.rectangle(W*0.75, H*0.5, W*0.4, H*0.9, 0x101827).setStrokeStyle(2, 0x1f2937);

  // hero
  hero = this.add.circle(W*0.5, H*0.85, 16, this.heroCfg.color).setStrokeStyle(2, 0xffffff);
  this.physics.add.existing(hero);
  hero.body.setCollideWorldBounds(true);

  bullets = this.physics.add.group();
  enemies = this.physics.add.group();
  buddies = this.physics.add.group();
  gates = this.physics.add.group();

  // UI
  ui = {
    score: this.add.text(12, 10, 'Score: 0', style('#ffffff',18)),
    wave:  this.add.text(12, 32, 'Wave: 1',  style('#ffffff',18)),
    lives: this.add.text(12, 54, 'Hearts: '+lives, style('#ffffff',18)),
    mode:  this.add.text(W-12, 10, 'Mode x'+this.mode.mult, style('#a7f3d0',18)).setOrigin(1,0),
    hero:  this.add.text(W-12, 34, this.heroCfg.name, style('#93c5fd',16)).setOrigin(1,0)
  };

  // keyboard
  controls = {
    cursors: this.input.keyboard.createCursorKeys(),
    keys: this.input.keyboard.addKeys('W,A,S,D,SPACE'),
    touch: buildTouchControls(this)
  };

  // collisions
  this.physics.add.overlap(bullets, enemies, (b,e)=>{ b.destroy(); hitEnemy(e, this.heroCfg.dmg, this); }, null, this);
  this.physics.add.overlap(buddies, enemies, (buddy,e)=>{ hitEnemy(e, 1, this); }, null, this);
  this.physics.add.overlap(hero, enemies, (p,e)=>{ e.destroy(); loseLife(this); }, null, this);
  this.physics.add.overlap(hero, gates, (p,g)=>{ g.destroy(); addBuddy(this); addScore(5); }, null, this);

  // initial buddy
  addBuddy(this);

  // pause toggle accessible from outside
  const self = this; window.__PAUSE_TOGGLE__ = ()=>{
    if (self.scene.isPaused()) { self.scene.resume(); } else { self.scene.pause(); }
  };
};

Game.prototype.update = function(time, delta){
  const mult = this.mode.mult;
  const speed = this.heroCfg.speed * (1/mult);

  // movement
  let vx=0, vy=0;
  const k = controls.keys, c = controls.cursors, t = controls.touch;
  if ((c.left.isDown || k.A.isDown || (t && t.left)))  vx -= speed;
  if ((c.right.isDown|| k.D.isDown || (t && t.right))) vx += speed;
  if ((c.up.isDown   || k.W.isDown || (t && t.up)))    vy -= speed*0.8;
  if ((c.down.isDown || k.S.isDown || (t && t.down)))  vy += speed*0.8;
  hero.body.setVelocity(vx, vy);

  // shooting
  const shootPressed = Phaser.Input.Keyboard.JustDown(k.SPACE) || (t && t.shootOnce);
  if (shootPressed && time - lastShot > this.heroCfg.fire){
    shootBullet(this, hero.x, hero.y-18, -400);
    lastShot = time;
  }
  if (t) t.shootOnce = false;

  // buddies fire
  buddies.children.iterate(b=>{ if (!b) return; if (Phaser.Math.Between(0, 20 - Math.min(wave,10))===0) shootBullet(this, b.x, b.y-10, -350); });

  // spawns
  spawnTimer += delta;
  const interval = Math.max((500 - wave*25) * (1/mult), 120);
  if (spawnTimer > interval) { spawnTimer = 0; spawnEnemy(this, mult); }

  gateTimer += delta;
  if (gateTimer > (3600 - Math.min(wave*80, 1600)) * (1/mult)){
    gateTimer = 0; spawnGate(this, mult);
  }

  bossTimer += delta;
  if (wave>0 && wave % 5 === 0 && bossTimer > 12000 * (1/mult)){
    bossTimer = 0; spawnBoss(this, mult);
  }

  // wave progression
  if (score > wave * 240) { wave++; ui.wave.setText('Wave: ' + wave); }

  cleanup(this);
};

// --- Helpers & factories
const style = (color, size)=>({fontFamily:'monospace', fontSize:size, color});

function shootBullet(scene, x, y, vy){
  const b = scene.add.rectangle(x, y, 4, 12, 0xffffaa);
  scene.physics.add.existing(b);
  b.body.setVelocityY(vy);
  scene.physics.add.collider(b, enemies);
  bullets.add(b);
}

function addBuddy(scene){
  const b = scene.add.circle(Phaser.Math.Clamp(hero.x + Phaser.Math.Between(-50,50), 40, W-40), hero.y+Phaser.Math.Between(20,50), 10, 0x99ff99);
  scene.physics.add.existing(b);
  b.body.setCollideWorldBounds(true);
  buddies.add(b);
}

function spawnGate(scene, mult){
  const gx = Phaser.Math.Between(W*0.62, W*0.9);
  const g = scene.add.rectangle(gx, -16, 48, 32, 0x60a5fa).setStrokeStyle(2, 0xffffff);
  const label = scene.add.text(gx-10, -26, '+1', style('#ffffff',16));
  scene.physics.add.existing(g);
  g.body.setVelocityY(110 * mult);
  g.on('destroy', ()=> label.destroy());
  gates.add(g);
}

function cleanup(scene){
  [bullets,enemies,gates].forEach(group => {
    group.children.iterate(obj=>{ if (obj && (obj.y < -60 || obj.y > H+60)) obj.destroy(); });
  });
}

function hitEnemy(e, dmg, scene){
  e.hp -= (dmg||1);
  if (e.hp <= 0){
    pop(e, scene);
    addScore(10 + (e.kind==='giant'?15:0) + (e.kind==='shield'?10:0) + (e.kind==='runner'?5:0) + (e.kind==='boss'?60:0));
  }else{
    e.fillColor = 0xff8888;
    scene.tweens.add({ targets:e, duration:120, onComplete:()=>{ e.fillColor = e.baseColor; } });
  }
}

function pop(e, scene){
  for (let i=0;i<8;i++){
    const p = scene.add.rectangle(e.x, e.y, 3, 3, 0xffaaaa);
    scene.tweens.add({ targets:p, x: e.x + Phaser.Math.Between(-18,18), y: e.y + Phaser.Math.Between(-18,18), alpha:0, duration:300, onComplete:()=>p.destroy() });
  }
  e.destroy();
}

function addScore(n){
  score += n;
  ui.score.setText('Score: ' + score);
}

function loseLife(scene){
  lives--;
  ui.lives.setText('Hearts: ' + lives);
  if (lives <= 0){
    SAVE.high = Math.max(SAVE.high||0, score);
    putSave(SAVE);
    scene.scene.pause();
    const big = scene.add.text(W/2, H/2, 'Great run!\nScore: '+score+'\nHigh: '+SAVE.high+'\nPress R to restart', style('#ffffff', 28)).setOrigin(0.5);
    const r = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    r.once('down', ()=>{ scene.scene.start('menu'); });
  }
}

// enemy types
function spawnEnemy(scene, mult){
  const roll = Phaser.Math.Between(1, 100);
  if (roll <= 55) makeGrunt(scene, mult);
  else if (roll <= 75) makeRunner(scene, mult);
  else if (roll <= 92) makeShield(scene, mult);
  else makeGiant(scene, mult);
}
function makeGrunt(scene, mult){
  const x = Phaser.Math.Between(W*0.1, W*0.9);
  const e = scene.add.rectangle(x, -20, 20, 20, 0xf87171);
  e.baseColor = 0xf87171; e.kind='grunt'; e.hp = 1 + Math.floor(wave/4);
  scene.physics.add.existing(e);
  e.body.setVelocityY((70 + wave*10) * mult);
  enemies.add(e);
}
function makeRunner(scene, mult){
  const x = Phaser.Math.Between(W*0.1, W*0.9);
  const e = scene.add.triangle(x, -20, 0, 20, 10, 0, 20, 20, 0xfb923c);
  e.baseColor = 0xfb923c; e.kind='runner'; e.hp = 1;
  scene.physics.add.existing(e);
  e.body.setVelocityY((160 + wave*16) * mult);
  enemies.add(e);
}
function makeGiant(scene, mult){
  const x = Phaser.Math.Between(W*0.15, W*0.85);
  const e = scene.add.rectangle(x, -40, 44, 44, 0xef4444).setStrokeStyle(3, 0xffffff);
  e.baseColor = 0xef4444; e.kind='giant'; e.hp = 4 + Math.floor(wave/3);
  scene.physics.add.existing(e);
  e.body.setVelocityY((55 + wave*8) * mult);
  enemies.add(e);
}
function makeShield(scene, mult){
  const x = Phaser.Math.Between(W*0.1, W*0.9);
  const e = scene.add.rectangle(x, -24, 28, 28, 0xfca5a5).setStrokeStyle(3, 0xffffff);
  e.baseColor = 0xfca5a5; e.kind='shield'; e.hp = 2 + Math.floor(wave/5);
  scene.physics.add.existing(e);
  e.body.setVelocityY((85 + wave*10) * mult);
  enemies.add(e);
}
function spawnBoss(scene, mult){
  const x = W/2;
  const e = scene.add.rectangle(x, -80, 86, 86, 0xdc2626).setStrokeStyle(4, 0xffffff);
  e.baseColor = 0xdc2626; e.kind='boss'; e.hp = 12 + wave;
  scene.physics.add.existing(e);
  e.body.setVelocityY(65 * mult);
  enemies.add(e);
}

// touch controls
function buildTouchControls(scene){
  const isTouch = scene.sys.game.device.input.touch;
  if (!isTouch) return null;

  const touch = { left:false, right:false, up:false, down:false, shootOnce:false };
  const padAlpha = 0.25;

  function mkBtn(x,y,w,h,label, onDown, onUp){
    const r = scene.add.rectangle(x,y,w,h,0xffffff, padAlpha).setStrokeStyle(2,0xffffff,0.5).setInteractive();
    const txt = scene.add.text(x, y, label, {fontFamily:'monospace',fontSize:18,color:'#ffffff'}).setOrigin(0.5);
    r.setScrollFactor(0); txt.setScrollFactor(0);
    r.on('pointerdown', ()=>{ onDown(); r.setAlpha(0.4); });
    r.on('pointerup', ()=>{ onUp(); r.setAlpha(padAlpha); });
    r.on('pointerout', ()=>{ onUp(); r.setAlpha(padAlpha); });
    r.on('pointermove', (p)=>{ if (p.isDown) onDown(); });
    return r;
  }

  const size = 64, gap = 8;
  const leftX = 90, leftY = H-90;
  mkBtn(leftX, leftY, size, size, '↑', ()=>touch.up=true, ()=>touch.up=false);
  mkBtn(leftX, leftY+size+gap, size, size, '↓', ()=>touch.down=true, ()=>touch.down=false);
  mkBtn(leftX-size-gap, leftY+size/2, size, size, '←', ()=>touch.left=true, ()=>touch.left=false);
  mkBtn(leftX+size+gap, leftY+size/2, size, size, '→', ()=>touch.right=true, ()=>touch.right=false);

  const shootX = W-90, shootY = H-90;
  mkBtn(shootX, shootY, 96, 96, 'Shoot', ()=>touch.shootOnce=true, ()=>{});

  // quick tap to shoot anywhere top-half
  scene.input.on('pointerdown', (p)=>{ if (p.y < H/2) touch.shootOnce = true; });

  return touch;
}
