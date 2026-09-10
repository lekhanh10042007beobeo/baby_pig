const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');
const pigBtn = document.getElementById('pig-button');
const roseText = document.getElementById('rose-text');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

// TÍNH TOÁN KÍCH THƯỚC VÀ ĐỘ NGHIÊNG RESPONSIVE CHO THIÊN HÀ
function getGalaxyScale() {
    const minSize = Math.min(width, height);
    return {
        // Bán kính tối đa linh hoạt theo màn hình
        maxRadius: width < 600 ? minSize * 0.42 : minSize * 0.45,
        // Màn hình dọc (điện thoại) thì độ nghiêng gom gọn hơn
        tiltY: width < 600 ? 0.48 : 0.55
    };
}

function getHeartScale() {
    const minSize = Math.min(width, height);
    return width < 600 ? minSize / 38 : minSize / 45;
}

let heartScale = getHeartScale();
let galaxyScale = getGalaxyScale();

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    heartScale = getHeartScale();
    galaxyScale = getGalaxyScale();

    // Nếu đang ở trạng thái Thiên Hà, cập nhật lại tọa độ đích cho mượt mà không bị giật
    if (state === 'FORMING_GALAXY') {
        galaxyTargets = generateGalaxyTargets(particles.length);
        particles.forEach((p, idx) => {
            p.galaxyData = galaxyTargets[idx];
            p.color = galaxyTargets[idx].color;
        });
    } else {
        initParticles();
    }
});

// 1. DỰNG TỌA ĐỘ TRÁI TIM
function getHeartPosition(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return { x, y };
}

// 2. TẠO THIÊN HÀ & CÁC VÌ SAO VŨ TRỤ (RESPONSIVE)
function generateGalaxyTargets(count) {
    const targets = [];
    const maxRadius = galaxyScale.maxRadius;

    const galaxyColors = [
        '#ffffff', '#ffe6ff', '#e60073', '#9933ff',
        '#3399ff', '#00ffff', '#ff66cc', '#ff3399'
    ];

    for (let i = 0; i < count; i++) {
        const type = Math.random();
        let dist, baseAngle, color, isBgStar = false;

        if (type < 0.70) {
            const arms = 4;
            const armOffset = (Math.floor(Math.random() * arms) * (Math.PI * 2)) / arms;
            dist = Math.pow(Math.random(), 1.4) * maxRadius;
            baseAngle = dist * 0.008 + armOffset + (Math.random() - 0.5) * 0.35;

            if (dist < maxRadius * 0.15) {
                color = '#ffffff';
            } else if (dist < maxRadius * 0.4) {
                color = Math.random() < 0.5 ? '#ff66cc' : '#9933ff';
            } else {
                color = Math.random() < 0.5 ? '#00ffff' : '#3399ff';
            }

        } else if (type < 0.88) {
            dist = Math.random() * (maxRadius * 0.18);
            baseAngle = Math.random() * Math.PI * 2;
            color = Math.random() < 0.6 ? '#ffffff' : '#ff99dd';

        } else {
            isBgStar = true;
            dist = Math.random() * Math.max(width, height) * 0.55;
            baseAngle = Math.random() * Math.PI * 2;
            color = galaxyColors[Math.floor(Math.random() * galaxyColors.length)];
        }

        targets.push({
            dist: dist,
            baseAngle: baseAngle,
            color: color,
            isBgStar: isBgStar,
            orbitSpeed: (0.0015 + (1 - dist / maxRadius) * 0.002) * (Math.random() < 0.5 ? 1 : 1.1)
        });
    }

    return targets;
}

const PARTICLE_COUNT = window.innerWidth < 600 ? 2500 : 4000;
const particles = [];
let state = 'FORMING_HEART';
let galaxyTargets = [];
let galaxyRotation = 0;

class Particle {
    constructor(index) {
        this.index = index;
        this.resetToHeart();
    }

    resetToHeart() {
        const t = Math.random() * Math.PI * 2;
        const pos = getHeartPosition(t);

        this.targetX = width / 2 + pos.x * heartScale + (Math.random() - 0.5) * 10;
        this.targetY = height / 2 + pos.y * heartScale + (Math.random() - 0.5) * 10;

        this.angle = Math.random() * Math.PI * 2;
        this.radius = Math.max(width, height) * (0.5 + Math.random() * 0.6);

        const durationFrames = 140 + Math.random() * 40;
        this.speed = 1 / durationFrames;
        this.totalRotations = (3.5 + Math.random() * 1.5) * Math.PI * 2;

        const baseSize = width < 600 ? 0.8 : 1.1;
        this.size = Math.random() * 1.1 + baseSize;

        const colors = ['#ff2a75', '#ff6097', '#ff7eb3', '#e0115f', '#ffffff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];

        this.alpha = Math.random() * 0.7 + 0.3;
        this.progress = 0;
        this.x = width / 2;
        this.y = height / 2;
    }

    explodeOut() {
        this.startX = this.x;
        this.startY = this.y;

        const burstAngle = Math.atan2(this.y - height / 2, this.x - width / 2) + (Math.random() - 0.5);
        const burstDist = Math.max(width, height) * (0.6 + Math.random() * 0.8);

        this.burstTargetX = width / 2 + Math.cos(burstAngle) * burstDist;
        this.burstTargetY = height / 2 + Math.sin(burstAngle) * burstDist;

        this.progress = 0;
        this.speed = 1 / (40 + Math.random() * 20);
    }

    setupGalaxyTarget() {
        this.startX = this.x;
        this.startY = this.y;

        const target = galaxyTargets[this.index];
        this.galaxyData = target;
        this.color = target.color;

        const currentAngle = target.baseAngle + galaxyRotation;
        this.targetX = width / 2 + Math.cos(currentAngle) * target.dist;
        this.targetY = height / 2 + Math.sin(currentAngle) * target.dist * galaxyScale.tiltY;

        this.angle = Math.atan2(this.startY - height / 2, this.startX - width / 2);
        this.radius = Math.hypot(this.startX - width / 2, this.startY - height / 2);

        const durationFrames = 130 + Math.random() * 40;
        this.speed = 1 / durationFrames;
        this.totalRotations = (2.5 + Math.random() * 1.5) * Math.PI * 2;
        this.progress = 0;
    }

    update() {
        if (state === 'FORMING_HEART') {
            if (this.progress < 1) {
                this.progress += this.speed;
                if (this.progress > 1) this.progress = 1;

                const ease = 1 - Math.pow(1 - this.progress, 3);

                const currentRadius = this.radius * (1 - ease);
                const currentAngle = this.angle + ease * this.totalRotations;

                const vortexX = width / 2 + Math.cos(currentAngle) * currentRadius;
                const vortexY = height / 2 + Math.sin(currentAngle) * currentRadius;

                this.x = vortexX * (1 - ease) + this.targetX * ease;
                this.y = vortexY * (1 - ease) + this.targetY * ease;
            } else {
                this.x += (Math.random() - 0.5) * 0.2;
                this.y += (Math.random() - 0.5) * 0.2;
            }
        }
        else if (state === 'EXPLODING') {
            if (this.progress < 1) {
                this.progress += this.speed;
                if (this.progress > 1) this.progress = 1;

                const ease = this.progress * (2 - this.progress);
                this.x = this.startX + (this.burstTargetX - this.startX) * ease;
                this.y = this.startY + (this.burstTargetY - this.startY) * ease;
            }
        }
        else if (state === 'FORMING_GALAXY') {
            if (this.progress < 1) {
                this.progress += this.speed;
                if (this.progress > 1) this.progress = 1;

                const ease = 1 - Math.pow(1 - this.progress, 3);

                const currentRadius = this.radius * (1 - ease);
                const currentAngle = this.angle + ease * this.totalRotations;

                const vortexX = width / 2 + Math.cos(currentAngle) * currentRadius;
                const vortexY = height / 2 + Math.sin(currentAngle) * currentRadius;

                const angleNow = this.galaxyData.baseAngle + galaxyRotation;
                const curTargetX = width / 2 + Math.cos(angleNow) * this.galaxyData.dist;
                const curTargetY = height / 2 + Math.sin(angleNow) * this.galaxyData.dist * galaxyScale.tiltY;

                this.x = vortexX * (1 - ease) + curTargetX * ease;
                this.y = vortexY * (1 - ease) + curTargetY * ease;
            } else {
                // TỰ ĐỘNG RESPONSIVE TỌA ĐỘ KHI THIÊN HÀ DANG XOAY
                const angleNow = this.galaxyData.baseAngle + galaxyRotation;
                this.x = width / 2 + Math.cos(angleNow) * this.galaxyData.dist;
                this.y = height / 2 + Math.sin(angleNow) * this.galaxyData.dist * galaxyScale.tiltY;

                this.alpha += Math.sin(Date.now() * 0.004 + this.index) * 0.02;
                if (this.alpha < 0.2) this.alpha = 0.2;
                if (this.alpha > 1) this.alpha = 1;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;

        if (state === 'FORMING_GALAXY') {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = width < 600 ? 2 : 4;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function initParticles() {
    particles.length = 0;
    state = 'FORMING_HEART';
    galaxyRotation = 0;

    const container = document.getElementById('canvas-container');
    container.classList.remove('beating');
    pigBtn.classList.add('hidden');

    if (roseText) {
        roseText.innerHTML = "bé heo con cóa thít hăm 💓💓💓";
        roseText.classList.add('hidden');
    }

    galaxyTargets = generateGalaxyTargets(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle(i));
    }
}

function animate() {
    ctx.fillStyle = 'rgba(3, 1, 10, 0.22)';
    ctx.fillRect(0, 0, width, height);

    if (state === 'FORMING_GALAXY') {
        galaxyRotation += 0.0018;
    }

    let allFinished = true;

    particles.forEach(p => {
        p.update();
        p.draw();
        if (p.progress < 1) allFinished = false;
    });

    if (state === 'FORMING_HEART' && allFinished) {
        state = 'HEART_READY';
        document.getElementById('canvas-container').classList.add('beating');
        pigBtn.classList.remove('hidden');
    }

    if (state === 'EXPLODING' && allFinished) {
        state = 'FORMING_GALAXY';
        galaxyTargets = generateGalaxyTargets(particles.length);
        particles.forEach(p => p.setupGalaxyTarget());
        if (roseText) roseText.classList.remove('hidden');
    }

    requestAnimationFrame(animate);
}

pigBtn.addEventListener('click', () => {
    if (state !== 'HEART_READY') return;

    pigBtn.classList.add('hidden');
    document.getElementById('canvas-container').classList.remove('beating');

    state = 'EXPLODING';
    particles.forEach(p => p.explodeOut());
});

initParticles();
animate();
