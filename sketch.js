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
  "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn"
];

const elementsJa = [
  "中性子", "水素", "ヘリウム", "リチウム", "ベリリウム", "ホウ素", "炭素", "窒素", "酸素", "フッ素", "ネオン", 
  "ナトリウム", "マグネシウム", "アルミニウム", "ケイ素", "リン", "硫黄", "塩素", "アルゴン", "カリウム", "カルシウム",
  "スカンジウム", "チタン", "バナジウム", "クロム", "マンガン", "鉄", "コバルト", "ニッケル", "銅", "亜鉛",
  "ガリウム", "ゲルマニウム", "ヒ素", "セレン", "臭素", "クリプトン", "ルビジウム", "ストロンチウム", "イットリウム", "ジルコニウム",
  "ニオブ", "モリブデン", "テクネチウム", "ルテニウム", "ロジウム", "パラジウム", "銀", "カドミウム", "インジウム", "スズ"
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
  "S2-": "硫化物イオン",
  "Cl-": "塩化物イオン",
  "K+": "カリウムイオン",
  "Ca2+": "カルシウムイオン",
  "Ba2+": "バリウムイオン",
  "Cu2+": "銅イオン",
  "Zn2+": "亜鉛イオン",
  "Ag+": "銀イオン"
};

// 物理定数
const COULOMB_CONST = 300;
const FRICTION = 0.85; 

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

    // 中心への引力（核種と電子で挙動を変える）
    let towardCenter = createVector(-p1.pos.x, -p1.pos.y, -p1.pos.z);
    let distFromCenter = towardCenter.mag();
    
    if (p1.type === 'electron') {
      if (distFromCenter > 0) towardCenter.normalize();
      
      // 【周回動作調整】跳ね返りを抑え、滑らかに周回させるための力（径方向ダンピング）
      let radialVec = towardCenter.copy().mult(-1); 
      let radialVelScalar = p1.vel.dot(radialVec); 
      let radialDampingForce = radialVec.copy().mult(-radialVelScalar * 0.3); 
      p1.applyForce(radialDampingForce);

      if (distFromCenter > 250) {
        // 飛び散り防止領域 (r > 250) -> 強めに中心へ引き戻す
        towardCenter.mult(1.5); 
      } else {
        // 安定軌道領域 -> クーロン引力に任せるため、中心強制引力はごくわずかにする
        towardCenter.mult(0.05); 
      }
    } else {
      // 原子核の中心への引力
      towardCenter.mult(0.015); 
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

  createGroup(panel, '陽子 (p<sup>+</sup>)', 'proton', '#ff3232');
  createGroup(panel, '中性子 (n)', 'neutron', '#969696');
  createGroup(panel, '電子 (e<sup>-</sup>)', 'electron', '#ffffff');
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
  
  let chargeText;
  let ionFormat;     
  let displaySymbol; 
  
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
  
  let stateText = "";
  if (charge === 0 && p > 0) {
    stateText = `${nameJa}原子`;
  } else if (ionNames[ionFormat]) {
    stateText = ionNames[ionFormat];
  } else if (p > 0) {
    stateText = charge > 0 ? "陽イオン" : "陰イオン";
  }
  
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
  let pos = p5.Vector.random3D().mult(type === 'electron' ? 100 : 60);
  let p = new Particle(pos.x, pos.y, pos.z, type);
  // 初期速度。接線方向に初速を与えて周回しやすくする
  if (type === 'electron') {
    let velDir = p5.Vector.random3D();
    p.vel = velDir.cross(pos).normalize().mult(8);
  }
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

  // 核子同士（陽子・中性子）の相互作用
  if (isNucleon1 && isNucleon2) {
    let diam = p1.radius + p2.radius; 
    let interactionRange = diam * 1.8; 
    
    if (distance < interactionRange) {
      let forceMag = 0;
      if (distance < diam) {
        forceMag = (diam - distance) * 1.5; 
      } else {
        forceMag = (diam - distance) * 0.25; 
      }
      
      forceMag = constrain(forceMag, -8, 30);
      forceDirection.mult(forceMag);
      
      return forceDirection;
    }
    return createVector(0, 0, 0); 
  }

  // 電子と他の粒子（原子核・電子同士）のクーロン力
  // 極端に近づいた際のスイングバイを防ぐため、計算上の距離の下限を設ける
  let calcDist = max(distance, 35); 
  let cStrength = (COULOMB_CONST * p1.charge * p2.charge) / (calcDist * calcDist);
  forceDirection.mult(cStrength);
  return forceDirection;
}

function checkStability(z, n) {
  let unstable = (z >= 2 && n < z - 0.5) || (n > z * 2 && z > 0);
  if (unstable && frameCount % 60 === 0) {
    for (let p of particles) {
      if (p.type !== 'electron') p.vel.add(p5.Vector.random3D().mult(10));
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
    if (this.type !== 'electron') {
      // 核子は摩擦で中心に集まる
      this.vel.mult(FRICTION); 
    } else {
      // 電子は摩擦をなくし、常に「速度8」を保つようにオートクルーズする
      let speed = this.vel.mag();
      let targetSpeed = 8;
      if (speed > 0.1) {
        // 現在の速度と目標速度の差分を埋めるように調整（急激な加速や減速を防ぐ）
        this.vel.setMag(speed + (targetSpeed - speed) * 0.1);
      }
    }
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
