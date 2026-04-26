/**
 * 原子モデル・学習シミュレーター
 * （UI左右配置 ＆ 視認性向上版）
 */

let particles = [];
let infoDiv, statusWindow;
let ptContainer;
let ptCells = {}; 
let nuclearUnstable = false; 
let unstableFrames = 0; 
let decayCounter = 1; 

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

const ionNames = {
  "H+": "水素イオン", "Li+": "リチウムイオン", "O2-": "酸化物イオン",
  "F-": "フッ化物イオン", "Na+": "ナトリウムイオン", "Mg2+": "マグネシウムイオン",
  "Al3+": "アルミニウムイオン", "S2-": "硫化物イオン", "Cl-": "塩化物イオン",
  "K+": "カリウムイオン", "Ca2+": "カルシウムイオン", "Ba2+": "バリウムイオン",
  "Cu2+": "銅イオン", "Zn2+": "亜鉛イオン", "Ag+": "銀イオン"
};

const COULOMB_CONST = 300;
const FRICTION = 0.85; 

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  addParticle('proton');
  createControlPanel();
  createStatusWindow();
  createPeriodicTable();
}

function draw() {
  background(30);
  orbitControl(); 
  translate(-100, 0, 0);

  ambientLight(150); 
  pointLight(255, 255, 255, 200, -200, 300);

  let pCount = 0;
  let nCount = 0;
  let eCount = 0;

  for (let i = 0; i < particles.length; i++) {
    let p1 = particles[i];
    
    if (!p1.isEjected) {
      if (p1.type === 'proton') pCount++;
      if (p1.type === 'neutron') nCount++;
      if (p1.type === 'electron') eCount++;
    }

    let towardCenter = createVector(-p1.pos.x, -p1.pos.y, -p1.pos.z);
    let distFromCenter = towardCenter.mag();
    
    if (!p1.isEjected) {
      if (p1.type === 'electron' || p1.type === 'positron') {
        if (distFromCenter > 0) towardCenter.normalize();
        let radialVec = towardCenter.copy().mult(-1); 
        let radialVelScalar = p1.vel.dot(radialVec); 
        let radialDampingForce = radialVec.copy().mult(-radialVelScalar * 0.3); 
        p1.applyForce(radialDampingForce);

        if (distFromCenter > 250) {
          towardCenter.mult(1.5); 
        } else {
          towardCenter.mult(0.05); 
        }
      } else {
        towardCenter.mult(0.015); 
      }
      p1.applyForce(towardCenter);
    }

    for (let j = i + 1; j < particles.length; j++) {
      let p2 = particles[j];
      let force = calculateAtomicForces(p1, p2);
      p1.applyForce(p5.Vector.mult(force, -1));
      p2.applyForce(force);
    }
  }

  nuclearUnstable = (pCount >= 2 && nCount < pCount - 0.5) || (nCount > pCount * 2 && pCount > 0);

  for (let p of particles) {
    p.update();
    p.display();
  }
  
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].isEjected && particles[i].pos.mag() > 1000) {
      particles.splice(i, 1);
    }
  }

  updateUI(pCount, nCount, eCount);
  checkDecay(pCount, nCount); 
}

// --- UI作成関連 ---

function createControlPanel() {
  let panel = createDiv('');
  panel.style('position', 'absolute');
  panel.style('bottom', '20px');
  panel.style('right', '20px'); // 右下に配置変更
  panel.style('display', 'flex');
  panel.style('gap', '15px');
  panel.style('background', 'rgba(0,0,0,0.6)');
  panel.style('padding', '15px 25px');
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
  labelDiv.style('margin-bottom', '8px');
  labelDiv.style('font-weight', 'bold');
  labelDiv.style('font-size', '16px');

  let btnAdd = createButton('🔼 追加'); // 見やすい記号に変更
  btnAdd.parent(container);
  btnAdd.style('margin', '0 3px');
  btnAdd.style('padding', '6px 12px');
  btnAdd.style('cursor', 'pointer');
  btnAdd.mousePressed(() => addParticle(type));
  
  let btnRem = createButton('🔽 除去'); // 見やすい記号に変更
  btnRem.parent(container);
  btnRem.style('margin', '0 3px');
  btnRem.style('padding', '6px 12px');
  btnRem.style('cursor', 'pointer');
  btnRem.mousePressed(() => removeParticle(type));
}

function createStatusWindow() {
  statusWindow = createDiv('');
  statusWindow.style('position', 'absolute');
  statusWindow.style('top', '20px');
  statusWindow.style('right', '20px');
  statusWindow.style('width', '280px'); 
  statusWindow.style('background', 'rgba(0,0,0,0.7)');
  statusWindow.style('color', 'white');
  statusWindow.style('padding', '25px'); 
  statusWindow.style('border', '2px solid rgba(255,255,255,0.4)');
  statusWindow.style('border-radius', '8px');
  statusWindow.style('font-family', 'monospace');
  statusWindow.style('box-shadow', '0 4px 10px rgba(0,0,0,0.5)');
}

function createPeriodicTable() {
  ptContainer = createDiv('');
  ptContainer.style('position', 'absolute');
  ptContainer.style('bottom', '20px');
  ptContainer.style('left', '20px'); // 左下に配置変更
  ptContainer.style('display', 'grid');
  ptContainer.style('grid-template-columns', 'repeat(18, 24px)'); 
  ptContainer.style('gap', '2px');
  ptContainer.style('background', 'rgba(0,0,0,0.6)');
  ptContainer.style('padding', '10px');
  ptContainer.style('border-radius', '8px');

  const layout = [
    [1, 1, 1], [2, 1, 18], 
    [3, 2, 1], [4, 2, 2], [5, 2, 13], [6, 2, 14], [7, 2, 15], [8, 2, 16], [9, 2, 17], [10, 2, 18], 
    [11, 3, 1], [12, 3, 2], [13, 3, 13], [14, 3, 14], [15, 3, 15], [16, 3, 16], [17, 3, 17], [18, 3, 18], 
    ...Array.from({length: 18}, (_, i) => [19 + i, 4, i + 1]), 
    ...Array.from({length: 14}, (_, i) => [37 + i, 5, i + 1])  
  ];

  for (let [z, r, c] of layout) {
    let cell = createDiv(elements[z]);
    cell.style('grid-row', r);
    cell.style('grid-column', c);
    cell.style('display', 'flex');
    cell.style('align-items', 'center');
    cell.style('justify-content', 'center');
    cell.style('font-size', '11px');
    cell.style('font-family', 'sans-serif');
    cell.style('width', '24px');
    cell.style('height', '24px');
    cell.style('color', '#666');
    cell.style('background', 'rgba(255,255,255,0.05)');
    cell.style('border', '1px solid rgba(255,255,255,0.1)');
    cell.style('border-radius', '3px');
    cell.style('transition', '0.3s all');
    cell.style('box-sizing', 'border-box');

    ptCells[z] = cell; 
    cell.parent(ptContainer);
  }
}

function getStabilityInfo(p, n) {
  if (nuclearUnstable) {
    let flash = (unstableFrames > 120 && frameCount % 10 < 5) ? "#ffffff" : "#ff4444";
    return { text: "☢️不安定☢️", color: flash };
  } else if (p > 0) {
    return { text: "安定", color: "#44ff44" };
  } else {
    return { text: "", color: "white" };
  }
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

  let stabilityInfo = getStabilityInfo(p, n);
  
  statusWindow.html(`
    <div style="display:flex; justify-content:space-between; align-items:center; font-size:16px;">
      <span style="opacity:0.8;">原子</span>
      <span style="color:${stabilityInfo.color}; font-weight:bold; letter-spacing:-0.5px;">${stabilityInfo.text}</span>
    </div>
    <div style="font-size:72px; text-align:center; margin:15px 0; font-weight:bold;">${displaySymbol}</div>
    <hr style="opacity:0.4; margin-bottom:15px;">
    <div style="font-size:18px; line-height:1.8;">
      原子番号: ${p}<br>
      陽子数　: ${p}<br>
      中性子数: ${n}<br>
      電子数　: ${e}<br>
      質量数　: ${p + n}<br>
      <span style="color:${charge === 0 ? '#44ff44' : '#ffcc44'}">
        帯電状態: ${chargeText}
      </span><br>
      <span style="color:#00ffff; font-weight:bold; display:block; margin-top:10px; font-size:22px;">
        状態: ${stateText}
      </span>
    </div>
  `);

  let isNeutralAtom = (p > 0 && charge === 0);
  for (let z in ptCells) {
    if (isNeutralAtom && Number(z) === p && !nuclearUnstable) {
      ptCells[z].style('background', '#44ff44');
      ptCells[z].style('color', '#000');
      ptCells[z].style('border-color', '#44ff44');
      ptCells[z].style('box-shadow', '0 0 10px #44ff44');
      ptCells[z].style('font-weight', 'bold');
      ptCells[z].style('transform', 'scale(1.1)');
    } else {
      ptCells[z].style('background', 'rgba(255,255,255,0.05)');
      ptCells[z].style('color', '#666');
      ptCells[z].style('border-color', 'rgba(255,255,255,0.1)');
      ptCells[z].style('box-shadow', 'none');
      ptCells[z].style('font-weight', 'normal');
      ptCells[z].style('transform', 'scale(1.0)');
    }
  }
}

// --- 粒子操作・崩壊ロジック ---

function addParticle(type) {
  let pos = p5.Vector.random3D().mult(type === 'electron' ? 100 : 60);
  let p = new Particle(pos.x, pos.y, pos.z, type);
  if (type === 'electron') {
    let velDir = p5.Vector.random3D();
    p.vel = velDir.cross(pos).normalize().mult(8);
  }
  particles.push(p);
}

function removeParticle(type) {
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].type === type && !particles[i].isEjected) {
      particles.splice(i, 1);
      break;
    }
  }
}

function checkDecay(z, n) {
  if (nuclearUnstable) {
    unstableFrames++;
    if (unstableFrames > 180) {
      triggerDecay(z, n);
      unstableFrames = 0;
    } else if (unstableFrames % 30 === 0) {
      for (let p of particles) {
        if (p.type !== 'electron' && !p.isEjected) {
          p.vel.add(p5.Vector.random3D().mult(10));
        }
      }
    }
  } else {
    unstableFrames = 0; 
  }
}

function triggerDecay(P, N) {
  if (N > P * 2 && P > 0) {
    doBetaMinusDecay();
  } else if (P >= 2 && N < P - 0.5) {
    if (P >= 2 && N >= 2) {
      doAlphaDecay();
    } else {
      doBetaPlusDecay();
    }
  }
}

function doBetaMinusDecay() {
  let nInfo = particles.find(p => p.type === 'neutron' && !p.isEjected);
  if (nInfo) {
    nInfo.type = 'proton';
    nInfo.charge = 1;
    nInfo.color = color(255, 50, 50);
    
    let e = new Particle(nInfo.pos.x, nInfo.pos.y, nInfo.pos.z, 'electron');
    e.isEjected = true; 
    e.vel = p5.Vector.random3D().mult(35); 
    particles.push(e);
  }
}

function doBetaPlusDecay() {
  let pInfo = particles.find(p => p.type === 'proton' && !p.isEjected);
  if (pInfo) {
    pInfo.type = 'neutron';
    pInfo.charge = 0;
    pInfo.color = color(150, 150, 150);
    
    let pos = new Particle(pInfo.pos.x, pInfo.pos.y, pInfo.pos.z, 'positron');
    pos.isEjected = true;
    pos.vel = p5.Vector.random3D().mult(35);
    particles.push(pos);
  }
}

function doAlphaDecay() {
  let ps = particles.filter(p => p.type === 'proton' && !p.isEjected).slice(0, 2);
  let ns = particles.filter(p => p.type === 'neutron' && !p.isEjected).slice(0, 2);
  
  if (ps.length === 2 && ns.length === 2) {
    let escapeVel = p5.Vector.random3D().mult(20);
    let currentDecayId = decayCounter++; 
    
    let center = createVector(0, 0, 0);
    let alphaParticles = ps.concat(ns);
    for (let p of alphaParticles) center.add(p.pos);
    center.div(4);
    
    let offsets = [
      createVector(12, 12, 12),
      createVector(-12, -12, 12),
      createVector(-12, 12, -12),
      createVector(12, -12, -12)
    ];
    
    for (let i = 0; i < 4; i++) {
      let p = alphaParticles[i];
      p.isEjected = true; 
      p.decayId = currentDecayId; 
      p.pos = p5.Vector.add(center, offsets[i]);
      p.vel = escapeVel.copy();
    }
  }
}

// --- 物理計算 ---

function calculateAtomicForces(p1, p2) {
  let forceDirection = p5.Vector.sub(p2.pos, p1.pos);
  let distance = forceDirection.mag();
  if (distance < 1) distance = 1;
  forceDirection.normalize();

  let isNucleon1 = (p1.type === 'proton' || p1.type === 'neutron');
  let isNucleon2 = (p2.type === 'proton' || p2.type === 'neutron');

  // 核力の計算
  if (isNucleon1 && isNucleon2) {
    let applyNuclearForce = false;
    
    if (!p1.isEjected && !p2.isEjected) {
      applyNuclearForce = true; 
    } else if (p1.isEjected && p2.isEjected && p1.decayId === p2.decayId) {
      applyNuclearForce = true; 
      
      let vDiff = p5.Vector.sub(p2.vel, p1.vel);
      p1.vel.add(p5.Vector.mult(vDiff, 0.5));
      p2.vel.sub(p5.Vector.mult(vDiff, 0.5));
    }

    if (applyNuclearForce) {
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
  }

  // クーロン力（電気的な引力・斥力）
  let calcDist = max(distance, 35); 
  let cStrength = (COULOMB_CONST * p1.charge * p2.charge) / (calcDist * calcDist);
  
  // 電子が原子核に落下するのを防ぐ「量子バリア（パウリの排他原理的な斥力）」
  let isP1Electron = (p1.type === 'electron' || p1.type === 'positron');
  let isP2Electron = (p2.type === 'electron' || p2.type === 'positron');
  
  if ((isP1Electron && isNucleon2) || (isP2Electron && isNucleon1)) {
    if (distance < 90) {
      let repulsion = (90 - distance) * 0.008; 
      cStrength += repulsion; 
    }
  }

  forceDirection.mult(cStrength);
  return forceDirection;
}

class Particle {
  constructor(x, y, z, type) {
    this.pos = createVector(x, y, z);
    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
    this.type = type;
    this.isEjected = false; 
    this.decayId = 0;

    if (type === 'proton') {
      this.charge = 1; this.mass = 10; this.radius = 18;
      this.color = color(255, 50, 50); 
    } else if (type === 'neutron') {
      this.charge = 0; this.mass = 10; this.radius = 18;
      this.color = color(150, 150, 150); 
    } else if (type === 'electron') {
      this.charge = -1; this.mass = 1; this.radius = 6;
      this.color = color(255, 255, 255); 
    } else if (type === 'positron') {
      this.charge = 1; this.mass = 1; this.radius = 6;
      this.color = color(255, 100, 200); 
    }
  }

  applyForce(force) {
    this.acc.add(p5.Vector.div(force, this.mass));
  }

  update() {
    this.vel.add(this.acc);
    if (this.type === 'proton' || this.type === 'neutron') {
      if (!this.isEjected) {
        this.vel.mult(FRICTION); 
      } 
    } else {
      let speed = this.vel.mag();
      let targetSpeed = this.isEjected ? 30 : 8; 
      if (speed > 0.1) {
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
    
    let currentColor = this.color;
    if (nuclearUnstable && !this.isEjected && (this.type === 'proton' || this.type === 'neutron')) {
      if (frameCount % 20 < 10) {
        currentColor = color(255, 255, 0); 
      }
    }
    
    fill(currentColor);
    ambientMaterial(currentColor);
    sphere(this.radius, 12, 12);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
