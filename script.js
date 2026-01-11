const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let mousePos = { x: 0, y: 0 }, isMouseDown = false, gameActive = false;

// MUSIC SYSTEM
let audioCtx;
function playCoolGuySong() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const tempo = 125;
    const noteTime = 60 / tempo;
    
    function playNote(freq, time, duration, type = 'square', vol = 0.05) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + duration);
    }

    setInterval(() => {
        if (!gameActive) return;
        const now = audioCtx.currentTime;
        // Synthwave Bassline
        [110, 110, 123, 130].forEach((f, i) => playNote(f, now + i * noteTime, noteTime * 0.5, 'square', 0.04));
        // High melody every other measure
        if (Math.random() > 0.7) playNote(440, now, noteTime * 2, 'sawtooth', 0.02);
    }, noteTime * 4000);
}

const guns = {
    none: { name: 'Fists', fireDelay: 0, owned: true, ammo: Infinity, maxAmmo: Infinity },
    pistol: { name: 'Pistol', fireDelay: 300, spread: 0, count: 1, dmg: 2.5, color: "#333", owned: false, ammo: Infinity, maxAmmo: Infinity },
    shotgun: { name: 'Shotgun', fireDelay: 800, spread: 0.4, count: 6, dmg: 1.5, color: "#555", owned: false, ammo: 8, maxAmmo: 8 },
    smg: { name: 'SMG', fireDelay: 100, spread: 0.15, count: 1, dmg: 1.0, color: "#222", owned: false, ammo: 30, maxAmmo: 30 },
    mg: { name: 'Machine Gun', fireDelay: 65, spread: 0.2, count: 1, dmg: 0.8, color: "#111", owned: false, ammo: 100, maxAmmo: 100 },
    sniper: { name: 'Sniper', fireDelay: 1200, spread: 0, count: 1, dmg: 12, color: "#000", owned: false, ammo: 5, maxAmmo: 5 }
};

let player = { x: 400, y: 300, gold: 0, hp: 100, gun: 'none', spd: 3.5, fireRateMod: 1 };
let enemies = [], bullets = [], keys = {}, punchAnim = 0, lastShot = 0;

window.addEventListener('mousemove', e => { mousePos.x = e.clientX - 200; mousePos.y = e.clientY; });
window.addEventListener('mousedown', () => isMouseDown = true);
window.addEventListener('mouseup', () => isMouseDown = false);
window.onkeydown = e => keys[e.key.toLowerCase()] = true;
window.onkeyup = e => keys[e.key.toLowerCase()] = false;

function startGame(mode) {
    gameActive = true;
    document.getElementById('start-screen').style.display = 'none';
    playCoolGuySong();
    resize(); updateUI(); loop();
}

function resize() { canvas.width = window.innerWidth - 200; canvas.height = window.innerHeight; }

function shoot() {
    if (!gameActive || player.gun === 'none' || punchAnim > 0) return;
    let now = Date.now(), g = guns[player.gun];
    if (now - lastShot > (g.fireDelay * player.fireRateMod) && g.ammo > 0) {
        let angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
        for (let i = 0; i < g.count; i++) {
            let s = angle + (Math.random() - 0.5) * g.spread;
            bullets.push({ x: player.x, y: player.y - 10, vx: Math.cos(s) * 16, vy: Math.sin(s) * 16, dmg: g.dmg });
        }
        if (g.maxAmmo !== Infinity) g.ammo--;
        lastShot = now;
        updateUI();
    }
}

function drawVoxel(x, y, w, h, color, hasShadow = false) {
    if (hasShadow) {
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.beginPath(); ctx.ellipse(x, y + h/2 + 5, w/2, w/4, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.fillRect(x - w/2, y - h/2, w, h);
}

function drawPlayer(x, y) {
    let angle = Math.atan2(mousePos.y - y, mousePos.x - x);
    // Voxel Character Assembly
    drawVoxel(x - 6, y + 16, 8, 12, "#2e86c1"); // L-Leg
    drawVoxel(x + 6, y + 16, 8, 12, "#2e86c1"); // R-Leg
    drawVoxel(x, y, 20, 26, "#3498db", true);   // Body
    drawVoxel(x, y - 22, 18, 18, "#ffe0bd");    // Head
    ctx.fillStyle = "#5d4037"; ctx.fillRect(x-9, y-31, 18, 6); // Hair
    ctx.fillStyle = "#333"; ctx.fillRect(x-5, y-23, 3, 3); ctx.fillRect(x+2, y-23, 3, 3); // Eyes

    if (punchAnim > 0) {
        ctx.save(); ctx.translate(x, y - 5); ctx.rotate(angle);
        let lunge = (6 - Math.abs(6 - punchAnim)) * 14;
        drawVoxel(15 + lunge, 0, 12, 12, "#ffe0bd"); // Punching Hand
        ctx.restore();
    } else if (player.gun !== 'none') {
        ctx.save(); ctx.translate(x, y - 5); ctx.rotate(angle);
        ctx.fillStyle = guns[player.gun].color;
        // Simple Gun Shapes
        if(player.gun === 'pistol') { ctx.fillRect(12, -2, 10, 4); ctx.fillRect(12, 0, 3, 7); }
        else if(player.gun === 'mg') { ctx.fillRect(10, -5, 28, 9); ctx.fillStyle="red"; ctx.fillRect(15, 2, 8, 2); }
        else { ctx.fillRect(12, -3, 22, 6); }
        ctx.restore();
    }
}

function update() {
    if (keys.w && player.y > 50) player.y -= player.spd;
    if (keys.s && player.y < canvas.height - 50) player.y += player.spd;
    if (keys.a && player.x > 50) player.x -= player.spd;
    if (keys.d && player.x < canvas.width - 50) player.x += player.spd;

    if (keys.f && punchAnim <= 0) punchAnim = 12;
    if (punchAnim > 0) punchAnim--;
    if (isMouseDown) shoot();

    enemies.forEach((e, i) => {
        let dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy);
        e.x += (dx / dist) * 1.6; e.y += (dy / dist) * 1.6;
        if (dist < 32) { player.hp -= 0.4; updateUI(); }

        // MEGA PUNCH COLLISION
        if (punchAnim > 2 && dist < 75) {
            let angleToEnemy = Math.atan2(e.y - player.y, e.x - player.x);
            let aimAngle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
            if (Math.abs(angleToEnemy - aimAngle) < 1.2) {
                e.hp -= 2.5; // 2-shot normal enemies
                e.x -= Math.cos(angleToEnemy) * 85; // Massive Knockback
                e.y -= Math.sin(angleToEnemy) * 85;
            }
        }
        if (e.hp <= 0) { player.gold += 20; enemies.splice(i, 1); updateUI(); }
    });

    bullets.forEach((b, i) => {
        b.x += b.vx; b.y += b.vy;
        enemies.forEach(e => { if (Math.hypot(b.x - e.x, b.y - e.y) < 25) { e.hp -= b.dmg; bullets.splice(i, 1); } });
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
    });
    if (player.hp <= 0) location.reload();
}

function loop() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    enemies.forEach(e => drawVoxel(e.x, e.y, e.isBoss ? 45 : 28, e.isBoss ? 45 : 28, e.isBoss ? "#c0392b" : "#27ae60", true));
    drawPlayer(player.x, player.y);
    ctx.fillStyle = "#f1c40f"; bullets.forEach(b => ctx.fillRect(b.x-2, b.y-2, 5, 5));
    update(); requestAnimationFrame(loop);
}

function buyAmmo(amount, cost) {
    if (player.gun === 'none' || player.gun === 'pistol') return;
    if (player.gold >= cost) {
        player.gold -= cost;
        guns[player.gun].ammo += amount;
        updateUI();
    }
}

function buy(item, cost) {
    if (guns[item]) {
        if (guns[item].owned) { player.gun = item; } 
        else if (player.gold >= cost) { 
            player.gold -= cost; guns[item].owned = true; player.gun = item; 
            if (guns[item].maxAmmo !== Infinity) guns[item].ammo = guns[item].maxAmmo;
            document.getElementById('btn-' + item).innerText = guns[item].name + " (OWNED)"; 
        }
    } else {
        if (player.gold >= cost) {
            player.gold -= cost;
            if (item === 'spd') player.spd += 0.6;
            if (item === 'fr') player.fireRateMod *= 0.8;
            if (item === 'heal') player.hp = Math.min(100, player.hp + 50);
        }
    }
    updateUI();
}

function updateUI() {
    document.getElementById('gold-side').innerText = player.gold;
    document.getElementById('gold-total').innerText = player.gold;
    document.getElementById('hp').innerText = Math.ceil(player.hp);
    document.getElementById('hp-fill').style.width = player.hp + "%";
    let g = guns[player.gun];
    document.getElementById('ammo-display').innerText = "Ammo: " + (g.ammo === Infinity ? "∞" : g.ammo);
}

setInterval(() => {
    if (gameActive && enemies.length < 12) {
        let b = Math.random() < 0.15;
        enemies.push({ x: Math.random() * canvas.width, y: -50, hp: b ? 10 : 5, isBoss: b });
    }
}, 1800);