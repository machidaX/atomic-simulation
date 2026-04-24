/**
 * 原子モデル・学習シミュレーター（GitHub公開版）
 */

let particles = [];
let infoDiv, statusWindow;

// Z=47（銀）まで対応できるよう元素リストを拡張
const elements = [
  "n", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", 
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
  "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
  "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
  "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag"
];

const elementsJa = [
  "中性子", "水素", "ヘリウム", "リチウム", "ベリリウム", "ホウ素", "炭素", "窒素", "酸素", "フッ素", "ネオン", 
  "ナトリウム", "マグネシウム", "アルミニウム", "ケイ素", "リン", "硫黄", "塩素", "アルゴン", "カリウム", "カルシウム",
  "スカンジウム", "チタン", "バナジウム", "クロム", "マンガン", "鉄", "コバルト", "ニッケル", "銅", "亜鉛",
  "ガリウム", "ゲルマニウム", "ヒ素", "セレン", "臭素", "クリプトン", "ルビジウム", "ストロンチウム", "イットリウム", "ジルコニウム",
  "ニオブ", "モリブデン", "テクネチウム", "ルテニウム", "ロジウム", "パラジウム", "銀"
];

// 特定のイオン名の辞書
const ionNames = {
  "H+": "水素イオン",
  "Li+": "リチウムイオン",
  "O2-": "酸化物イオン",
  "F-": "フッ化物イオン",
  "Na+": "ナトリウムイオン",
  "Mg2+": "マグネシウムイオン",
  "Al3+": "アルミニウムイオン",
  "Cl-": "塩化物イオン",
  "K+": "カリウムイオン",
  "Ca2+": "カルシウムイオン",
  "Cu2+": "銅イオン",
  "Zn2+": "亜鉛イオン",
  "Ag+": "銀イオン"
};

// 物理定数
const COULOMB_CONST = 300;
const STICK_DIST = 100;
const TARGET_DIST = 32;
const SPRING_CONST = 3;
const FRICTION = 0.93;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // 初期配置：陽子1つ
  addParticle('proton');

  // UIの作成
  createControlPanel();
  createStatusWindow();
}

function draw() {
  background(30);
  orbitControl(); 

  ambientLight(150); 
  pointLight(255, 255, 255, 200, -200, 300);

  let pCount = 0;
  let nCount = 0;
  let eCount = 0;

  // 1. 物理計算
  for (let i = 0; i < particles.length; i++) {
    let p1 = particles[i];
    
    // カウント
    if (p1.type === 'proton') pCount++;
    if (p1.type === 'neutron') nCount++;
    if (p1.type === 'electron') eCount++;

    // 中心への引力
    let towardCenter = createVector(-p1.pos.x, -p1.pos.y, -p1.pos.z);
    if (p1.type === 'electron') {
      towardCenter.normalize().mult(0.6);
    } else {
      towardCenter.mult(0.01);
    }
    p1.applyForce(towardCenter);

    for (let j = i + 1; j < particles.length; j++) {
      let p2 = particles[j];
      let force = calculateAtomicForces(p1, p2);
      p1.applyForce(p5.Vector.mult(force, -1));
      p2.applyForce(force);
    }
  }

  // 2. 更新と表示
  for (let p of particles) {
    p.update();
    p.display();
  }
  
  // 3. UIの更新
  updateUI(pCount, nCount, eCount);
  checkStability(pCount, nCount);
}

// --- UI作成関連 ---

function createControlPanel() {
  let panel = createDiv('');
  panel.style('position', 'absolute');
  panel.style('bottom', '20px');
  panel.style('left', '50%');
  panel.style('transform', 'translateX(-50%)');
  panel.style('display', 'flex');
  panel.style('gap', '10px');
  panel.style('background', 'rgba(0,0,0,0.6)');
  panel.style('padding', '15px');
  panel.style('border-radius', '10px');

  // 陽子ボタン
  createGroup(panel, '陽子 (P)', 'proton', '#ff3232');
  // 中性子ボタン
  createGroup(panel, '中性子 (N)', 'neutron', '#969696');
  // 電子ボタン
  createGroup(panel, '電子 (e)', 'electron', '#ffffff');
}

function createGroup(parent, label, type, col) {
  let container = createDiv('');
  container.parent(parent);
  container.style('text-align', 'center');
  
  let labelDiv = createDiv(label);
  labelDiv.parent(container);
  labelDiv.style('color', col);
  labelDiv.style('margin-bottom', '5px');
  labelDiv.style('font-weight', 'bold');

  let btnAdd = createButton('＋ 追加');
  btnAdd.parent(container);
  btnAdd.mousePressed(() => addParticle(type));
  
  let btnRem = createButton('－ 除去');
  btnRem.parent(container);
  btnRem.mousePressed(() => removeParticle(type));
}

function createStatusWindow() {
  statusWindow = createDiv('');
  statusWindow.style('position', 'absolute');
  statusWindow.style('top', '20px');
  statusWindow.style('right', '20px');
  statusWindow.style('width', '180px');
  statusWindow.style('background', 'rgba(255,255,255,0.1)');
  statusWindow.style('color', 'white');
  statusWindow.style('padding', '20px');
  statusWindow.style('border', '1px solid rgba(255,255,255,0.3)');
  statusWindow.style('border-radius', '5px');
  statusWindow.style('font-family', 'monospace');
}

function updateUI(p, n, e) {
  let symbol = (p < elements.length) ? elements[p] : "??";
  let nameJa = (p < elementsJa.length) ? elementsJa[p] : "未知の元素";
  let charge = p - e;
  
  // 電荷テキストとイオン式の生成
  let chargeText;
  let ionFormat;     // 辞書判定用
  let displaySymbol; // 画面表示用（上付き文字）
  
  if (charge > 0) {
    chargeText = `${charge}+`;
    let chargeStr = charge === 1 ? '+' : charge + '+';
    ionFormat = `${symbol}${chargeStr}`;
    displaySymbol = `${symbol}<sup style="font-size:0.6em;">${chargeStr}</sup>`;
  } else if (charge < 0) {
    chargeText = `${Math.abs(charge)}-`;
    let chargeStr = Math.abs(charge) === 1 ? '-' : Math.abs(charge) + '-';
    ionFormat = `${symbol}${chargeStr}`;
    displaySymbol = `${symbol}<sup style="font-size:0.6em;">${chargeStr}</sup>`;
  } else {
    chargeText = "±0";
    ionFormat = symbol;
    displaySymbol = symbol;
  }
  
  // 状態の判定
  let stateText = "";
  if (charge === 0 && p > 0) {
    stateText = `${nameJa}原子`;
  } else if (ionNames[ionFormat]) {
    stateText = ionNames[ionFormat];
  } else if (p > 0) {
    stateText = charge > 0 ? "陽イオン" : "陰イオン";
  }
  
  // 指定された順序でHTMLを構成
  statusWindow.html(`
    <div style="font-size:12px; opacity:0.7;">原子</div>
    <div style="font-size:48px; text-align:center; margin:10px 0;">${displaySymbol}</div>
    <hr style="opacity:0.3">
    <div style="font-size:14px; line-height:1.6;">
      原子番号: ${p}<br>
      陽子数: ${p}<br>
      中性子数: ${n}<br>
      電子数: ${e}<br>
      質量数: ${p + n}<br>
      <span style="color:${charge === 0 ? '#44ff44' : '#ffcc44'}">
        帯びている電気: ${chargeText}
      </span><br>
      <span style="color:#00ffff; font-weight:bold; display:block; margin-top:5px;">
        状態: ${stateText}
      </span>
    </div>
  `);
}

// --- 粒子操作ロジック ---

function addParticle(type) {
  let pos = p5.Vector.random3D().mult(type === 'electron' ? 150 : 50);
  let p = new Particle(pos.x, pos.y, pos.z, type);
  if (type === 'electron') p.vel = createVector(0, 6, 3);
  particles.push(p);
}

function removeParticle(type) {
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].type === type) {
      particles.splice(i, 1);
      break;
    }
  }
}

// --- 物理計算・安定性 ---

function calculateAtomicForces(p1, p2) {
  let forceDirection = p5.Vector.sub(p2.pos, p1.pos);
  let distance = forceDirection.mag();
  if (distance < 1) distance = 1;
  forceDirection.normalize();

  let isNucleon1 = (p1.type === 'proton' || p1.type === 'neutron');
  let isNucleon2 = (p2.type === 'proton' || p2.type === 'neutron');

  if (isNucleon1 && isNucleon2 && distance < STICK_DIST) {
    let springForce = (TARGET_DIST - distance) * SPRING_CONST;
    springForce = constrain(springForce, -8, 8);
    forceDirection.mult(springForce);
    p1.vel.mult(0.85);
    p2.vel.mult(0.85);
    return forceDirection;
  }

  let cStrength = (COULOMB_CONST * p1.charge * p2.charge) / (distance * distance);
  forceDirection.mult(cStrength);
  return forceDirection;
}

function checkStability(z, n) {
  let unstable = (z >= 2 && n < z - 0.5) || (n > z * 2 && z > 0);
  if (unstable && frameCount % 60 === 0) {
    for (let p of particles) {
      if (p.type !== 'electron') p.vel.add(p5.Vector.random3D().mult(15));
    }
  }
}

class Particle {
  constructor(x, y, z, type) {
    this.pos = createVector(x, y, z);
    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
    this.type = type;

    if (type === 'proton') {
      this.charge = 1; this.mass = 10; this.radius = 18;
      this.color = color(255, 50, 50);
    } else if (type === 'neutron') {
      this.charge = 0; this.mass = 10; this.radius = 18;
      this.color = color(150, 150, 150);
    } else if (type === 'electron') {
      this.charge = -1; this.mass = 1; this.radius = 6;
      this.color = color(255, 255, 255);
    }
  }

  applyForce(force) {
    this.acc.add(p5.Vector.div(force, this.mass));
  }

  update() {
    this.vel.add(this.acc);
    if (this.type !== 'electron') this.vel.mult(FRICTION);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    noStroke();
    fill(this.color);
    ambientMaterial(this.color);
    sphere(this.radius, 12, 12);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
