const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let player = { x: 0, y: 0, radius: 18, lives: 3, invincible: 0, activeSkin: 'classic', speedBonus: 1.0 };
let bullets = [], enemies = [], buffs = [], explosions = [], animations = [], blackholeAnimations = [];
let boss = null;
let score = 0;
let gameRunning = true, gamePaused = false, gameOverFlag = false;
let activeBuffs = { tripleShot: 0, shield: 0, doublePoints: 0, slowEnemies: 0, fastShoot: 0 };
let bulletCooldown = 0, enemySpawnCounter = 20, enemySpawnDelay = 25, frame = 0;
let bossHpMultiplier = 1;
let playerCoins = 0;
let rotatingAngle = 0;
let upgrades = { tripleLevel: 1, shieldLevel: 1, doubleLevel: 1 };
let animationId = null;
let keys = {};

let laserShape = 'circle';
let laserColor = '#ffff40';
let ownedShapes = ['circle'];
let ownedColors = ['#ffff40'];

let superMeter = 0;
let superMax = 12;
let activeSuper = 'sonic';
let purchasedSupers = ['sonic'];
let superCooldown = 0;

// Музыка и пауза для босса
let isBossAnnouncementActive = false;
let gameBeforeBossPaused = false;
let bossAnnouncementTimer = null;
let musicEnabled = true;
let musicActivated = false;
let currentMusic = null;

const supersList = [
    { id: 'sonic', name: '🎵 Звуковой удар', desc: '20 урона всем врагам вокруг', price: 0, owned: true, soundId: 'superSonic' },
    { id: 'fastShoot', name: '⚡ Сверхскорострельность', desc: 'Стрельба каждые 0.06 сек, 4 сек', price: 3000, owned: false, soundId: 'superFastshoot' },
    { id: 'invisible', name: '👻 Невидимость', desc: 'Неуязвимость 4 сек', price: 2500, owned: false, soundId: 'superInvisible' },
    { id: 'heal', name: '❤️ Регенерация', desc: '+2 жизни', price: 3500, owned: false, soundId: 'superHeal' },
    { id: 'vortex', name: '🌪️ Вихрь', desc: 'Отбрасывает врагов +15 урона', price: 4000, owned: false, soundId: 'superVortex' },
    { id: 'firestarter', name: '🔥 Поджигатель', desc: '30 урона огнём за 3 сек', price: 5000, owned: false, soundId: 'superFire' },
    { id: 'blackhole', name: '🕳️ Чёрная дыра', desc: 'Притягивает + 50 урона', price: 6000, owned: false, soundId: 'superBlackhole' }
];

let ownedSkins = ['classic', 'red', 'gold', 'neon', 'purple'];
let shopSkins = [
    { id: 'cyber', name: '🤖 КИБЕР', price: 500, bought: false },
    { id: 'angel', name: '👼 АНГЕЛ', price: 1000, bought: false },
    { id: 'demon', name: '👹 ДЕМОН', price: 2000, bought: false },
    { id: 'phoenix', name: '🔥 ФЕНИКС', price: 3500, bought: false },
    { id: 'ice', name: '❄️ ЛЕДЯНОЙ', price: 5000, bought: false },
    { id: 'void', name: '🌑 ВОИД', price: 7500, bought: false }
];

let stars = [];
function createStars() {
    stars = [];
    for (let i = 0; i < 400; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 2.5 + 0.5,
            alpha: Math.random() * 0.6 + 0.2,
            twinkleSpeed: Math.random() * 0.05 + 0.01
        });
    }
}
function drawStarsBackground() {
    for (let s of stars) {
        ctx.fillStyle = `rgba(255, 240, 200, ${s.alpha + Math.sin(Date.now() * s.twinkleSpeed) * 0.2})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    }
}
window.addEventListener('resize', () => { createStars(); });
createStars();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getUpgradePrice(type) {
    return Math.floor(200 * Math.pow(1.5, upgrades[type + 'Level'] - 1));
}

function saveProgress() {
    const saveData = {
        coins: playerCoins,
        skins: ownedSkins,
        upgrades: upgrades,
        ownedShapes: ownedShapes,
        ownedColors: ownedColors,
        laserShape: laserShape,
        laserColor: laserColor,
        activeSkin: player.activeSkin,
        purchasedSupers: purchasedSupers,
        activeSuper: activeSuper
    };
    localStorage.setItem('spaceShooterSave', JSON.stringify(saveData));
    updateCoinDisplay();
}

function loadProgress() {
    let s = localStorage.getItem('spaceShooterSave');
    if (s) {
        try {
            let d = JSON.parse(s);
            playerCoins = d.coins || 0;
            ownedSkins = d.skins || ['classic','red','gold','neon','purple'];
            upgrades = d.upgrades || { tripleLevel:1, shieldLevel:1, doubleLevel:1 };
            ownedShapes = d.ownedShapes || ['circle'];
            ownedColors = d.ownedColors || ['#ffff40'];
            laserShape = d.laserShape || 'circle';
            laserColor = d.laserColor || '#ffff40';
            player.activeSkin = d.activeSkin || 'classic';
            purchasedSupers = d.purchasedSupers || ['sonic'];
            activeSuper = d.activeSuper || 'sonic';
            supersList.forEach(s => { s.owned = purchasedSupers.includes(s.id); });
            updateCoinDisplay();
            updateUpgradeUI();
            updateSkinsUI();
            updateSuperUI();
            updateLaserUI();
        } catch(e) {}
    }
}

function addCoins(a) { playerCoins += a; saveProgress(); updateCoinDisplay(); }
function updateCoinDisplay() {
    let val = Math.floor(playerCoins);
    ['menu-coins', 'shop-coins', 'coinsValue'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.innerText = val;
    });
}

function updateUpgradeUI() {
    let el = (id) => document.getElementById(id);
    if (el('triple-level')) el('triple-level').innerText = upgrades.tripleLevel;
    if (el('shield-level')) el('shield-level').innerText = upgrades.shieldLevel;
    if (el('double-level')) el('double-level').innerText = upgrades.doubleLevel;
    if (el('triple-price')) el('triple-price').innerText = getUpgradePrice('triple');
    if (el('shield-price')) el('shield-price').innerText = getUpgradePrice('shield');
    if (el('double-price')) el('double-price').innerText = getUpgradePrice('double');
}

function upgradeBuff(type) {
    let price = getUpgradePrice(type);
    if (playerCoins >= price) {
        playerCoins -= price;
        upgrades[type + 'Level']++;
        saveProgress();
        updateUpgradeUI();
        updateCoinDisplay();
        alert(`✅ Прокачка улучшена до уровня ${upgrades[type + 'Level']}!`);
    } else {
        alert('❌ Не хватает монет!');
    }
}

function bindUpgradeButtons() {
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        if (btn.hasAttribute('data-bound')) return;
        btn.setAttribute('data-bound', 'true');
        btn.onclick = (e) => {
            e.stopPropagation();
            const type = btn.dataset.upgrade;
            if (type) upgradeBuff(type);
        };
    });
}

function playShoot() {
    let audio = document.getElementById('shootSound');
    if (audio) audio.cloneNode().play().catch(()=>{});
}
function playExplode() {
    try { new Audio().play(); } catch(e) {}
}
function playBuff() {
    try { new Audio().play(); } catch(e) {}
}

function getSkinColor() {
    switch (player.activeSkin) {
        case 'red': return '#ff3366'; case 'gold': return '#ffaa33';
        case 'neon': return '#33ffaa'; case 'purple': return '#aa66ff';
        case 'cyber': return '#00ccff'; case 'angel': return '#ffeecc';
        case 'demon': return '#ff4400'; case 'phoenix': return '#ff6600';
        case 'ice': return '#66ccff'; case 'void': return '#4400aa';
        default: return '#3eff9e';
    }
}

function getSkinDisplayName(skinId) {
    const names = {
        classic: '🔵 CLASSIC', red: '🔴 DRAGON', gold: '🟡 GOLD', neon: '🟢 NEON',
        purple: '🟣 PHANTOM', cyber: '🤖 CYBER', angel: '👼 ANGEL', demon: '👹 DEMON',
        phoenix: '🔥 PHOENIX', ice: '❄️ ICE', void: '🌑 VOID'
    };
    return names[skinId] || skinId;
}

function updateSkinsUI() {
    let skinsContainer = document.getElementById('skins-grid');
    if (skinsContainer) {
        skinsContainer.innerHTML = '';
        ownedSkins.forEach(skin => {
            let btn = document.createElement('button');
            btn.classList.add('skin-btn');
            btn.innerText = getSkinDisplayName(skin);
            btn.onclick = () => {
                player.activeSkin = skin;
                alert(`✅ Скин ${getSkinDisplayName(skin)} выбран!`);
                saveProgress();
            };
            skinsContainer.appendChild(btn);
        });
    }
    let shopList = document.getElementById('skins-shop-list');
    if (shopList) {
        shopList.innerHTML = '';
        let notBought = shopSkins.filter(skin => !ownedSkins.includes(skin.id));
        notBought.forEach(skin => {
            let div = document.createElement('div');
            div.classList.add('shop-item');
            div.innerHTML = `<div class="item-skin">${skin.name}</div><div class="item-price">💰 ${skin.price}</div><button class="buy-skin-btn" data-skin="${skin.id}">КУПИТЬ</button>`;
            shopList.appendChild(div);
        });
        if (notBought.length === 0) {
            shopList.innerHTML = '<div class="shop-item">✨ Все скины куплены! ✨</div>';
        }
    }
    document.querySelectorAll('.buy-skin-btn').forEach(btn => {
        if (btn.hasAttribute('data-bound')) return;
        btn.setAttribute('data-bound', 'true');
        btn.onclick = (e) => {
            e.stopPropagation();
            const skinId = btn.dataset.skin;
            const skin = shopSkins.find(s => s.id === skinId);
            if (skin && playerCoins >= skin.price) {
                playerCoins -= skin.price;
                ownedSkins.push(skinId);
                saveProgress();
                updateSkinsUI();
                alert(`✅ Скин ${skin.name} куплен!`);
            } else {
                alert('❌ Не хватает монет!');
            }
        };
    });
}

function updateLaserUI() {
    const shapesList = document.getElementById('laser-shapes-list');
    const colorsList = document.getElementById('laser-colors-list');
    if (shapesList) {
        shapesList.innerHTML = '';
        const shapes = [
            { id: 'circle', name: '⚪ Кружок', price: 0 },
            { id: 'line', name: '📏 Палочка', price: 200 },
            { id: 'star', name: '⭐ Звезда', price: 350 }
        ];
        shapes.forEach(shape => {
            const owned = ownedShapes.includes(shape.id);
            const div = document.createElement('div');
            div.className = 'shop-item';
            div.innerHTML = `<div class="item-skin">${shape.name}</div><div class="item-price">${owned ? '✅ КУПЛЕН' : `💰 ${shape.price}`}</div><button class="buy-laser-btn" data-id="${shape.id}" data-type="shape">${owned ? 'ВЫБРАТЬ' : 'КУПИТЬ'}</button>`;
            shapesList.appendChild(div);
        });
    }
    if (colorsList) {
        colorsList.innerHTML = '';
        const colors = [
            { id: '#ffff40', name: '🟡 Жёлтый', price: 0 },
            { id: '#ff4444', name: '🔴 Красный', price: 150 },
            { id: '#4444ff', name: '🔵 Синий', price: 150 },
            { id: '#44ff44', name: '🟢 Зелёный', price: 150 },
            { id: '#aa44ff', name: '🟣 Фиолетовый', price: 250 },
            { id: 'rainbow', name: '🌈 Радужный', price: 400 }
        ];
        colors.forEach(color => {
            const owned = ownedColors.includes(color.id);
            const div = document.createElement('div');
            div.className = 'shop-item';
            div.innerHTML = `<div class="item-skin" style="color:${color.id === 'rainbow' ? '#ffaa00' : color.id}">${color.name}</div><div class="item-price">${owned ? '✅ КУПЛЕН' : `💰 ${color.price}`}</div><button class="buy-laser-btn" data-id="${color.id}" data-type="color">${owned ? 'ВЫБРАТЬ' : 'КУПИТЬ'}</button>`;
            colorsList.appendChild(div);
        });
    }
    document.querySelectorAll('.buy-laser-btn').forEach(btn => {
        if (btn.hasAttribute('data-bound')) return;
        btn.setAttribute('data-bound', 'true');
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const type = btn.dataset.type;
            if (type === 'shape') {
                const shapes = {
                    'circle': { name: 'Кружок', price: 0 },
                    'line': { name: 'Палочка', price: 200 },
                    'star': { name: 'Звезда', price: 350 }
                };
                const shape = shapes[id];
                if (ownedShapes.includes(id)) {
                    laserShape = id;
                    alert(`🔘 Форма ${shape.name} выбрана!`);
                    saveProgress();
                } else if (playerCoins >= shape.price) {
                    playerCoins -= shape.price;
                    ownedShapes.push(id);
                    updateCoinDisplay();
                    updateLaserUI();
                    saveProgress();
                    alert(`✅ Форма ${shape.name} куплена!`);
                } else alert('❌ Не хватает монет!');
            } else if (type === 'color') {
                const colors = {
                    '#ffff40': { name: 'Жёлтый', price: 0 },
                    '#ff4444': { name: 'Красный', price: 150 },
                    '#4444ff': { name: 'Синий', price: 150 },
                    '#44ff44': { name: 'Зелёный', price: 150 },
                    '#aa44ff': { name: 'Фиолетовый', price: 250 },
                    'rainbow': { name: 'Радужный', price: 400 }
                };
                const color = colors[id];
                if (ownedColors.includes(id)) {
                    laserColor = id;
                    alert(`🎨 Цвет ${color.name} выбран!`);
                    saveProgress();
                } else if (playerCoins >= color.price) {
                    playerCoins -= color.price;
                    ownedColors.push(id);
                    updateCoinDisplay();
                    updateLaserUI();
                    saveProgress();
                    alert(`✅ Цвет ${color.name} куплен!`);
                } else alert('❌ Не хватает монет!');
            }
        };
    });
}

function drawLaser(x, y) {
    ctx.save();
    ctx.translate(x, y);
    let color = laserColor;
    if (color === 'rainbow') color = `hsl(${Date.now() % 360}, 100%, 50%)`;
    ctx.fillStyle = color;
    if (laserShape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
    } else if (laserShape === 'line') {
        ctx.fillRect(-3, -3, 10, 6);
    } else if (laserShape === 'star') {
        for (let i = 0; i < 5; i++) {
            const angle = (i * 72) * Math.PI / 180;
            const x1 = Math.cos(angle) * 5;
            const y1 = Math.sin(angle) * 5;
            ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
        }
    }
    ctx.restore();
}

function loadSupers() {
    let saved = localStorage.getItem('spaceShooterSave');
    if (saved) {
        let data = JSON.parse(saved);
        purchasedSupers = data.purchasedSupers || ['sonic'];
        activeSuper = data.activeSuper || 'sonic';
        supersList.forEach(s => { s.owned = purchasedSupers.includes(s.id); });
    }
    updateSuperUI();
}
function saveSupers() { saveProgress(); }
function updateSuperUI() {
    let container = document.getElementById('supers-list');
    if (container) {
        container.innerHTML = '';
        supersList.forEach(sup => {
            let div = document.createElement('div');
            div.classList.add('shop-item');
            div.innerHTML = `<div class="item-skin">${sup.name}</div><div class="item-price">${sup.owned ? '✅ КУПЛЕН' : `💰 ${sup.price}`}</div><button class="buy-super-btn" data-super="${sup.id}">${sup.owned ? 'ВЫБРАТЬ' : 'КУПИТЬ'}</button>`;
            container.appendChild(div);
        });
    }
    document.querySelectorAll('.buy-super-btn').forEach(btn => {
        if (btn.hasAttribute('data-bound')) return;
        btn.setAttribute('data-bound', 'true');
        btn.onclick = (e) => {
            e.stopPropagation();
            const superId = btn.dataset.super;
            const sup = supersList.find(s => s.id === superId);
            if (sup.owned) {
                activeSuper = sup.id;
                alert(`🔮 Выбран супер: ${sup.name}`);
                saveProgress();
            } else if (playerCoins >= sup.price) {
                playerCoins -= sup.price;
                sup.owned = true;
                purchasedSupers.push(sup.id);
                updateCoinDisplay();
                updateSuperUI();
                saveProgress();
                alert(`✅ Супер ${sup.name} куплен!`);
            } else alert('❌ Не хватает монет!');
        };
    });
}

function addSuperAnimation(x, y, type) {
    animations.push({ x, y, type, timer: 40 });
}

function playSuperSound(soundId) {
    let audio = document.getElementById(soundId);
    if (audio) audio.cloneNode().play().catch(()=>{});
}

function activateSuper() {
    if (superCooldown > 0) return;
    if (superMeter < superMax) return;
    superMeter = 0;
    superCooldown = 60;
    let active = supersList.find(s => s.id === activeSuper);
    if (!active) return;
    if (active.soundId) playSuperSound(active.soundId);
    addSuperAnimation(player.x, player.y, activeSuper);
    switch (activeSuper) {
        case 'sonic':
            for (let i = 0; i < enemies.length; i++) {
                let e = enemies[i];
                let dist = Math.hypot(e.x - player.x, e.y - player.y);
                if (dist < 250) {
                    e.hp--;
                    if (e.hp <= 0) {
                        enemies.splice(i, 1);
                        score++;
                        addExplosion(e.x, e.y);
                        i--;
                    }
                }
            }
            break;
        case 'fastShoot':
            activeBuffs.fastShoot = 240;
            break;
        case 'invisible':
            activeBuffs.shield = Math.max(activeBuffs.shield, 240);
            break;
        case 'heal':
            player.lives = Math.min(player.lives + 2, 5);
            updateUI();
            break;
        case 'vortex':
            for (let i = 0; i < enemies.length; i++) {
                let e = enemies[i];
                let angle = Math.atan2(e.y - player.y, e.x - player.x);
                e.x += Math.cos(angle) * 80;
                e.y += Math.sin(angle) * 80;
                e.hp--;
                if (e.hp <= 0) {
                    enemies.splice(i, 1);
                    score++;
                    addExplosion(e.x, e.y);
                    i--;
                }
            }
            break;
        case 'firestarter':
            for (let e of enemies) {
                e.fireTimer = 180;
            }
            break;
        case 'blackhole':
            let bhAnim = { x: player.x, y: player.y, radius: 20, maxRadius: 300, timer: 30 };
            blackholeAnimations.push(bhAnim);
            let bhRadius = 550;
            for (let i = 0; i < enemies.length; i++) {
                let e = enemies[i];
                let dist = Math.hypot(e.x - player.x, e.y - player.y);
                if (dist < bhRadius) {
                    e.hp -= 50;
                    addExplosion(e.x, e.y);
                    if (e.hp <= 0) {
                        enemies.splice(i, 1);
                        score++;
                        i--;
                    }
                }
            }
            break;
    }
    updateUI();
}

function spawnBuff(x, y) {
    let types = ['❤️', '🔫', '🛡️', '⭐', '🐌'];
    buffs.push({ x, y, radius: 14, type: types[Math.floor(Math.random() * types.length)] });
}
function spawnCoin(x, y) { buffs.push({ x, y, radius: 12, type: '🪙' }); }

function applyBuff(type) {
    playBuff();
    if (type === '❤️') { player.lives = Math.min(player.lives + 1, 5); updateUI(); }
    if (type === '🔫') activeBuffs.tripleShot = 400 + (upgrades.tripleLevel - 1) * 210;
    if (type === '🛡️') activeBuffs.shield = 500 + (upgrades.shieldLevel - 1) * 210;
    if (type === '⭐') activeBuffs.doublePoints = 450 + (upgrades.doubleLevel - 1) * 210;
    if (type === '🐌') activeBuffs.slowEnemies = 400;
    if (type === '🪙') addCoins(15);
    updateUI();
}

function addExplosion(x, y) { explosions.push({ x, y, timer: 12 }); playExplode(); }

function showGameOver() {
    let fs = document.getElementById('finalScore');
    let fc = document.getElementById('finalCoins');
    if (fs) fs.innerText = score;
    if (fc) fc.innerText = playerCoins;
    let go = document.getElementById('game-overlay');
    if (go) go.classList.remove('hidden');
}

function spawnEnemy() {
    let type = Math.floor(Math.random() * 4);
    let enemy = {
        x: Math.random() * (canvas.width - 80) + 40, y: -40,
        radius: 14, hp: 1, speed: 0, shoots: false, type: type,
        color: '#ff3366', shootDelay: 0, shockTimer: 0, fireTimer: 0
    };
    if (type === 0) { enemy.speed = 2.5; enemy.shoots = true; enemy.shootDelay = 25; enemy.radius = 14; }
    else if (type === 1) { enemy.speed = 4.2; enemy.shoots = false; enemy.color = '#ffaa33'; enemy.radius = 11; }
    else if (type === 2) { enemy.speed = 1.5; enemy.hp = 3; enemy.shoots = true; enemy.shootDelay = 30; enemy.color = '#aa55cc'; enemy.radius = 18; }
    else {
        enemy.speed = 1.2; enemy.hp = 2; enemy.shoots = true; enemy.shootDelay = 22;
        enemy.color = '#33ccff'; enemy.radius = 15; enemy.phantom = true; enemy.teleportCooldown = 0;
    }
    enemies.push(enemy);
}

function spawnBoss() {
    if (boss) return;
    bossHpMultiplier *= 1.5;
    let bossType = Math.floor(Math.random() * 3);
    if (bossType === 0) {
        boss = { x: canvas.width / 2, y: 100, radius: 52, hp: Math.floor(150 * bossHpMultiplier), maxHp: Math.floor(150 * bossHpMultiplier), speedX: 1.2, shootDelay: 0, type: 'tank', color: '#aa4444', damage: 2, shootDelayMax: 45 };
    } else if (bossType === 1) {
        boss = { x: canvas.width / 2, y: 100, radius: 38, hp: Math.floor(70 * bossHpMultiplier), maxHp: Math.floor(70 * bossHpMultiplier), speedX: 5.0, shootDelay: 0, type: 'fast', color: '#44aaff', damage: 1, shootDelayMax: 18 };
    } else {
        boss = { x: canvas.width / 2, y: 100, radius: 44, hp: Math.floor(90 * bossHpMultiplier), maxHp: Math.floor(90 * bossHpMultiplier), speedX: 2.5, shootDelay: 0, type: 'drone', color: '#ffaa44', damage: 1, shootDelayMax: 35 };
    }
    let ann = document.getElementById('boss-announcement');
    if (ann) {
        ann.classList.remove('hidden');
        gameBeforeBossPaused = gameRunning && !gamePaused;
        gameRunning = false;
        gamePaused = false;
        isBossAnnouncementActive = true;
        if (bossAnnouncementTimer) clearTimeout(bossAnnouncementTimer);
        bossAnnouncementTimer = setTimeout(() => {
            if (ann) ann.classList.add('hidden');
            isBossAnnouncementActive = false;
            if (gameBeforeBossPaused) {
                gameRunning = true;
                gamePaused = false;
            }
            bossAnnouncementTimer = null;
        }, 3000);
    }
}

function updateUI() {
    let sv = document.getElementById('scoreValue');
    let lv = document.getElementById('livesValue');
    if (sv) sv.innerText = score;
    if (lv) lv.innerText = player.lives;
    updateCoinDisplay();
    updateBuffIndicators();
}

function updateBuffIndicators() {
    let container = document.getElementById('buff-indicators');
    if (!container) {
        container = document.createElement('div');
        container.id = 'buff-indicators';
        container.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); display:flex; gap:15px; z-index:100; background:rgba(0,0,0,0.6); padding:8px 20px; border-radius:50px; backdrop-filter:blur(5px); pointer-events:none;';
        document.body.appendChild(container);
    }
    container.innerHTML = '';
    let list = [
        { type: '🔫', name: 'Тройная стрельба', time: activeBuffs.tripleShot, color: '#ffaa00' },
        { type: '🛡️', name: 'Щит', time: activeBuffs.shield, color: '#33ccff' },
        { type: '⭐', name: 'Удвоение очков', time: activeBuffs.doublePoints, color: '#ffd700' },
        { type: '🐌', name: 'Замедление врагов', time: activeBuffs.slowEnemies, color: '#66ff66' },
        { type: '⚡', name: 'Сверхскорострельность', time: activeBuffs.fastShoot, color: '#ffaa44' }
    ];
    list.forEach(b => {
        if (b.time > 0) {
            let div = document.createElement('div');
            div.style.cssText = 'display:flex; flex-direction:column; align-items:center; background:rgba(0,0,0,0.7); border-radius:15px; padding:5px 12px; min-width:80px; border-left:3px solid ' + b.color + ';';
            div.innerHTML = `<div style="font-size:1.5rem;">${b.type}</div><div style="font-size:0.7rem; color:${b.color};">${Math.ceil(b.time / 60)}с</div>`;
            container.appendChild(div);
        }
    });
}

function update() {
    if (isBossAnnouncementActive) return;
    if (!gameRunning || gamePaused || gameOverFlag) return;
    if (player.invincible > 0) player.invincible--;
    if (activeBuffs.tripleShot > 0) activeBuffs.tripleShot--;
    if (activeBuffs.shield > 0) activeBuffs.shield--;
    if (activeBuffs.doublePoints > 0) activeBuffs.doublePoints--;
    if (activeBuffs.slowEnemies > 0) activeBuffs.slowEnemies--;
    if (activeBuffs.fastShoot > 0) activeBuffs.fastShoot--;
    if (superCooldown > 0) superCooldown--;
    for (let i = 0; i < animations.length; i++) {
        animations[i].timer--;
        if (animations[i].timer <= 0) animations.splice(i--, 1);
    }
    for (let i = 0; i < blackholeAnimations.length; i++) {
        let anim = blackholeAnimations[i];
        anim.radius += 15;
        anim.timer--;
        if (anim.timer <= 0) {
            blackholeAnimations.splice(i, 1);
            i--;
        }
    }
    let enemySpeedMult = activeBuffs.slowEnemies > 0 ? 0.5 : 1;
    let fireDelay = 8;
    if (activeBuffs.fastShoot > 0) fireDelay = 4;
    if (bulletCooldown <= 0) {
        if (activeBuffs.tripleShot > 0) {
            bullets.push({ x: player.x - 12, y: player.y - 15, radius: 5 });
            bullets.push({ x: player.x, y: player.y - 22, radius: 6 });
            bullets.push({ x: player.x + 12, y: player.y - 15, radius: 5 });
        } else {
            bullets.push({ x: player.x, y: player.y - 20, radius: 6 });
        }
        bulletCooldown = fireDelay;
        playShoot();
    } else bulletCooldown--;
    
    for (let i = 0; i < bullets.length; i++) {
        bullets[i].y -= 9;
        if (bullets[i].y + 10 < 0 || bullets[i].y > canvas.height) bullets.splice(i--, 1);
    }
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        if (e.shockTimer > 0) { e.shockTimer--; continue; }
        if (e.fireTimer > 0) {
            e.fireTimer--;
            if (e.fireTimer % 60 === 0) {
                e.hp -= 10;
                if (e.hp <= 0) {
                    enemies.splice(i, 1);
                    score++;
                    addExplosion(e.x, e.y);
                    i--;
                    continue;
                }
                addExplosion(e.x, e.y);
            }
        }
        e.y += e.speed * enemySpeedMult;
        if (e.phantom && e.teleportCooldown <= 0 && Math.random() < 0.02) {
            e.x = Math.random() * (canvas.width - 100) + 50;
            e.y = Math.random() * (canvas.height / 2) + 30;
            e.teleportCooldown = 60;
        } else if (e.teleportCooldown > 0) e.teleportCooldown--;
        if (e.shoots && e.shootDelay <= 0) {
            bullets.push({ x: e.x, y: e.y + 10, radius: 5, isEnemy: true });
            e.shootDelay = 28;
        } else if (e.shootDelay > 0) e.shootDelay--;
        if (e.y + e.radius > canvas.height + 100) enemies.splice(i--, 1);
    }
    for (let i = 0; i < bullets.length; i++) {
        let b = bullets[i];
        if (b.isEnemy) {
            b.y += 6;
            if (b.y > canvas.height + 50 || b.y < -50) bullets.splice(i--, 1);
            else if (player.invincible === 0 && activeBuffs.shield === 0 && Math.hypot(b.x - player.x, b.y - player.y) < b.radius + player.radius) {
                let damage = b.damage || 1;
                player.lives -= damage;
                player.invincible = 45;
                updateUI();
                addExplosion(player.x, player.y);
                bullets.splice(i--, 1);
                if (player.lives <= 0) {
                    gameOverFlag = true;
                    gameRunning = false;
                    showGameOver();
                }
            }
            continue;
        }
        let hit = false;
        for (let j = 0; j < enemies.length; j++) {
            let e = enemies[j];
            if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
                e.hp--;
                hit = true;
                if (superMeter < superMax) superMeter++;
                updateUI();
                if (e.hp <= 0) {
                    let add = activeBuffs.doublePoints > 0 ? 2 : 1;
                    let prevScore = score;
                    score += add;
                    if (Math.floor(score / 300) > Math.floor(prevScore / 300) && !boss && score > 0) spawnBoss();
                    updateUI();
                    addExplosion(e.x, e.y);
                    if (Math.random() < 0.3) spawnBuff(e.x, e.y);
                    if (Math.random() < 0.45) spawnCoin(e.x, e.y);
                    enemies.splice(j, 1);
                }
                break;
            }
        }
        if (hit) { bullets.splice(i--, 1); continue; }
        if (boss && Math.hypot(b.x - boss.x, b.y - boss.y) < b.radius + boss.radius) {
            boss.hp--;
            if (superMeter < superMax) superMeter++;
            updateUI();
            bullets.splice(i--, 1);
            if (boss.hp <= 0) {
                let oldX = boss.x, oldY = boss.y;
                boss = null;
                score += 100;
                addCoins(100);
                updateUI();
                addExplosion(oldX, oldY);
                for (let k = 0; k < 3; k++) spawnBuff(oldX + (Math.random() - 0.5) * 80, oldY + (Math.random() - 0.5) * 80);
                for (let k = 0; k < 6; k++) spawnCoin(oldX + (Math.random() - 0.5) * 80, oldY + (Math.random() - 0.5) * 80);
            }
        }
    }
    for (let i = 0; i < buffs.length; i++) {
        let b = buffs[i];
        b.y += 2.5;
        if (Math.hypot(b.x - player.x, b.y - player.y) < b.radius + player.radius) {
            applyBuff(b.type);
            buffs.splice(i--, 1);
        } else if (b.y > canvas.height + 50) buffs.splice(i--, 1);
    }
    if (boss) {
        boss.x += boss.speedX;
        if (boss.x < 60 || boss.x > canvas.width - 60) boss.speedX *= -1;
        if (boss.shootDelay <= 0) {
            if (boss.type === 'drone') {
                let baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
                for (let i = -6; i <= 6; i++) {
                    let angle = baseAngle + i * 0.1;
                    bullets.push({ x: boss.x, y: boss.y + 20, angle: angle, speed: 7, radius: 5, isEnemy: true, damage: boss.damage || 1 });
                }
                boss.shootDelay = boss.shootDelayMax;
            } else if (boss.type === 'fast') {
                let angle = Math.atan2(player.y - boss.y, player.x - boss.x);
                bullets.push({ x: boss.x, y: boss.y + 20, angle: angle, speed: 9, radius: 5, isEnemy: true, damage: boss.damage || 1 });
                boss.shootDelay = boss.shootDelayMax;
            } else if (boss.type === 'tank') {
                let angle = Math.atan2(player.y - boss.y, player.x - boss.x);
                bullets.push({ x: boss.x, y: boss.y + 20, angle: angle, speed: 6, radius: 6, isEnemy: true, damage: 2 });
                boss.shootDelay = boss.shootDelayMax;
            }
        } else {
            boss.shootDelay--;
        }
    }
    if (!boss && enemySpawnCounter <= 0) {
        spawnEnemy();
        enemySpawnCounter = enemySpawnDelay;
        if (enemySpawnDelay > 18) enemySpawnDelay -= 0.2;
    } else enemySpawnCounter--;
    frame++;
    rotatingAngle += 0.1;
    for (let i = 0; i < explosions.length; i++) { explosions[i].timer--; if (explosions[i].timer <= 0) explosions.splice(i--, 1); }
    updateBuffIndicators();
    let moveX = 0, moveY = 0;
    if (keys['w']) moveY -= 1;
    if (keys['s']) moveY += 1;
    if (keys['a']) moveX -= 1;
    if (keys['d']) moveX += 1;
    if (moveX !== 0 || moveY !== 0) {
        let len = Math.hypot(moveX, moveY);
        moveX /= len; moveY /= len;
        let speed = 5 * player.speedBonus;
        player.x += moveX * speed;
        player.y += moveY * speed;
    }
    player.x = Math.min(Math.max(player.x, player.radius + 15), canvas.width - player.radius - 15);
    player.y = Math.min(Math.max(player.y, 50), canvas.height - 30);
    for (let i = 0; i < bullets.length; i++) {
        if (bullets[i].isEnemy) {
            bullets[i].y += 6;
            bullets[i].x = bullets[i].x;
            if (bullets[i].angle) bullets[i].angle = Math.PI / 2;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStarsBackground();
    
    for (let anim of blackholeAnimations) {
        let intensity = anim.timer / 30;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.5 - intensity * 0.3})`;
        ctx.beginPath();
        ctx.arc(anim.x, anim.y, anim.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(100, 0, 150, ${0.4 - intensity * 0.2})`;
        ctx.beginPath();
        ctx.arc(anim.x, anim.y, anim.radius - 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (!gameOverFlag) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#0af";
        ctx.fillStyle = getSkinColor();
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 20);
        ctx.lineTo(player.x - 20, player.y + 8);
        ctx.lineTo(player.x - 8, player.y + 4);
        ctx.lineTo(player.x - 8, player.y + 12);
        ctx.lineTo(player.x, player.y + 18);
        ctx.lineTo(player.x + 8, player.y + 12);
        ctx.lineTo(player.x + 8, player.y + 4);
        ctx.lineTo(player.x + 20, player.y + 8);
        ctx.fill();
        if (activeBuffs.shield > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 26, 0, Math.PI * 2);
            ctx.strokeStyle = '#33ccff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
    
    for (let b of bullets) {
        if (b.isEnemy) {
            ctx.fillStyle = '#ffaa44';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            drawLaser(b.x, b.y);
        }
    }
    
    for (let e of enemies) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, e.radius, e.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px monospace';
        if (e.type === 0) ctx.fillText('👾', e.x - 10, e.y - 8);
        else if (e.type === 1) ctx.fillText('⚡', e.x - 8, e.y - 8);
        else if (e.type === 2) ctx.fillText('🐙', e.x - 10, e.y - 8);
        else ctx.fillText('👻', e.x - 10, e.y - 8);
        if (e.hp > 1) {
            ctx.fillStyle = 'yellow';
            ctx.fillText('x' + e.hp, e.x - 8, e.y - 18);
        }
        if (e.fireTimer > 0) {
            ctx.fillStyle = `rgba(255, 100, 0, ${0.5 + Math.sin(Date.now() * 0.02) * 0.3})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    if (boss) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = boss.color;
        ctx.fillStyle = boss.color || '#882244';
        ctx.beginPath();
        ctx.ellipse(boss.x, boss.y, boss.radius, boss.radius - 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px monospace';
        let bossName = boss.type === 'tank' ? 'ТАНК' : (boss.type === 'fast' ? 'БЫСТРЫЙ' : 'ДРОН');
        ctx.fillText(`👾 ${bossName}`, boss.x - 45, boss.y - 40);
        let hpPercent = boss.hp / boss.maxHp;
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x - 80, boss.y - 60, 160, 12);
        ctx.fillStyle = 'lime';
        ctx.fillRect(boss.x - 80, boss.y - 60, 160 * hpPercent, 12);
        ctx.shadowBlur = 0;
    }
    
    for (let b of buffs) {
        if (b.type === '🪙') {
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(rotatingAngle);
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 24px monospace';
            ctx.fillText('💲', -10, 8);
            ctx.restore();
        } else {
            ctx.fillStyle = 'gold';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.font = 'bold 18px monospace';
            ctx.fillText(b.type, b.x - 8, b.y + 6);
        }
    }
    
    for (let ex of explosions) {
        let intensity = ex.timer / 12;
        ctx.fillStyle = `rgba(255, 100, 0, ${intensity})`;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, 9, 0, Math.PI * 2);
        ctx.fill();
    }
    
    for (let a of animations) {
        let intensity = a.timer / 40;
        if (a.type === 'sonic') {
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.8 - intensity * 0.6})`;
            ctx.lineWidth = 6;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(a.x, a.y, 50 * (1 - intensity) + 20 * i, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = `rgba(0, 150, 200, ${0.3 - intensity * 0.2})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 70 * (1 - intensity), 0, Math.PI * 2);
            ctx.fill();
        } else if (a.type === 'fastShoot') {
            ctx.fillStyle = `rgba(255, 200, 100, ${0.7 - intensity * 0.5})`;
            for (let i = 0; i < 20; i++) {
                let angle = Math.random() * Math.PI * 2;
                let dist = 50 * (1 - intensity);
                ctx.fillRect(a.x + Math.cos(angle) * dist - 3, a.y + Math.sin(angle) * dist - 3, 6, 6);
            }
        } else if (a.type === 'invisible') {
            ctx.fillStyle = `rgba(100, 150, 255, ${0.4 - intensity * 0.3})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 45 * (1 - intensity) + 15, 0, Math.PI * 2);
            ctx.fill();
        } else if (a.type === 'heal') {
            ctx.fillStyle = `rgba(0, 255, 100, ${0.8 - intensity * 0.5})`;
            for (let i = 0; i < 8; i++) {
                let angle = (Date.now() / 100 + i) * 0.8;
                let dist = 40 * (1 - intensity);
                ctx.fillText('❤️', a.x + Math.cos(angle) * dist - 8, a.y + Math.sin(angle) * dist - 8);
            }
        } else if (a.type === 'vortex') {
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.7 - intensity * 0.5})`;
            ctx.lineWidth = 5;
            for (let i = 0; i < 4; i++) {
                let angle = (Date.now() / 80 + i) * 0.8;
                let dist = 55 * (1 - intensity);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(a.x + Math.cos(angle) * dist, a.y + Math.sin(angle) * dist);
                ctx.stroke();
            }
        } else if (a.type === 'firestarter') {
            ctx.fillStyle = `rgba(255, 80, 0, ${0.7 - intensity * 0.4})`;
            for (let i = 0; i < 12; i++) {
                let angle = Math.random() * Math.PI * 2;
                let dist = 60 * (1 - intensity);
                ctx.fillRect(a.x + Math.cos(angle) * dist - 4, a.y + Math.sin(angle) * dist - 4, 8, 8);
            }
        } else if (a.type === 'blackhole') {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.6 - intensity * 0.4})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 60 * (1 - intensity) + 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(100, 0, 150, ${0.5 - intensity * 0.3})`;
            ctx.beginPath();
            ctx.arc(a.x, a.y, 40 * (1 - intensity) + 15, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    let btnX = canvas.width - 80;
    let btnY = canvas.height - 80;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff5500';
    ctx.beginPath();
    ctx.arc(btnX, btnY, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('СУПЕР', btnX - 22, btnY + 5);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('C', btnX - 5, btnY - 15);
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(btnX, btnY, 28, 0, Math.PI * 2);
    ctx.fill();
    let angle = (superMeter / superMax) * Math.PI * 2;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(btnX, btnY);
    ctx.arc(btnX, btnY, 28, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function gameLoop() { update(); draw(); animationId = requestAnimationFrame(gameLoop); }

function togglePause() {
    if (gameOverFlag || !gameRunning) return;
    gamePaused = !gamePaused;
    let p = document.getElementById('pause-overlay');
    if (p) p.classList.toggle('hidden', !gamePaused);
}

function restartGame() {
    gameRunning = true;
    gamePaused = false;
    gameOverFlag = false;
    player.lives = 3;
    player.invincible = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.speedBonus = 1.0;
    score = 0;
    bossHpMultiplier = 1;
    enemies = [];
    bullets = [];
    buffs = [];
    explosions = [];
    animations = [];
    blackholeAnimations = [];
    boss = null;
    activeBuffs = { tripleShot: 0, shield: 0, doublePoints: 0, slowEnemies: 0, fastShoot: 0 };
    superMeter = 0;
    enemySpawnDelay = 25;
    enemySpawnCounter = 10;
    frame = 0;
    updateUI();
    document.getElementById('game-overlay')?.classList.add('hidden');
    document.getElementById('pause-overlay')?.classList.add('hidden');
    document.getElementById('game-container')?.classList.remove('hidden');
    document.getElementById('main-menu')?.classList.add('hidden');
    if (!animationId) gameLoop();
}

function exitToMenu() {
    gameRunning = false;
    gamePaused = false;
    gameOverFlag = false;
    document.getElementById('game-container')?.classList.add('hidden');
    document.getElementById('main-menu')?.classList.remove('hidden');
    document.getElementById('pause-overlay')?.classList.add('hidden');
}

// ========== МУЗЫКА (ПРОСТАЯ И РАБОЧАЯ) ==========
function stopAllMusic() {
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
    }
    const audios = ['menuMusic', 'battleMusic', 'bossMusic'];
    audios.forEach(id => {
        const audio = document.getElementById(id);
        if (audio) audio.pause();
    });
}

function playMusic(id) {
    if (!musicEnabled) return;
    stopAllMusic();
    const audio = document.getElementById(id);
    if (audio) {
        currentMusic = audio;
        audio.currentTime = 0;
        audio.loop = true;
        audio.play().catch(e => console.log('Playback error:', e));
    }
}

function updateMusicByState() {
    if (!musicEnabled) return;
    if (!gameRunning || gamePaused || gameOverFlag) {
        playMusic('menuMusic');
    } else if (boss && !isBossAnnouncementActive) {
        playMusic('bossMusic');
    } else if (!boss && !isBossAnnouncementActive && gameRunning && !gamePaused) {
        playMusic('battleMusic');
    }
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    if (musicEnabled) {
        updateMusicByState();
    } else {
        stopAllMusic();
    }
    const btn = document.getElementById('music-toggle');
    if (btn) btn.innerText = musicEnabled ? '🔊 МУЗЫКА' : '🔇 МУЗЫКА';
}

// Создаём кнопку вкл/выкл музыки
if (!document.getElementById('music-toggle')) {
    const btn = document.createElement('button');
    btn.id = 'music-toggle';
    btn.innerText = '🔊 МУЗЫКА';
    btn.style.cssText = 'position:fixed; bottom:20px; left:20px; z-index:1000; background:#ff5500; border:none; padding:8px 15px; border-radius:30px; color:white; cursor:pointer;';
    btn.onclick = toggleMusic;
    document.body.appendChild(btn);
}

// Активация музыки после первого клика
function activateMusic() {
    if (musicActivated) return;
    musicActivated = true;
    musicEnabled = true;
    updateMusicByState();
    document.removeEventListener('click', activateMusic);
    document.removeEventListener('touchstart', activateMusic);
}
document.addEventListener('click', activateMusic);
document.addEventListener('touchstart', activateMusic);

// Запускаем обновление музыки
setInterval(updateMusicByState, 1000);

window.addEventListener('keydown', (e) => { keys[e.key] = true; if (e.key === 'Escape') togglePause(); if (e.key === 'c' || e.key === 'с') activateSuper(); });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function handleMove(e) {
    if (!gameRunning || gamePaused || gameOverFlag) return;
    let rect = canvas.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let x = (clientX - rect.left) * (canvas.width / rect.width);
    player.x = Math.min(Math.max(x, player.radius + 15), canvas.width - player.radius - 15);
}

canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('touchmove', handleMove);
canvas.addEventListener('touchstart', e => { e.preventDefault(); handleMove(e); });

let superBtn = document.createElement('div');
superBtn.id = 'super-button';
superBtn.style.cssText = 'position:fixed; bottom:80px; right:20px; width:70px; height:70px; background:#ff5500; border-radius:50%; z-index:200; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; cursor:pointer; box-shadow:0 0 15px rgba(255,85,0,0.8); flex-direction:column; font-family:monospace; border:2px solid #ffaa00;';
superBtn.innerHTML = 'СУПЕР<div id="super-meter-fill" style="position:absolute; bottom:0; left:0; width:0%; height:6px; background:#ffaa00; border-radius:3px;"></div>';
superBtn.onclick = () => activateSuper();
document.body.appendChild(superBtn);

let startBtn = document.getElementById('start-game-btn');
let restartLose = document.getElementById('restartFromLose');
let menuLose = document.getElementById('menuFromLose');
let menuBtn = document.getElementById('menuBtn');
let pauseBtn = document.getElementById('pauseBtn');
let resumeBtn = document.getElementById('resumeBtn');
let exitPauseBtn = document.getElementById('exit-to-menu');

if (startBtn) startBtn.onclick = restartGame;
if (restartLose) restartLose.onclick = restartGame;
if (menuLose) menuLose.onclick = exitToMenu;
if (menuBtn) menuBtn.onclick = exitToMenu;
if (pauseBtn) pauseBtn.onclick = togglePause;
if (resumeBtn) resumeBtn.onclick = togglePause;
if (exitPauseBtn) exitPauseBtn.onclick = exitToMenu;

function initShopNavigation() {
    const mainBtns = document.getElementById('shop-main-buttons');
    const skinsShop = document.getElementById('skins-shop');
    const lasersShop = document.getElementById('lasers-shop');
    const supersShop = document.getElementById('supers-shop');
    function hideAll() {
        if (mainBtns) mainBtns.style.display = 'flex';
        if (skinsShop) skinsShop.style.display = 'none';
        if (lasersShop) lasersShop.style.display = 'none';
        if (supersShop) supersShop.style.display = 'none';
    }
    hideAll();
    document.getElementById('shop-skins-main')?.addEventListener('click', () => {
        if (mainBtns) mainBtns.style.display = 'none';
        if (skinsShop) skinsShop.style.display = 'block';
        updateSkinsUI();
    });
    document.getElementById('shop-lasers-main')?.addEventListener('click', () => {
        if (mainBtns) mainBtns.style.display = 'none';
        if (lasersShop) lasersShop.style.display = 'block';
        updateLaserUI();
        document.getElementById('laser-shapes-list').style.display = 'block';
        document.getElementById('laser-colors-list').style.display = 'none';
    });
    document.getElementById('shop-supers-main')?.addEventListener('click', () => {
        if (mainBtns) mainBtns.style.display = 'none';
        if (supersShop) supersShop.style.display = 'block';
        updateSuperUI();
    });
    document.querySelectorAll('.shop-back, .back-btn').forEach(btn => {
        btn.addEventListener('click', () => { hideAll(); });
    });
    document.getElementById('laser-shape-btn')?.addEventListener('click', () => {
        document.getElementById('laser-shapes-list').style.display = 'block';
        document.getElementById('laser-colors-list').style.display = 'none';
    });
    document.getElementById('laser-color-btn')?.addEventListener('click', () => {
        document.getElementById('laser-colors-list').style.display = 'block';
        document.getElementById('laser-shapes-list').style.display = 'none';
    });
}

let shopBtnElem = document.getElementById('shop-btn');
if (shopBtnElem) {
    shopBtnElem.onclick = () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('shop-menu').classList.remove('hidden');
        initShopNavigation();
        updateSkinsUI();
        updateLaserUI();
        updateSuperUI();
    };
}

let skinsMenuBtn = document.getElementById('skins-menu-btn');
if (skinsMenuBtn) {
    skinsMenuBtn.onclick = () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('skins-menu').classList.remove('hidden');
        updateSkinsUI();
    };
}

let buffsMenuBtn = document.getElementById('buffs-menu-btn');
if (buffsMenuBtn) {
    buffsMenuBtn.onclick = () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('buffs-menu').classList.remove('hidden');
        updateUpgradeUI();
        bindUpgradeButtons();
    };
}

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('shop-menu')?.classList.add('hidden');
        document.getElementById('skins-menu')?.classList.add('hidden');
        document.getElementById('buffs-menu')?.classList.add('hidden');
        document.getElementById('main-menu')?.classList.remove('hidden');
    });
});

// ========== ЗАГРУЗОЧНЫЙ ЭКРАН ==========
let loadingProgress = 0;
let loadingInterval = null;

function updateLoadingBar(percent, text) {
    const bar = document.getElementById('loading-bar');
    const textEl = document.getElementById('loading-text');
    if (bar) bar.style.width = percent + '%';
    if (textEl) textEl.innerText = text + ' ' + percent + '%';
}

function finishLoading() {
    if (loadingInterval) clearInterval(loadingInterval);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.transition = 'opacity 0.5s';
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

loadingInterval = setInterval(() => {
    if (loadingProgress < 100) {
        loadingProgress += Math.random() * 15;
        if (loadingProgress > 100) loadingProgress = 100;
        updateLoadingBar(Math.floor(loadingProgress), 'Загрузка ресурсов');
    } else {
        finishLoading();
    }
}, 200);

Promise.all([
    new Promise(resolve => {
        const audio = document.getElementById('menuMusic');
        if (audio && audio.readyState >= 2) resolve();
        else if (audio) audio.addEventListener('canplaythrough', resolve, { once: true });
        else resolve();
    }),
    new Promise(resolve => {
        const audio = document.getElementById('battleMusic');
        if (audio && audio.readyState >= 2) resolve();
        else if (audio) audio.addEventListener('canplaythrough', resolve, { once: true });
        else resolve();
    }),
    new Promise(resolve => {
        const audio = document.getElementById('bossMusic');
        if (audio && audio.readyState >= 2) resolve();
        else if (audio) audio.addEventListener('canplaythrough', resolve, { once: true });
        else resolve();
    })
]).then(() => {
    loadingProgress = 100;
    updateLoadingBar(100, 'Готово!');
    setTimeout(finishLoading, 300);
});
// ========== ФИКС КНОПКИ МЕНЮ ПРИ ПОРАЖЕНИИ ==========
const fixMenuLoseBtn = document.getElementById('menuFromLose');
if (fixMenuLoseBtn) {
    fixMenuLoseBtn.onclick = () => {
        gameRunning = false;
        gamePaused = false;
        gameOverFlag = false;
        document.getElementById('game-container')?.classList.add('hidden');
        document.getElementById('main-menu')?.classList.remove('hidden');
        document.getElementById('game-overlay')?.classList.add('hidden');
        document.getElementById('pause-overlay')?.classList.add('hidden');
        // Останавливаем музыку
        if (currentMusicSource) {
            try { currentMusicSource.stop(); } catch(e) {}
            currentMusicSource = null;
        }
    };
}
loadProgress();
bindUpgradeButtons();
updateCoinDisplay();
updateSkinsUI();
updateSuperUI();
updateLaserUI();
updateUI();
gameLoop();