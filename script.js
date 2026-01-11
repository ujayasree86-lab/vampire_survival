const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth - 220;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let player = { x: canvas.width/2, y: canvas.height/2, spd: 4, hp: 100, gold: 0, wave: 1, xp: 0, nextLvl: 100 };
let enemies = [], bullets = [], keys = {};
let hasGun = false, punchAnim = 0;

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// The Voxel Engine
function drawVoxel(x, y, size, color) {
    // Drop Shadow
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath(); ctx.ellipse(x, y + size/2, size, size/2, 0, 0, Math.PI*2); ctx.fill();

    // Side face
    ctx.fillStyle = shadeColor(color, -15);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + size, y - size/2); ctx.lineTo(x + size, y + size/2); ctx.lineTo(x, y + size); ctx.fill();

    // Front face
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - size, y - size/2); ctx.lineTo(x - size, y + size/2); ctx.lineTo(x, y + size); ctx.fill();

    // Top face
    ctx.fillStyle = shadeColor(color, 15);
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + size, y - size/2); ctx.lineTo(x, y - size); ctx.lineTo(x - size, y - size/2); ctx.fill();
    
    // Voxel Eyes
    ctx.fillStyle = "#333";
    ctx.fillRect(x - size/2, y - size/4, 4, 4); 
    ctx.fillRect(x - size/6, y - size/4, 4, 4);
}

function shadeColor(color, percent) {
    let num = parseInt(color.replace("#",""),16), amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
}

function buy(type, cost) {
    if (player.gold >= cost) {
        player.gold -= cost;
        if (type === 'gun') hasGun = true;
        if (type === 'spd') player.spd += 0.5;
        if (type === 'heal') player.hp = Math.min(100, player.hp + 50);
        updateUI();
    }
}

function updateUI() {
    document.getElementById('gold-side').innerText = player.gold;
    document.getElementById('gold-total').innerText = player.gold;
    document.getElementById('hp').innerText = Math.floor(player.hp);
    document.getElementById('wave-count').innerText = player.wave;
    document.getElementById('hp-fill').style.width = player.hp + "%";
    document.getElementById('xp-fill').style.width = (player.xp / player.nextLvl * 100) + "%";
}

function update() {
    if (keys['w'] && player.y > 60) player.y -= player.spd;
    if (keys['s'] && player.y < canvas.height - 60) player.y += player.spd;
    if (keys['a'] && player.x > 60) player.x -= player.spd;
    if (keys['d'] && player.x < canvas.width - 60) player.x += player.spd;

    if (keys['f']) punchAnim = 12;
    if (punchAnim > 0) punchAnim--;

    if (keys['y'] && hasGun && bullets.length < 10) {
        bullets.push({x: player.x + 20, y: player.y - 10, vx: 12});
    }

    enemies.forEach((e, i) => {
        let dx = player.x - e.x, dy = player.y - e.y;
        let dist = Math.hypot(dx, dy);
        e.x += (dx/dist) * 1.5; e.y += (dy/dist) * 1.5;

        if (dist < 40) { player.hp -= 0.2; updateUI(); if(player.hp <= 0) location.reload(); }
        if (punchAnim > 5 && dist < 70) { 
            e.hp -= 0.5; 
            if(e.hp <= 0) { enemies.splice(i,1); player.gold += 25; player.xp += 20; updateUI(); } 
        }
        
        bullets.forEach((b, bi) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < 30) {
                e.hp -= 2; bullets.splice(bi, 1);
                if (e.hp <= 0) { enemies.splice(i, 1); player.gold += 30; player.xp += 25; updateUI(); }
            }
        });
    });

    bullets.forEach((b, i) => { b.x += b.vx; if(b.x > canvas.width) bullets.splice(i,1); });

    if (player.xp >= player.nextLvl) { player.xp = 0; player.wave++; player.nextLvl *= 1.3; updateUI(); }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Floor Grid (for that voxel look)
    ctx.strokeStyle = "rgba(0,0,0,0.03)";
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    enemies.forEach(e => drawVoxel(e.x, e.y, 25, "#7fb3d5"));
    drawVoxel(player.x, player.y, 30, "#2e86c1");

    if (hasGun) {
        ctx.fillStyle = "#333";
        ctx.fillRect(player.x + 20, player.y - 15, 20, 8); // Voxel Pistol
    }

    if (punchAnim > 0) {
        ctx.fillStyle = "#f5c6a5";
        ctx.fillRect(player.x + 25, player.y - 5, 20, 12); // Punch arm
    }

    ctx.fillStyle = "#333";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 8, 4));

    update();
    requestAnimationFrame(draw);
}

setInterval(() => {
    if (enemies.length < 3 + player.wave) {
        enemies.push({x: Math.random()*canvas.width, y: -50, hp: 2 + player.wave});
    }
}, 2500);

updateUI();
draw();