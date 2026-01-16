let video;
let faceMesh;
let pearls = [];
let options = { maxFaces: 1, refineLandmarks: true, flipHorizontal: true };

let leftEyeClosed = false;
let rightEyeClosed = false;
let currentEmotion = "serious";
let topMargin = 70;

function preload() {
  faceMesh = ml5.faceMesh(options);
}

function setup() {
  createCanvas(640, 480 + topMargin);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  faceMesh.detectStart(video, gotFaces);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
}

function draw() {
  background(20);

  drawHeader();

  push();
  translate(width, 0);
  scale(-1, 1);
  tint(200);
  image(video, 0, topMargin, width, 480);
  pop();

  for (let pearl of pearls) {
    pearl.applyGravity();
    pearl.update();
    pearl.checkBottom();
  }

  for (let i = 0; i < pearls.length; i++) {
    for (let j = i + 1; j < pearls.length; j++) {
      let p1 = pearls[i];
      let p2 = pearls[j];

      if (p1.intersects(p2)) {
        // 【修改开始】：逻辑升级

        // 定义什么情况是“特殊时刻”：
        // 1. 两个球都在动 (普通的空中撞击)
        // 2. OR (||) 其中有一个是 'happy' 小球 (因为快乐小球是消除剂，它碰到静止的也要生效)
        let isMagicTime = (!p1.isStopped && !p2.isStopped) ||
          (p1.type === 'happy' || p2.type === 'happy');

        if (isMagicTime) {
          // 触发情绪炼金术（特殊互动）
          handleEmotionalAlchemy(i, j);
        } else {
          // 否则（比如两个静止的严肃球堆在一起），只做普通的物理推挤，防止穿模
          p1.resolveCollision(p2);
        }
      }
    }
  }

  for (let pearl of pearls) {
    pearl.display();
  }

  for (let i = pearls.length - 1; i >= 0; i--) {
    if (pearls[i].isDead || pearls[i].x < -5000) {
      pearls.splice(i, 1);
    }
  }
}

function drawHeader() {
  fill(255);
  noStroke();
  textSize(24);
  text("HELLO", width / 2, topMargin / 3);

  textSize(16);
  let statusColor = color(200);
  let statusText = "😐 专注";

  if (currentEmotion === "happy") {
    statusText = "😄 开心";
    statusColor = color(255, 215, 0); // 金色
  } else if (currentEmotion === "surprised") {
    statusText = "😲 惊讶";
    statusColor = color(0, 255, 255); // 青色
  }

  fill(statusColor);
  text("当前检测: " + statusText, width / 2, topMargin / 3 * 2);
}

// --- 核心：情绪互动逻辑 ---
function handleEmotionalAlchemy(index1, index2) {
  let p1 = pearls[index1];
  let p2 = pearls[index2];
  
  // 逻辑 A: 快乐 + 快乐 = 爱心 (保持不变)
  if (p1.type === 'happy' && p2.type === 'happy') {
    if (p1.shape !== 'heart') {
      p1.shape = 'heart';
      p1.r *= 1.5; 
      p1.color = color(255, 105, 180); 
      p2.isDead = true; 
      createParticles(p1.x, p1.y, color(255, 105, 180)); 
    }
  }
  
  // 【修改处】逻辑 B: 快乐 + 严肃 = 互相抵消 (Happy & Serious both disappear)
  else if ((p1.type === 'happy' && p2.type === 'serious') || 
           (p1.type === 'serious' && p2.type === 'happy')) {
    
    // 1. 让两个球都“死亡”
    p1.isDead = true;
    p2.isDead = true;

    // 2. 播放特效
    // 在两个位置都生成一点烟尘/光点
    createParticles(p1.x, p1.y, color(150)); // 灰尘色
    createParticles(p2.x, p2.y, color(255, 215, 0)); // 金粉色
  }
  
  // 逻辑 C: 默认物理碰撞反弹 (保持不变)
  else {
    p1.resolveCollision(p2);
  }
}

// 粒子特效
function createParticles(x, y, col) {
  console.log("Magic happened!");
}

function mousePressed() {
  for (let i = pearls.length - 1; i >= 0; i--) {
    if (pearls[i].contains(mouseX, mouseY)) {
      pearls.splice(i, 1);
    }
  }
}

//FaceMesh
function gotFaces(results) {
  if (results.length > 0) {
    let face = results[0];

    // 1. 获取关键点
    let leftTop = face.keypoints[159];
    let leftBottom = face.keypoints[145];
    let rightTop = face.keypoints[386];
    let rightBottom = face.keypoints[374];

    // 嘴巴关键点
    let mouthTop = face.keypoints[13];
    let mouthBottom = face.keypoints[14];
    let mouthLeft = face.keypoints[61];
    let mouthRight = face.keypoints[291];

    // 2. 眨眼检测
    let leftDist = dist(leftTop.x, leftTop.y, leftBottom.x, leftBottom.y);
    let rightDist = dist(rightTop.x, rightTop.y, rightBottom.x, rightBottom.y);
    const blinkThreshold = 5;

    // 3. 情绪检测
    let mouthHeight = dist(mouthTop.x, mouthTop.y, mouthBottom.x, mouthBottom.y);
    let mouthWidth = dist(mouthLeft.x, mouthLeft.y, mouthRight.x, mouthRight.y);

    if (mouthHeight > 25) {
      currentEmotion = "surprised";
    }

    else if (mouthWidth > 65) {
      currentEmotion = "happy";
    }

    else {
      currentEmotion = "serious";
    }


    if (leftDist < blinkThreshold && !leftEyeClosed) {
      leftEyeClosed = true;

      pearls.push(new Pearl(leftTop.x, leftTop.y + topMargin, currentEmotion));
    } else if (leftDist > blinkThreshold) {
      leftEyeClosed = false;
    }

    if (rightDist < blinkThreshold && !rightEyeClosed) {
      rightEyeClosed = true;
      pearls.push(new Pearl(rightTop.x, rightTop.y + topMargin, currentEmotion));
    } else if (rightDist > blinkThreshold) {
      rightEyeClosed = false;
    }
  }
}

// 珍珠
class Pearl {
  constructor(x, y, emotion) {
    this.x = x;
    this.y = y;
    this.type = emotion;
    this.shape = 'circle';
    this.isDead = false;
    this.isStopped = false;

    // 根据情绪设定不同的物理属性
    if (emotion === 'happy') {
      this.r = 12;
      this.color = color(255, 215, 0);
      this.vx = random(-2, 2);
      this.vy = 1;
      this.gravity = 0.1;
      this.friction = 0.9;
    }
    else if (emotion === 'surprised') {
      this.r = 25;
      this.color = color(0, 255, 255, 150);
      this.vx = random(-0.5, 0.5);
      this.vy = 2;
      this.gravity = 0.15;
      this.friction = 0.8;
    }
    else { // serious
      this.r = 15;
      this.color = color(100, 100, 110);
      this.vx = random(-0.5, 0.5);
      this.vy = 4;
      this.gravity = 0.4;
      this.friction = 0.4;
    }
  }

  applyGravity() {
    if (!this.isStopped) this.vy += this.gravity;
  }

  update() {
    if (!this.isStopped) {
      this.x += this.vx;
      this.y += this.vy;
    }
    if (this.type === 'happy') this.vx *= 0.99;
    else this.vx *= 0.95;
  }

  display() {
    noStroke();
    fill(this.color);

    if (this.shape === 'heart') {
      this.drawHeart(this.x, this.y, this.r * 2);
    } else {
      circle(this.x, this.y, this.r * 2);
      fill(255, 255, 255, 100);
      circle(this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.5);
    }
  }

  drawHeart(x, y, size) {
    push();
    translate(x, y - size / 4);
    beginShape();
    for (let a = 0; a < TWO_PI; a += 0.1) {
      let r = size / 2;
      let hx = 16 * pow(sin(a), 3);
      let hy = -(13 * cos(a) - 5 * cos(2 * a) - 2 * cos(3 * a) - cos(4 * a));
      vertex(hx * (r / 16), hy * (r / 16));
    }
    endShape(CLOSE);
    pop();
  }

  checkBottom() {
    if (this.y + this.r > height) {
      this.y = height - this.r;
      this.vy *= -this.friction;
      if (abs(this.vy) < 1) {
        this.vy = 0;
        this.isStopped = true;
      }
    }
  }

  intersects(other) {
    let d = dist(this.x, this.y, other.x, other.y);
    return d < (this.r + other.r);
  }

  contains(px, py) {
    return dist(px, py, this.x, this.y) < this.r;
  }

  resolveCollision(other) {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    let distance = sqrt(dx * dx + dy * dy);
    let minDistance = this.r + other.r;

    if (distance < minDistance && distance > 0) {
      let overlap = minDistance - distance;
      let angle = atan2(dy, dx);
      let targetX = this.x + cos(angle) * overlap * 0.5;
      let targetY = this.y + sin(angle) * overlap * 0.5;
      this.x = targetX;
      this.y = targetY;

      this.vy *= 0.8;
      other.vy *= 0.8;

      if (other.isStopped && abs(this.vy) < 1) {
        this.isStopped = true;
      }
    }
  }
}