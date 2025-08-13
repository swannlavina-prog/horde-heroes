
const W=900,H=600;
const config={type:Phaser.AUTO,parent:'game',backgroundColor:'#0e1216',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},physics:{default:'arcade',arcade:{debug:false}},scene:{preload,create,update}};
let bg,turret,reticle,bullets,mobs,giants,ui={},inputState={firing:false},score=0,wave=1,health=100,spawnTimer=0,giantTimer=0;
new Phaser.Game(config);
function preload(){this.load.image('bg','bg_desert.png');this.load.image('turret','turret.png');this.load.image('minion','minion.png');this.load.image('giant','giant.png');}
function create(){
  bg=this.add.image(W/2,H/2,'bg').setDisplaySize(W,H);
  this.add.rectangle(W/2,H/2,260,520,0x0a0c10,.5).setStrokeStyle(2,0x30363d,.6);
  turret=this.add.image(W/2,H-80,'turret').setOrigin(.5,1).setDepth(10);
  reticle=this.add.circle(W/2,H*0.55,6,0xffffff).setDepth(11).setStrokeStyle(2,0x44e0ff);
  bullets=this.physics.add.group();mobs=this.physics.add.group();giants=this.physics.add.group();
  ui.text=this.add.text(12,10,'Score: 0  Wave: 1  HP: 100',{fontFamily:'monospace',fontSize:18,color:'#fff'}).setDepth(20);
  this.input.on('pointermove',(p)=>{reticle.x=Phaser.Math.Clamp(p.x,80,W-80);});
  this.input.on('pointerdown',()=>inputState.firing=true);
  this.input.on('pointerup',()=>inputState.firing=false);
  const fireBtn=document.getElementById('fireBtn');fireBtn.addEventListener('touchstart',(e)=>{e.preventDefault();inputState.firing=true;},{passive:false});fireBtn.addEventListener('touchend',(e)=>{e.preventDefault();inputState.firing=false;},{passive:false});
  this.physics.add.overlap(bullets,mobs,(b,m)=>{b.destroy();hit(this,m,1);},null,this);
  this.physics.add.overlap(bullets,giants,(b,g)=>{b.destroy();hit(this,g,2);},null,this);
}
function update(time,delta){
  spawnTimer+=delta;if(spawnTimer>Math.max(450-wave*10,120)){spawnTimer=0;spawnMinion(this);if(Phaser.Math.Between(0,4)===0)spawnRunner(this);}
  giantTimer+=delta;if(giantTimer>9000){giantTimer=0;spawnGiant(this);}
  if(inputState.firing && time%45<20) shoot(this);
  mobs.children.iterate(m=>{if(m&&m.y>H-120){m.destroy();damage(this,5);}});
  giants.children.iterate(g=>{if(g&&g.y>H-140){g.destroy();damage(this,20);}});
}
function shoot(scene){const b=scene.add.rectangle(reticle.x,H-120,3,14,0xffffaa);scene.physics.add.existing(b);b.body.setVelocityY(-600);bullets.add(b);const flash=scene.add.rectangle(reticle.x,H-120,6,20,0xfff3a3).setDepth(12);scene.tweens.add({targets:flash,alpha:0,y:H-130,duration:90,onComplete:()=>flash.destroy()});scene.cameras.main.shake(60,0.001);}
function spawnMinion(scene){const x=Phaser.Math.Between(140,W-140);const m=scene.add.image(x,-20,'minion').setDepth(2);scene.physics.add.existing(m);m.body.setVelocityY(70+wave*8);m.hp=2;m.score=5;mobs.add(m);}
function spawnRunner(scene){const x=Phaser.Math.Between(140,W-140);const m=scene.add.image(x,-20,'minion').setDepth(2).setScale(0.9);scene.physics.add.existing(m);m.body.setVelocityY(160+wave*12);m.tint=0xffcc88;m.hp=1;m.score=8;mobs.add(m);}
function spawnGiant(scene){const x=Phaser.Math.Between(220,W-220);const g=scene.add.image(x,-60,'giant').setDepth(3);scene.physics.add.existing(g);g.body.setVelocityY(60+wave*5);g.hp=16+wave*0.5;g.score=40;giants.add(g);const bar=scene.add.rectangle(g.x,g.y-70,80,8,0x222222).setDepth(4);const fill=scene.add.rectangle(g.x-40,g.y-70,80,8,0xff4444).setOrigin(0,0.5).setDepth(5);g.on('destroy',()=>{bar.destroy();fill.destroy();});g.healthBar={bar,fill};scene.tweens.add({targets:g,y:g.y+6,duration:500,yoyo:true,repeat:-1,ease:'sine.inOut'});}
function hit(scene,m,power){if(!m||!m.hp)return;m.hp-=power;spark(scene,m.x,m.y);if(m.healthBar){const max=16+wave*0.5;const ratio=Math.max(m.hp/max,0);m.healthBar.fill.scaleX=ratio;}if(m.hp<=0){score+=m.score||10;ui.text.setText(`Score: ${score}  Wave: ${wave}  HP: ${health}`);m.destroy();if(score>wave*120)wave++;}}
function damage(scene,n){health=Math.max(health-n,0);ui.text.setText(`Score: ${score}  Wave: ${wave}  HP: ${health}`);scene.cameras.main.flash(100,255,60,60);if(health<=0){scene.scene.pause();const over=scene.add.text(W/2,H/2,`Defeated!\nScore ${score}\nClick to retry`,{fontFamily:'monospace',fontSize:28,color:'#fff',align:'center'}).setOrigin(0.5).setDepth(20);scene.input.once('pointerdown',()=>{scene.scene.restart();score=0;wave=1;health=100;});}}
function spark(scene,x,y){for(let i=0;i<4;i++){const p=scene.add.rectangle(x,y,2,6,0xfff3a3).setDepth(8);scene.tweens.add({targets:p,x:x+Phaser.Math.Between(-20,20),y:y+Phaser.Math.Between(-20,20),alpha:0,duration:200,onComplete:()=>p.destroy()});}}
