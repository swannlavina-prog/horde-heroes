
// Desert Siege — a more cinematic horde game (turret view)
const W=960,H=540;

const config = {
  type: Phaser.AUTO, parent:'game',
  backgroundColor:'#0b0e14',
  scale:{ mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH, width:W, height:H },
  physics:{ default:'arcade', arcade:{ debug:false } },
  scene:{ preload, create, update }
};

let scene, gun, muzzle, bullets, enemies, giants, particles, ui, score=0, hp=100, fireHold=false, lastShot=0, wave=1, spawnTimer=0, bossTimer=0;

new Phaser.Game(config);

function preload(){}

function create(){
  scene=this;
  drawBackground(this);

  // groups
  bullets = this.physics.add.group();
  enemies = this.physics.add.group();
  giants  = this.physics.add.group();

  // "gun" at bottom center
  gun = this.add.container(W/2, H-40);
  const base = this.add.rectangle(0,0, 160,28, 0x444c5c).setStrokeStyle(2,0x222833);
  const barrel = this.add.rectangle(0,-12, 26,70, 0x8a9ab8).setStrokeStyle(2,0x222833);
  const gripL = this.add.rectangle(-40,10, 24,30, 0x59657a);
  const gripR = this.add.rectangle( 40,10, 24,30, 0x59657a);
  gun.add([base, barrel, gripL, gripR]);
  muzzle = this.add.circle(W/2, H-88, 10, 0xffe08a, 0);
  this.tweens.add({ targets: base, yoyo:true, repeat:-1, duration:1200, props:{ scaleX:{ from:1, to:1.03 }}});

  // UI
  ui = {};
  ui.score = this.add.text(12,12,'Score: 0',{fontFamily:'monospace', fontSize:18, color:'#ffffff'});
  ui.hp    = this.add.text(W-12,12,'Base HP: 100',{fontFamily:'monospace', fontSize:18, color:'#ffffff'}).setOrigin(1,0);
  ui.wave  = this.add.text(W/2,12,'Wave 1',{fontFamily:'monospace', fontSize:18, color:'#9ad0ff'}).setOrigin(0.5,0);

  // input
  this.input.on('pointerdown',()=> fireHold=true);
  this.input.on('pointerup',()=> fireHold=false);
  const shootBtn = document.getElementById('shootBtn');
  if (shootBtn){
    shootBtn.addEventListener('touchstart', ()=> fireHold=true);
    shootBtn.addEventListener('touchend', ()=> fireHold=false);
    shootBtn.addEventListener('mousedown', ()=> fireHold=true);
    shootBtn.addEventListener('mouseup', ()=> fireHold=false);
  }

  // collisions
  this.physics.add.overlap(bullets, enemies, (b,e)=>{ b.destroy(); damageEnemy(e,1); impact(e.x, e.y); scoreUp(5); }, null, this);
  this.physics.add.overlap(bullets, giants,  (b,e)=>{ b.destroy(); damageEnemy(e,1); impact(e.x, e.y); scoreUp(8); }, null, this);

  // initial spawns
  for(let i=0;i<8;i++) spawnMinion(this,true);
}

function update(time, delta){
  // gun points toward pointer
  const p = this.input.activePointer;
  const dx = p.x - W/2; // left/right
  gun.x = Phaser.Math.Clamp(W/2 + dx*0.15, 180, W-180);

  // firing
  if (fireHold && time-lastShot>80){
    lastShot=time;
    fireBullet(this);
  }

  // spawns
  spawnTimer += delta;
  if (spawnTimer>450){
    spawnTimer=0;
    if (Math.random()<0.85) spawnMinion(this,false); else spawnRunner(this);
  }

  // wave/boss
  if (score > wave*150){
    wave++;
    ui.wave.setText('Wave '+wave);
  }
  bossTimer += delta;
  if (wave>0 && wave%5===0 && bossTimer>12000){
    bossTimer=0; spawnGiant(this);
  }
}

function drawBackground(s){
  // Simple layered desert canyon with faux perspective
  const g = s.add.graphics();
  const layers = [
    { color:0x1c212b, y: H*0.15 },
    { color:0x232a35, y: H*0.30 },
    { color:0x2a3340, y: H*0.45 },
  ];
  layers.forEach((L,i)=>{
    g.fillStyle(L.color, 1);
    g.fillRect(0, L.y, W, H);
  });
  // canyon walls
  const wall = s.add.graphics();
  wall.fillStyle(0x3b2d1a,1);
  wall.fillTriangle(0,H*0.42, W*0.18,H*0.28, W*0.35,H*0.42);
  wall.fillTriangle(W,H*0.42, W*0.82,H*0.28, W*0.65,H*0.42);
  // sand floor gradient via strips
  const sand = s.add.graphics();
  for(let i=0;i<40;i++){
    const t=i/40, col = Phaser.Display.Color.GetColor(210+Math.floor(20*t), 176+Math.floor(15*t), 120+Math.floor(10*t));
    sand.fillStyle(col,1);
    const y = H*0.42 + t*(H*0.58);
    sand.fillRect(0,y,W,H/40+2);
  }
  // far crowd hint
  const dots = s.add.graphics({x:0,y:H*0.42});
  dots.fillStyle(0x2a2f3a,1);
  for(let x=0;x<W;x+=8){ dots.fillCircle(x, Phaser.Math.Between(0,20), 1.2); }
}

function fireBullet(s){
  // muzzle flash
  muzzle.setAlpha(0.9);
  s.tweens.add({ targets:muzzle, alpha:0, duration:80 });
  s.cameras.main.shake(40, 0.002);

  // multiple tracers
  for(let i=0;i<2;i++){
    const b = s.add.rectangle(gun.x-6+i*6, H-84, 3, 18, 0xfff1a8);
    s.physics.add.existing(b);
    b.body.setVelocity(0, -520 - Math.random()*50);
    bullets.add(b);
  }
}

function spawnMinion(s, spread){
  const x = spread ? Phaser.Math.Between(60, W-60) : pickLane();
  const y = -10;
  const e = s.add.rectangle(x, y, 12, 18, 0x5c8ab6);
  e.kind='minion'; e.hp=1;
  s.physics.add.existing(e);
  e.body.setVelocity(0, 90 + Math.random()*40 + wave*6);
  enemies.add(e);
}

function spawnRunner(s){
  const x = pickLane();
  const e = s.add.triangle(x, -14, 0,18, 9,0, 18,18, 0x8bcf7a);
  e.kind='runner'; e.hp=1;
  s.physics.add.existing(e);
  e.body.setVelocity(0, 170 + wave*10);
  enemies.add(e);
}

function spawnGiant(s){
  const x = Phaser.Math.Between(160, W-160);
  const e = s.add.container(x, -60);
  const body = s.add.rectangle(0,0, 44,54, 0xc86d5b).setStrokeStyle(3,0x3c1f1b);
  const head = s.add.circle(0,-36, 14, 0xe6a38f);
  const armL = s.add.rectangle(-28,0, 10,36, 0xd07a6a);
  const armR = s.add.rectangle( 28,0, 10,36, 0xd07a6a);
  const belt = s.add.rectangle(0,10, 44,8, 0x3b2d1a);
  e.add([body,head,armL,armR,belt]);
  s.physics.add.existing(e);
  e.body.setVelocity(0, 70 + wave*5);
  e.kind='giant'; e.hp=12+wave;

  // health bar
  const barBg = s.add.rectangle(0,-50, 50,6, 0x2a2a2a);
  const bar = s.add.rectangle(-25,-50, 50,6, 0xff6b6b).setOrigin(0,0.5);
  e.add([barBg, bar]);
  e.bar = bar;
  giants.add(e);
}

function pickLane(){
  const lanes=[W*0.20, W*0.35, W*0.50, W*0.65, W*0.80];
  return lanes[Math.floor(Math.random()*lanes.length)];
}

function impact(x,y){
  for(let i=0;i<6;i++){
    const p = scene.add.rectangle(x,y, 2,2, 0xffe6a3);
    scene.tweens.add({ targets:p, x:x+Phaser.Math.Between(-14,14), y:y+Phaser.Math.Between(-14,14), alpha:0, duration:220, onComplete:()=>p.destroy() });
  }
}

function damageEnemy(e, d){
  e.hp -= d;
  if (e.bar){ e.bar.scaleX = Math.max(0, e.hp / (12+wave)); }
  if (e.hp<=0){
    if (e.list){ e.destroy(true); } else { e.destroy(); }
    scoreUp(20);
  }
}

function scoreUp(n){ score+=n; ui.score.setText('Score: '+score); }

