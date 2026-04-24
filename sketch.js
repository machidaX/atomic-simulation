/**
 * 3D原子モデルシミュレーション（学習用）
 * 操作方法:
 * [P]キー：陽子(赤)を追加
 * [N]キー：中性子(灰)を追加
 * [E]キー：電子(白)を追加
 * マウスドラッグ：視点回転
 * スクロール：拡大・縮小
 */

let particles = [];

// 物理定数の設定
const COULOMB_CONST = 300;   // 静電気力（反発・引き合い）の強さ
const STICK_DIST = 100;      // 核力が働き始める距離
// 【修正】ターゲット距離を少し小さくして、粒子をめり込ませることで穴を埋める
const TARGET_DIST = 32;      // 粒子がくっつく理想的な距離（少し小さくして、穴を埋める）
const SPRING_CONST = 3;      // くっつく力の強さ
// 【修正】摩擦を少し減らして、結合後に最適な位置に settles しやすくする
const FRICTION = 0.93;       // 摩擦（原子核の安定用）

function setup() {
  // Chromebookでもスムーズに動くよう、画面サイズに合わせてキャンバスを作成
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // 初期状態で陽子を1つ中央に配置
  particles.push(new Particle(0, 0, 0, 'proton'));

  // 操作説明の表示（画面左上）
  let info = createDiv('キー操作: [P]陽子 [N]中性子 [E]電子を追加<br>ドラッグで回転 / スクロールでズーム');
  info.style('position', 'absolute');
  info.style('top', '20px');
  info.style('left', '20px');
  info.style('color', '#ffffff');
  info.style('font-family', 'sans-serif');
}

function draw() {
  background(30); // 背景を暗いグレーに

  // カメラ操作を有効化
  orbitControl(); 

  // 照明の設定（色飛びを防ぎ、立体感を出す）
  ambientLight(150); 
  pointLight(255, 255, 255, 200, -200, 300);

  // 1. 各粒子の物理計算
  for (let i = 0; i < particles.length; i++) {
    let p1 = particles[i];
    
    // 中心に引き寄せる力（原子としてまとまりやすくする）
    let toCenter = createVector(-p1.pos.x, -p1.pos.y, -p1.pos.z);
    if (p1.type === 'electron') {
      toCenter.normalize().mult(0.6); // 電子は中心に向かって回り続ける力
    } else {
      // 【修正】陽子・中性子を中心（穴を埋める方向）に少し強く引き寄せる
      toCenter.mult(0.01); // 陽子・中性子は中央で出会うための緩やかな力
    }
    p1.applyForce(toCenter);

    // 粒子同士の相互作用（2重ループ）
    for (let j = i + 1; j < particles.length; j++) {
      let p2 = particles[j];
      let force = calculateAtomicForces(p1, p2);
      p1.applyForce(p5.Vector.mult(force, -1));
      p2.applyForce(force);
    }
  }

  // 2. 更新と描画、及び安定性カウント
  let protonCount = 0;
  let neutronCount = 0;

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.display();
    
    if (p.type === 'proton') protonCount++;
    if (p.type === 'neutron') neutronCount++;
  }
  
  // 3. 原子核の安定性チェック（中性子が少なすぎると崩壊）
  checkStability(protonCount, neutronCount);
}

// 物理演算エンジン：粒子間の力を計算
function calculateAtomicForces(p1, p2) {
  let forceDirection = p5.Vector.sub(p2.pos, p1.pos);
  let distance = forceDirection.mag();
  if (distance < 1) distance = 1;
  forceDirection.normalize();

  let isNucleon1 = (p1.type === 'proton' || p1.type === 'neutron');
  let isNucleon2 = (p2.type === 'proton' || p2.type === 'neutron');

  // 原子核の粒子同士（陽子・中性子）に働く強い核力のシミュレーション
  if (isNucleon1 && isNucleon2 && distance < STICK_DIST) {
    // 理想的な距離(TARGET_DIST)に保とうとするバネの力
    let springForce = (TARGET_DIST - distance) * SPRING_CONST;
    
    // 【重要】多数の粒子が密集しても爆発しないよう、力に上限をかける
    springForce = constrain(springForce, -8, 8);
    
    forceDirection.mult(springForce);

    // 接触時にブルブル震えないようにブレーキをかける
    p1.vel.mult(0.85);
    p2.vel.mult(0.85);

    return forceDirection;
  }

  // 電子や離れた陽子同士に働くクーロン力（電気的な反発・引力）
  let cStrength = (COULOMB_CONST * p1.charge * p2.charge) / (distance * distance);
  forceDirection.mult(cStrength);
  return forceDirection;
}

// 簡易的な原子核の安定性ルール
function checkStability(z, n) {
  let unstable = false;
  // ヘリウム(z=2)以上で、中性子が陽子より明らかに少ない場合は不安定
  if (z >= 2 && n < z - 0.5) unstable = true;
  // 中性子が陽子の2倍を超えても不安定
  if (n > z * 2 && z > 0) unstable = true;

  if (unstable && frameCount % 60 === 0) { 
    explode();
  }
}

// 崩壊時の演出
function explode() {
  for (let p of particles) {
    if (p.type !== 'electron') {
      p.vel.add(p5.Vector.random3D().mult(25)); 
    }
  }
}

// キー入力による粒子追加
function keyPressed() {
  let pos = p5.Vector.random3D().mult(80); // 出現位置
  if (key === 'p' || key === 'P') {
    particles.push(new Particle(pos.x, pos.y, pos.z, 'proton'));
  }
  if (key === 'n' || key === 'N') {
    particles.push(new Particle(pos.x, pos.y, pos.z, 'neutron'));
  }
  if (key === 'e' || key === 'E') {
    // 電子は少し離れた場所から、初速を持って追加（周回しやすくするため）
    let e = new Particle(150, 0, 0, 'electron');
    e.vel = createVector(0, 6, 3);
    particles.push(e);
  }
}

// 粒子のクラス定義
class Particle {
  constructor(x, y, z, type) {
    this.pos = createVector(x, y, z);
    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
    this.type = type;

    // 種類ごとの色・大きさ・性質の設定
    if (type === 'proton') {
      this.charge = 1; this.mass = 10; this.radius = 18;
      this.color = color(255, 50, 50); // 陽子：赤
    } else if (type === 'neutron') {
      this.charge = 0; this.mass = 10; this.radius = 18;
      this.color = color(150, 150, 150); // 中性子：グレー
    } else if (type === 'electron') {
      this.charge = -1; this.mass = 1; this.radius = 6;
      this.color = color(255, 255, 255); // 電子：白
    }
  }

  applyForce(force) {
    let f = p5.Vector.div(force, this.mass);
    this.acc.add(f);
  }

  update() {
    this.vel.add(this.acc);
    // 電子以外は摩擦で止まりやすくする（原子核の形成）
    if (this.type !== 'electron') this.vel.mult(FRICTION);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    noStroke();
    
    // 正しい色を表示するためのマテリアル設定
    fill(this.color); 
    ambientMaterial(this.color); 

    // Chromebook負荷対策のため解像度(16)を抑えた球体
    sphere(this.radius, 16, 16);
    pop();
  }
}

// ブラウザのリサイズに対応
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}