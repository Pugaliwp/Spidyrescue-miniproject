const canvas = document.getElementById('gameCanvas');;
const ctx = canvas.getContext('2d');

const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia("(pointer: coarse)").matches);

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Storage Helpers (Per User) ---
function getCurrentUser() {
    try {
        const u = JSON.parse(localStorage.getItem('spidy_user_data'));
        return (u && u.name) ? u.name : 'guest';
    } catch (e) { return 'guest'; }
}

function getSafeItem(key) {
    const user = getCurrentUser();
    return localStorage.getItem(`${key}_${user}`);
}

function setSafeItem(key, val) {
    const user = getCurrentUser();
    localStorage.setItem(`${key}_${user}`, val);
}

// Assets
const ASSETS = {
    back: new Image(),
    spider: new Image(),
    kid: new Image(),
    girl: new Image(),
    old: new Image(),
    forest: new Image()
};
ASSETS.back.src = 'back.png';
ASSETS.spider.src = 'spider.png';
ASSETS.kid.src = 'kid.png';
ASSETS.girl.src = 'girl.png';
ASSETS.old.src = 'old.webp';
ASSETS.forest.src = 'forest.png';

/* ---------- Audio System ---------- */
const SOUNDS = {
    back: new Audio('back.mpeg'),
    fahh: new Audio('fahh.mpeg'),
    wasted: new Audio('wasted.mpeg')
};

SOUNDS.back.preload = 'auto';
SOUNDS.fahh.preload = 'auto';
SOUNDS.wasted.preload = 'auto';

SOUNDS.back.loop = true;
SOUNDS.back.volume = 0.4;
SOUNDS.fahh.volume = 0.6;
SOUNDS.wasted.volume = 0.8;

// Game State
const STATE = {
    active: false,
    paused: false,
    level: 1,
    maxUnlocked: parseInt(getSafeItem('spidy_max_level')) || 1,
    score: 0,
    lives: 3,
    frame: 0,
    time: 0,
    rescueOrder: [],
    citizens: [], // populated per level
    lastDeath: 0  // Timestamp to prevent double-death in same frame
};

// --- Music Logic ---
function startMusicLoop() {
    // Try auto-play
    SOUNDS.back.play().catch(() => {
        // If blocked, wait for first interaction
        const onInteract = () => {
            // Warm up SFX to reduce latency
            SOUNDS.fahh.play().then(() => {
                SOUNDS.fahh.pause();
                SOUNDS.fahh.currentTime = 0;
            }).catch(() => { });

            SOUNDS.wasted.play().then(() => {
                SOUNDS.wasted.pause();
                SOUNDS.wasted.currentTime = 0;
            }).catch(() => { });

            SOUNDS.back.play().catch(e => console.warn("Music failed", e));

            // Apply initial mute if needed
            if (!SETTINGS.musicEnabled) SOUNDS.back.muted = true;

            document.removeEventListener('click', onInteract);
            document.removeEventListener('keydown', onInteract);
        };
        document.addEventListener('click', onInteract);
        document.addEventListener('keydown', onInteract);
    });
}

function updateAudioSettings() {
    SOUNDS.back.muted = !SETTINGS.musicEnabled;
    // SFX doesn't need "muted" property as we check enabled flag before play()
}
// Start immediately (Loading Page) - REMOVED per request
// startMusicLoop();

// Physics Constants (Defaults)
const GRAVITY = 0.9;
const TERMINAL_VELOCITY = 20;

// Dynamic Settings
const SETTINGS = {
    jumpForce: parseInt(localStorage.getItem('spidy_jump')) || 22, // Global Setting
    speed: parseInt(localStorage.getItem('spidy_speed')) || 8,     // Global Setting
    musicEnabled: localStorage.getItem('spidy_music') !== 'false', // Default true
    sfxEnabled: localStorage.getItem('spidy_sfx') !== 'false'      // Default true
};

// Apply negative for physics usage
function getJumpForce() { return -SETTINGS.jumpForce; }

/* ---------- Level Designs ---------- */
// ... (Levels start here) ...

const LEVELS = [
    // --- EASY (1-3) ---
    // L1: Rooftops - Basics
    {
        platforms: [
            { rx: 0.1, ry: 0.75, rw: 0.25, rh: 0.05 },
            { rx: 0.45, ry: 0.60, rw: 0.25, rh: 0.05 },
            { rx: 0.8, ry: 0.45, rw: 0.15, rh: 0.05 }
        ],
        hazards: []
    },
    // L2: First Jump - Wide gaps
    {
        platforms: [
            { rx: 0.05, ry: 0.8, rw: 0.2, rh: 0.05 },
            { rx: 0.4, ry: 0.65, rw: 0.2, rh: 0.05 },
            { rx: 0.75, ry: 0.5, rw: 0.2, rh: 0.05 }
        ],
        hazards: []
    },
    // L3: Moving Basics - Slow moving platform
    {
        platforms: [
            { rx: 0.1, ry: 0.8, rw: 0.15, rh: 0.05 },
            { rx: 0.4, ry: 0.6, rw: 0.2, rh: 0.05, moveX: true, range: 0.1, speed: 0.01 },
            { rx: 0.8, ry: 0.4, rw: 0.15, rh: 0.05 }
        ],
        hazards: []
    },

    // --- MEDIUM (4-7) ---
    // L4: The Foundry - Fire hazards
    {
        platforms: [
            { rx: 0.1, ry: 0.8, rw: 0.2, rh: 0.05 },
            { rx: 0.5, ry: 0.6, rw: 0.2, rh: 0.05 },
            { rx: 0.8, ry: 0.3, rw: 0.15, rh: 0.05 }
        ],
        hazards: [
            { type: 'fire', rx: 0.55, ry: 0.56, rw: 0.1, rh: 0.04 }
        ]
    },
    // L5: Windy City - Patrol Drone
    {
        platforms: [
            { rx: 0.1, ry: 0.8, rw: 0.15, rh: 0.05 },
            { rx: 0.4, ry: 0.6, rw: 0.2, rh: 0.05 },
            { rx: 0.7, ry: 0.4, rw: 0.2, rh: 0.05 }
        ],
        hazards: [
            { type: 'patrol', rx: 0.6, ry: 0.2, rw: 0.08, rh: 0.08, range: 0.2, speed: 0.02 }
        ]
    },
    // L6: Clock Tower - Saws
    {
        platforms: [
            { rx: 0.1, ry: 0.8, rw: 0.15, rh: 0.05 },
            { rx: 0.35, ry: 0.6, rw: 0.15, rh: 0.05 },
            { rx: 0.6, ry: 0.5, rw: 0.15, rh: 0.05, moveX: true, range: 0.05, speed: 0.01 },
            { rx: 0.85, ry: 0.3, rw: 0.1, rh: 0.05 }
        ],
        hazards: [
            { type: 'saw', rx: 0.4, ry: 0.9, rw: 0.06, rh: 0.06, range: 0.3, speed: 0.02 }
        ]
    },
    // L7: Toxic Jungle - Rain (Slow)
    {
        platforms: [
            { rx: 0.1, ry: 0.8, rw: 0.2, rh: 0.05 },
            { rx: 0.4, ry: 0.5, rw: 0.2, rh: 0.05 },
            { rx: 0.7, ry: 0.3, rw: 0.2, rh: 0.05 }
        ],
        hazards: [
            { type: 'rain', count: 5, speed: 4 } // Slow rain
        ]
    },

    // --- HARD (8-10) ---
    // L8: High Stakes - Fast Platforms
    {
        platforms: [
            { rx: 0.1, ry: 0.8, rw: 0.15, rh: 0.05 },
            { rx: 0.3, ry: 0.6, rw: 0.15, rh: 0.05, moveX: true, range: 0.15, speed: 0.02 },
            { rx: 0.6, ry: 0.4, rw: 0.15, rh: 0.05, moveX: true, range: 0.1, speed: 0.025 },
            { rx: 0.85, ry: 0.2, rw: 0.1, rh: 0.05 }
        ],
        hazards: [
            { type: 'saw', rx: 0.5, ry: 0.9, rw: 0.07, rh: 0.07, range: 0.4, speed: 0.04 }
        ]
    },
    // L9: Laser Lab - Lasers
    {
        platforms: [
            { rx: 0.1, ry: 0.8, rw: 0.15, rh: 0.05 },
            { rx: 0.4, ry: 0.6, rw: 0.2, rh: 0.05 },
            { rx: 0.7, ry: 0.4, rw: 0.15, rh: 0.05 },
            { rx: 0.4, ry: 0.2, rw: 0.2, rh: 0.05 }
        ],
        hazards: [
            { type: 'laser', rx: 0.45, ry: 0.4, rw: 0.1, rh: 0.2, period: 180 }, // Vertical gate? No, rect hazard
            { type: 'laser', rx: 0.6, ry: 0.0, rw: 0.02, rh: 0.4, period: 120 } // Vertical beam
        ]
    },
    // L10: The Summit - Rain + Movement
    {
        platforms: [
            { rx: 0.1, ry: 0.8, rw: 0.15, rh: 0.05 },
            { rx: 0.3, ry: 0.6, rw: 0.15, rh: 0.05, moveX: true, range: 0.1, speed: 0.015 },
            { rx: 0.6, ry: 0.4, rw: 0.15, rh: 0.05, moveX: true, range: 0.1, speed: 0.015 },
            { rx: 0.8, ry: 0.2, rw: 0.15, rh: 0.05 }
        ],
        hazards: [
            { type: 'rain', count: 5, speed: 2 } // Heavier rain
        ]
    }
];

// End of manual levels.
// User requested removal of auto-generated levels 7-25.

/* ---------- Entities ---------- */
let player = {
    x: 0, y: 0, w: 50, h: 50,
    vx: 0, vy: 0,
    onGround: false
};

let currentPlatforms = [];
let currentHazards = [];

/* ---------- Core Functions ---------- */
function init() {
    setupUI();
    if (isTouchDevice) setupMobileControls();

    // Loading Screen Logic
    const loadingScreen = document.getElementById('loading-screen');
    const bgBar = document.getElementById('loading-bar-fill');

    if (loadingScreen && bgBar) {
        // Start animation immediately
        requestAnimationFrame(() => {
            bgBar.style.width = '100%';
        });

        // Wait 3 seconds then fade out
        setTimeout(() => {
            // Prepare the next screen (Welcome Page) BEHIND the loading screen
            // Since loading-screen has z-index 9999, user-info-screen (z-index 210) will be hidden behind it
            const nextScreen = document.getElementById('user-info-screen');
            if (nextScreen) {
                nextScreen.classList.remove('hidden');
                nextScreen.classList.add('active');
                nextScreen.style.display = 'flex';
                nextScreen.style.opacity = '1';
            }

            loadingScreen.style.opacity = '0'; // Start the 0.5s CSS fade out

            setTimeout(() => {
                loadingScreen.style.display = 'none';
                loadingScreen.classList.remove('active');
                loadingScreen.classList.add('hidden');

                // Start Music HERE
                startMusicLoop();
            }, 500); // Wait for the fade-out duration (0.5s)
        }, 3000); // 3 seconds total loading time
    } else {
        showScreen(document.getElementById('start-screen'));
    }

    // User Info Form Logic
    const submitUserBtn = document.getElementById('submit-user-btn');
    const btnNewUser = document.getElementById('btn-new-user');
    const btnExistingUser = document.getElementById('btn-existing-user');
    const nameError = document.getElementById('name-error');
    const ageGroup = document.getElementById('age-group');
    const infoText = document.getElementById('info-text');

    let isNewUser = true;

    if (btnNewUser && btnExistingUser) {
        const nameInput = document.getElementById('user-name'); // Get input reference

        btnNewUser.onclick = () => {
            isNewUser = true;
            btnNewUser.classList.add('active-type');
            btnNewUser.style.background = '#4ecdc4';
            btnExistingUser.classList.remove('active-type');
            btnExistingUser.style.background = '#555';
            ageGroup.style.display = 'block';
            submitUserBtn.innerText = "START GAME";
            infoText.innerText = "Create a unique identity to start.";
            nameError.style.display = 'none';

            // Clear input for fresh start
            if (nameInput) {
                nameInput.value = '';
                nameInput.placeholder = "Enter Unique Username";
                nameInput.focus();
            }
        };

        btnExistingUser.onclick = () => {
            isNewUser = false;
            btnExistingUser.classList.add('active-type');
            btnExistingUser.style.background = '#4ecdc4';
            btnNewUser.classList.remove('active-type');
            btnNewUser.style.background = '#555';
            ageGroup.style.display = 'none'; // Age not needed for login
            submitUserBtn.innerText = "CONTINUE";
            infoText.innerText = "Enter your username to resume.";
            nameError.style.display = 'none';

            // Clear input for fresh start
            if (nameInput) {
                nameInput.value = '';
                nameInput.placeholder = "Enter Your Username";
                nameInput.focus();
            }
        };
    }

    if (submitUserBtn) {
        const handleSubmit = async () => {
            const nameInput = document.getElementById('user-name');
            const ageInput = document.getElementById('user-age');

            const name = nameInput.value.trim();
            const age = ageInput.value.trim();
            nameError.style.display = 'none';
            nameError.innerText = "";

            if (!name) {
                nameError.innerText = "Please enter your username.";
                nameError.style.display = 'block';
                return;
            }

            if (isNewUser && !age) {
                alert("Please enter your age.");
                return;
            }

            // Check Database
            submitUserBtn.disabled = true;
            submitUserBtn.innerText = "CHECKING...";

            const userExists = await checkUserExists(name);

            if (isNewUser) {
                if (userExists) {
                    nameError.innerText = "Name already exists, try another.";
                    nameError.style.display = 'block';
                    submitUserBtn.disabled = false;
                    submitUserBtn.innerText = "START GAME";
                    return;
                }

                // NEW USER: Immediately create in Supabase
                submitUserBtn.innerText = "CREATING...";
                // Insert with 0 score to reserve name
                const result = await submitScore(name, 0);
                if (!result.success) {
                    const err = result.error;
                    const msg = (err && err.message) ? err.message : "Unknown Network Error";
                    const code = (err && err.code) ? err.code : "000";

                    alert(`Database Error: ${msg}\nCode: ${code}\n\nHint: Did you run the SQL to fix permissions?`);

                    submitUserBtn.disabled = false;
                    submitUserBtn.innerText = "START GAME";
                    return;
                }

                // CLEAR OLD DATA FOR THIS SPECIFIC NAME (in case it exists locally but not in DB)
                localStorage.removeItem(`spidy_max_level_${name}`);
                localStorage.removeItem(`spidy_level_scores_${name}`);
                localStorage.removeItem(`spidy_level_stars_${name}`);
                STATE.maxUnlocked = 1;

            } else {
                // Existing User
                if (!userExists) {
                    nameError.innerText = "User not found. Check spelling or create new.";
                    nameError.style.display = 'block';
                    submitUserBtn.disabled = false;
                    submitUserBtn.innerText = "CONTINUE";
                    return;
                }
            }

            // Success - Proceed
            submitUserBtn.innerText = "CONNECTING...";

            setTimeout(() => {
                try {
                    const userData = {
                        name: name,
                        age: isNewUser ? age : 'Unknown', // Keep unknown if logging in without fetching
                        joined: new Date().toISOString()
                    };
                    localStorage.setItem('spidy_user_data', JSON.stringify(userData));
                } catch (e) {
                    console.warn("Storage failed", e);
                }
                // Proceed to Game (Start Screen)

                // REFRESH STATE FOR THE LOGGED IN USER
                if (isNewUser) {
                    STATE.maxUnlocked = 1;
                } else {
                    STATE.maxUnlocked = parseInt(getSafeItem('spidy_max_level')) || 1;
                }

                // Configure Buttons based on User Type
                const startBtn = document.getElementById('start-btn');
                const continueBtn = document.getElementById('continue-btn');

                if (startBtn && continueBtn) {
                    // Both go to Level Select as requested
                    startBtn.onclick = showLevelSelect;
                    continueBtn.onclick = showLevelSelect;

                    if (isNewUser) {
                        // New User -> Show NEW GAME, Hide CONTINUE
                        startBtn.style.display = 'block';
                        continueBtn.style.display = 'none';

                        // Reset progress for ACTUALLY new users? 
                        // User didn't ask to wipe data, but "New Game" implies it.
                        // For now, just UI change.
                    } else {
                        // Existing User -> Show CONTINUE, Hide NEW GAME
                        startBtn.style.display = 'none';
                        continueBtn.style.display = 'block';
                    }
                }

                showScreen(document.getElementById('start-screen'));
            }, 500);
        };

        submitUserBtn.onclick = handleSubmit;

        const nameInput = document.getElementById('user-name');
        const onEnter = (e) => {
            if (e.key === 'Enter') handleSubmit();
        };
        if (nameInput) nameInput.addEventListener('keypress', onEnter);
    }
}

function startGame() {
    // Start game button -> goes to level select now
    showLevelSelect();
}

function loadLevel(lvlIdx) {
    // Play Background Music
    try {
        if (SOUNDS.back.paused) {
            SOUNDS.back.play().catch(e => console.warn("BG play fail", e));
        }
    } catch (e) { }

    if (lvlIdx > LEVELS.length) {
        showFinalVictory();
        return;
    }

    const config = LEVELS[lvlIdx - 1];

    // Reset Player
    player.x = 50;
    player.y = canvas.height - 150;
    player.vx = 0;
    player.vy = 0;

    // Build Platforms (Relative to Absolute)
    const floor = { x: 0, y: canvas.height - 40, w: canvas.width, h: 60, type: 'floor' };
    currentPlatforms = [floor];

    config.platforms.forEach(p => {
        currentPlatforms.push({
            x: p.rx * canvas.width,
            y: p.ry * canvas.height,
            w: p.rw * canvas.width,
            h: p.rh * canvas.height,
            origX: p.rx * canvas.width,
            moveX: p.moveX || false,
            range: (p.range || 0) * canvas.width,
            speed: (p.speed || 0) * canvas.width,
            phase: 0
        });
    });

    // Build Hazards
    currentHazards = [];
    config.hazards.forEach(h => {
        if (h.type === 'rain') {
            for (let i = 0; i < h.count; i++) {
                currentHazards.push({
                    type: 'falling',
                    x: Math.random() * canvas.width,
                    y: Math.random() * -500,
                    w: 30, h: 30,
                    dy: h.speed + Math.random(),
                    color: '#ff6600'
                });
            }
        } else {
            currentHazards.push({
                ...h,
                x: h.rx * canvas.width,
                y: h.ry * canvas.height,
                w: h.rw * canvas.width,
                h: h.rh * canvas.height,
                origX: h.rx * canvas.width,
                range: (h.range || 0) * canvas.width,
                speed: (h.speed || 0) * canvas.width,
                phase: 0
            });
        }
    });

    spawnCitizens();

    // UI Updates
    document.getElementById('level-title').innerText = `Level ${lvlIdx}`;
    hideScreens();
    document.getElementById('home-btn').style.display = 'block'; // Ensure home button is back
    updateHUD();
}

function spawnCitizens() {
    // Pick 3 random platforms (excluding ground if possible, but fallback to ground)
    const available = currentPlatforms.filter(p => p.type !== 'floor');
    const targets = available.length >= 3 ? available : currentPlatforms;

    // Shuffle
    const shuffled = [...targets].sort(() => Math.random() - 0.5);

    // Create citizen entities
    STATE.citizens = [
        { name: "Kid", img: ASSETS.kid, priority: 1, timer: 0 },
        { name: "Old Lady", img: ASSETS.old, priority: 2, timer: 0 },
        { name: "Girl", img: ASSETS.girl, priority: 3, timer: 0 }
    ].map((c, i) => {
        const plat = shuffled[i % shuffled.length];

        // Initial Position (Center)
        let cx = plat.x + plat.w / 2 - 25;
        let cy = plat.y - 50;
        let cw = 50;
        let ch = 50;

        // Collision Check vs Hazards
        // Simple heuristic: If hazard is 'on' this platform (approx similar y), avoid its x-range
        const hazardOnPlat = currentHazards.find(h =>
            Math.abs((h.y + h.h) - plat.y) < 10 && // Hazard is sitting on this platform surface
            h.x < cx + cw && h.x + h.w > cx // Overlaps horizontally
        );

        if (hazardOnPlat) {
            // Hazard found at center! Shift citizen.
            // Try Left edge
            if (hazardOnPlat.x > plat.x + 30) {
                cx = plat.x + 10;
            }
            // Else Try Right edge
            else {
                cx = plat.x + plat.w - 60;
            }
        }

        return {
            ...c,
            x: cx,
            y: cy,
            w: cw, h: ch,
            rescued: false
        };
    });

    STATE.rescueOrder = [];
    updateHUD();
}

/* ---------- Loop ---------- */
function loop() {
    // If paused or not active, we still request frame to keep loop alive for resume
    // BUT we only update/draw if active & not paused
    if (STATE.active && !STATE.paused) {
        try {
            update();
            draw();
            STATE.frame++;
        } catch (e) {
            STATE.active = false;
            console.error(e);
            // alert("Game Loop Error:\n" + e.name + ": " + e.message + "\n" + e.stack);
        }
    }

    if (STATE.active || STATE.paused) {
        window.gameLoopID = requestAnimationFrame(loop);
    }
}

function update() {
    // --- Player Physics ---
    // Horizontal
    player.vx = 0;
    if (keys['ArrowLeft'] || keys['a']) player.vx = -SETTINGS.speed;
    if (keys['ArrowRight'] || keys['d']) player.vx = SETTINGS.speed;

    player.x += player.vx;

    // Wall bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;

    // Vertical
    player.vy += GRAVITY;
    if (player.vy > TERMINAL_VELOCITY) player.vy = TERMINAL_VELOCITY;
    player.y += player.vy;

    // Jump
    if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && player.onGround) {
        player.vy = getJumpForce();
        player.onGround = false;
    }

    // --- Platforms ---
    player.onGround = false;
    currentPlatforms.forEach(p => {
        // Moving platforms
        if (p.moveX) {
            p.phase += 0.02; // tick
            p.x = p.origX + Math.sin(p.phase) * p.range;
        }

        // Collision (simple AABB + one-way check)
        // Only land if falling downwards and above the platform
        if (player.vy >= 0 &&
            player.x + player.w > p.x + 5 &&
            player.x < p.x + p.w - 5 &&
            player.y + player.h > p.y &&
            player.y + player.h < p.y + p.h + player.vy + 2) {

            player.y = p.y - player.h;
            player.vy = 0;
            player.onGround = true;
            // Move with platform
            // if(p.moveX) player.x += (Math.sin(p.phase) * p.range) - (Math.sin(p.phase - 0.02) * p.range);
        }
    });

    // Floor fail-safe
    if (player.y > canvas.height) {
        die();
    }

    // --- Hazards ---
    currentHazards.forEach(h => {
        let hit = false;

        if (h.type === 'static' || h.type === 'spike') {
            if (rectIntersect(player, h)) hit = true;
        }
        else if (h.type === 'fire') {
            // Flickering height effect for hitbox? 
            // Keep hitbox constant, visual flickers.
            if (rectIntersect(player, h)) hit = true;
        }
        else if (h.type === 'patrol') {
            h.phase += 0.02;
            h.x = h.origX + Math.sin(h.phase) * h.range;
            if (rectIntersect(player, h)) hit = true;
        }
        else if (h.type === 'bee') {
            h.phase += h.speed || 0.05;
            // Bobbing Y motion + Horizontal patrol
            h.x = h.origX + Math.sin(h.phase) * h.range;
            h.y = (h.ry * canvas.height) + Math.sin(h.phase * 2) * 20; // Bobbing
            if (rectIntersect(player, h)) hit = true;
        }
        else if (h.type === 'saw') {
            // Move in a circle or back/forth like patrol but faster/different
            h.phase += h.speed || 0.05;
            // Circular motion or horizontal? Let's do horizontal for now, but faster rotation visual
            if (h.range) {
                h.x = h.origX + Math.sin(h.phase) * h.range;
            }
            if (rectIntersect(player, h)) hit = true;
        }
        else if (h.type === 'laser') {
            // Blinking logic
            const cycle = STATE.frame % h.period;
            const active = cycle < h.period / 2;
            h.isActive = active;
            if (active && rectIntersect(player, h)) hit = true;
        }
        else if (h.type === 'falling') {
            h.y += h.dy;
            if (h.y > canvas.height) {
                h.y = -50;
                h.x = Math.random() * (canvas.width - 50);
            }
            if (rectIntersect(player, h)) hit = true;
        }

        if (hit) die();
    });

    // --- Citizens ---
    STATE.citizens.forEach(c => {
        if (!c.rescued && rectIntersect(player, c)) {
            c.rescued = true;
            c.endTime = STATE.time;
            STATE.rescueOrder.push(c.name);

            // Scoring Logic
            // Check if there were any LOWER priority (priority < c.priority) that were NOT rescued yet
            // Priority 1 is highest/first.
            const missedHigherPriority = STATE.citizens.some(other => !other.rescued && other.priority < c.priority);

            let points = 500; // Correct order
            let status = "Rescued";
            if (missedHigherPriority) {
                points = 300; // Wrong order
                status = "Wrong Order";
            }
            c.rescueStatus = status;
            c.rescuePoints = points;

            STATE.levelScore += points;
            STATE.score = STATE.levelScore; // Keep legacy synced

            updateHUD();
            checkLevelComplete();
        }
    });
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    // Background
    const currentLevelConfig = LEVELS[STATE.level - 1];
    const bgKey = (currentLevelConfig && currentLevelConfig.background) ? currentLevelConfig.background : 'back';
    const bgImg = ASSETS[bgKey];

    if (bgImg && bgImg.complete) {
        // Increased from 0.6 to 0.9 for better brightness as requested
        ctx.globalAlpha = 0.9;
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    }

    // Platforms
    ctx.fillStyle = '#4a5568';
    currentPlatforms.forEach(p => {
        // Gradient or texture could go here
        ctx.fillStyle = p.type === 'floor' ? '#2d3748' : '#2b6cb0';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'black';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.shadowBlur = 0;

        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(p.x, p.y, p.w, 4);
    });

    // Hazards
    currentHazards.forEach(h => {
        if (h.type === 'falling') { // Green Acid / Venom
            ctx.fillStyle = '#48bb78'; // Green
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#48bb78';
            ctx.beginPath();
            ctx.arc(h.x, h.y, h.w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            // Droplet tail
            ctx.beginPath();
            ctx.moveTo(h.x, h.y - h.w / 2);
            ctx.lineTo(h.x, h.y - h.w * 1.5);
            ctx.strokeStyle = '#48bb78';
            ctx.stroke();
        }
        else if (h.type === 'fire') {
            // Fire Effect
            const flicker = Math.random() * 10;
            ctx.fillStyle = `rgba(237, 137, 54, ${0.7 + Math.random() * 0.3})`; // Orange flickering
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ed8936';

            ctx.beginPath();
            ctx.moveTo(h.x, h.y + h.h);
            ctx.lineTo(h.x + h.w / 4, h.y + flicker);
            ctx.lineTo(h.x + h.w / 2, h.y + h.h / 2 + flicker); // Dip
            ctx.lineTo(h.x + h.w * 0.75, h.y + flicker);
            ctx.lineTo(h.x + h.w, h.y + h.h);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        else if (h.type === 'saw') {
            ctx.save();
            ctx.translate(h.x + h.w / 2, h.y + h.h / 2);
            ctx.rotate(STATE.frame * 0.2); // Spin

            // Enhanced Saw Visuals
            ctx.fillStyle = '#cbd5e0'; // Brighter Silver
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#e53e3e'; // Red Danger Glow

            // Draw Saw Circle
            ctx.beginPath();
            ctx.arc(0, 0, h.w / 2, 0, Math.PI * 2);
            ctx.fill();

            // Teeth - More aggressive look
            ctx.strokeStyle = '#ff0000'; // Pure Red
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 3]); // Better jagged look
            ctx.stroke();

            // Inner Metallic Detail
            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.arc(0, 0, h.w / 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
        else if (h.type === 'laser') {
            if (h.isActive) {
                ctx.fillStyle = '#fc8181';
                ctx.fillRect(h.x, h.y, h.w, h.h);
                // Core
                ctx.fillStyle = '#fff5f5';
                ctx.fillRect(h.x + 2, h.y, h.w - 4, h.h);
            } else {
                ctx.fillStyle = 'rgba(252, 129, 129, 0.1)';
                ctx.fillRect(h.x, h.y, h.w, h.h);
            }
        }
        else if (h.type === 'patrol') {
            // Drone / Enemy Spider
            ctx.fillStyle = '#1a202c';
            ctx.beginPath();
            ctx.arc(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, 0, Math.PI * 2);
            ctx.fill();

            // Red Eye
            ctx.fillStyle = '#f56565';
            ctx.beginPath();
            ctx.arc(h.x + h.w / 2, h.y + h.h / 2, h.w / 4, 0, Math.PI * 2);
            ctx.fill();

            // Scanner beam
            ctx.fillStyle = 'rgba(245, 101, 101, 0.2)';
            ctx.beginPath();
            ctx.moveTo(h.x + h.w / 2, h.y + h.h / 2);
            ctx.lineTo(h.x + h.w / 2 - 15, h.y + h.h + 20);
            ctx.lineTo(h.x + h.w / 2 + 15, h.y + h.h + 20);
            ctx.fill();
        }

        else if (h.type === 'bee') {
            // Bee Body (3D Effect)
            ctx.save();
            ctx.translate(h.x + h.w / 2, h.y + h.h / 2);
            if (Math.cos(h.phase) > 0) ctx.scale(-1, 1); // Face direction

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 15, h.w / 2.5, h.h / 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body Gradient (Yellow/Gold)
            const gradBody = ctx.createRadialGradient(-5, -5, 2, 0, 0, h.w / 2);
            gradBody.addColorStop(0, '#fefcbf'); // Highlight
            gradBody.addColorStop(0.5, '#ecc94b'); // Base
            gradBody.addColorStop(1, '#b7791f'); // Shadow

            ctx.fillStyle = gradBody;
            ctx.beginPath();
            ctx.ellipse(0, 0, h.w / 2, h.h / 2.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Stripes (Curved for 3D)
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#1a202c';
            ctx.beginPath();
            ctx.arc(0, 0, h.h / 2.5, -Math.PI / 3, Math.PI / 3); // Center stripe
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(-8, 0, h.h / 2.8, -Math.PI / 3, Math.PI / 3); // Rear stripe
            ctx.stroke();

            // Wings (Semi-transparent + Blur)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 5;

            const wingY = Math.sin(STATE.frame * 0.8) * 8;

            // Fore wing
            ctx.beginPath();
            ctx.ellipse(5, -12 + wingY, 10, 6, 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Hind wing
            ctx.beginPath();
            ctx.ellipse(-5, -12 + wingY, 8, 5, -0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0; // Reset

            // Eye
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(h.w / 3, -5, 3, 0, Math.PI * 2);
            ctx.fill();
            // Eye Glint
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(h.w / 3 + 1, -6, 1, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
        else {
            // Spikes (Static)
            ctx.fillStyle = '#718096';
            ctx.beginPath();
            ctx.moveTo(h.x, h.y + h.h);
            ctx.lineTo(h.x + h.w / 2, h.y);
            ctx.lineTo(h.x + h.w, h.y + h.h);
            ctx.fill();
        }
    });

    // Citizens
    STATE.citizens.forEach(c => {
        if (!c.rescued && c.img.complete) {
            // Floating effect
            const floatY = Math.sin(STATE.frame * 0.05) * 5;
            ctx.drawImage(c.img, c.x, c.y + floatY, c.w, c.h);

            // Marker
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.fillText(c.priority, c.x + 20, c.y - 10 + floatY);
        }
    });

    // Player
    if (ASSETS.spider.complete) {
        ctx.drawImage(ASSETS.spider, player.x, player.y, player.w, player.h);
    } else {
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }
}

/* ---------- Helpers ---------- */
function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w ||
        r2.x + r2.w < r1.x ||
        r2.y > r1.y + r1.h ||
        r2.y + r2.h < r1.y);
}

const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);
// Fix: Clear keys when window loses focus (e.g. clicking iframe or switching tabs)
window.addEventListener('blur', () => {
    for (let k in keys) delete keys[k];
});

function die() {
    // Race Condition Fixes
    if (!STATE.active) return;

    // Throttle deaths to avoid double-play or double-life-loss in same frame
    const now = Date.now();
    if (now - STATE.lastDeath < 200) return;
    STATE.lastDeath = now;

    // Play heart loss sound (IMMEDIATE)
    if (SETTINGS.sfxEnabled) {
        try {
            const s = SOUNDS.fahh;
            s.pause(); // Reset if already playing
            s.currentTime = 0;
            s.play();
        } catch (e) {
            console.warn("Audio play failed", e);
        }
    }

    STATE.lives--;
    updateHUD();

    if (STATE.lives <= 0) {
        setTimeout(() => {
            try {
                SOUNDS.back.pause();
                SOUNDS.back.currentTime = 0;

                if (SETTINGS.sfxEnabled) {
                    SOUNDS.wasted.currentTime = 0;
                    SOUNDS.wasted.play();
                }
            } catch (e) {
                console.warn("Wasted audio play failed", e);
            }
        }, 500); // 0.5s delay

        // Add GTA Grayscale Effect
        document.getElementById('gameCanvas').classList.add('grayscale-filter');
        document.getElementById('hud').classList.add('grayscale-filter');

        // Show Wasted Overlay
        showScreen(document.getElementById('wasted-overlay'));

        STATE.active = false;

        // Delay standard Game Over menu
        setTimeout(() => {
            showGameOver();
        }, 2500); // 2.5s delay to let Wasted sink in

    } else {
        // Respawn
        player.x = 50;
        player.y = canvas.height - 150;
        player.vx = 0;
        player.vy = 0;
    }
}

function checkLevelComplete() {
    const allRescued = STATE.citizens.every(c => c.rescued);
    if (!allRescued) return;

    // Victory Logic
    STATE.active = false;

    // --- Calculate Score & Stars based on Order ---
    // Expected Order: Priority 1 -> 2 -> 3
    // Get sorted citizens by priority to know who should have been rescued 1st, 2nd, 3rd.
    // In our case, we just check if rescueOrder matches the priority order.

    // Check match count
    // The rescueOrder array contains names in the order they were rescued.
    // We check if STATE.citizens (sorted by priority) matches this list.
    const expected = [...STATE.citizens].sort((a, b) => a.priority - b.priority);

    let correctSequenceCount = 0;
    for (let i = 0; i < STATE.rescueOrder.length; i++) {
        const rescuedName = STATE.rescueOrder[i];
        const citizenObj = STATE.citizens.find(c => c.name === rescuedName);
        const expectedObj = expected[i];

        if (citizenObj && expectedObj && citizenObj.priority === expectedObj.priority) {
            correctSequenceCount++;
        }
    }

    // New Rules:
    // Perfect Order (3 matches) = 500 Pts
    // Otherwise = 300 Pts

    let stars = 1;
    if (correctSequenceCount === 3) stars = 3;
    else if (correctSequenceCount === 2) stars = 2;

    // Flat Score Assignment
    if (correctSequenceCount === 3) {
        STATE.levelScore = 500;
    } else {
        STATE.levelScore = 300;
    }
    STATE.score = STATE.levelScore; // Sync legacy

    // Save Score for this level
    const storedScores = JSON.parse(getSafeItem('spidy_level_scores') || '{}');
    // Only overwrite if better
    if (!storedScores[STATE.level] || STATE.levelScore > storedScores[STATE.level]) {
        storedScores[STATE.level] = STATE.levelScore;
        setSafeItem('spidy_level_scores', JSON.stringify(storedScores));
    }

    // Unify Total Score for Leaderboard
    let totalScore = 0;
    Object.values(storedScores).forEach(s => totalScore += s);

    // Save Stars to LocalStorage
    const storedStars = JSON.parse(getSafeItem('spidy_level_stars') || '{}');
    if (!storedStars[STATE.level] || stars > storedStars[STATE.level]) {
        storedStars[STATE.level] = stars;
        setSafeItem('spidy_level_stars', JSON.stringify(storedStars));
    }

    // Unlock next level
    if (STATE.level >= STATE.maxUnlocked && STATE.level < LEVELS.length) {
        STATE.maxUnlocked = STATE.level + 1;
        setSafeItem('spidy_max_level', STATE.maxUnlocked);
    }

    // --- LEADERBOARD UPDATE ---
    // Submit the TOTAL score to Supabase immediately
    const userData = JSON.parse(localStorage.getItem('spidy_user_data') || '{}');
    const playerName = userData.name || "Anonymous";

    // We don't await here to avoid delaying the UI, or we can just let it run in bg
    submitScore(playerName, totalScore).then(res => {
        if (res.success) console.log("Leaderboard updated via Level Complete");
    });

    // Accumulate Total Score (Session)
    STATE.totalScore += STATE.levelScore;

    showLevelSummary(stars);
}

/* ---------- UI Management ---------- */
function setupUI() {
    // Start -> Level Select
    document.getElementById('start-btn').onclick = showLevelSelect;

    // Continue Button Logic
    const continueBtn = document.getElementById('continue-btn');
    const savedLevel = STATE.maxUnlocked; // already loaded from localStorage in STATE definition

    if (savedLevel > 1) {
        continueBtn.style.display = 'block';
        // document.getElementById('continue-lvl').innerText = savedLevel; 

        continueBtn.onclick = () => {
            startLevel(savedLevel);
        };
    }

    // Back -> Start
    document.getElementById('back-to-menu-btn').onclick = () => {
        showScreen(document.getElementById('start-screen'));
    };

    // Toggle Pause
    document.getElementById('home-btn').onclick = () => {
        if (!STATE.active) return; // Only pause if active
        STATE.paused = true;
        showScreen(document.getElementById('pause-screen'));
    };

    // Resume
    document.getElementById('resume-btn').onclick = () => {
        STATE.paused = false;
        hideScreens();

        // Fix: Reset Player Velocity to prevent "stuck" movement
        if (typeof player !== 'undefined') {
            player.vx = 0;
            player.vy = 0;
        }
        // Fix: Reset Keys if they exist globally
        if (typeof keys !== 'undefined') {
            for (let k in keys) delete keys[k];
        } else if (typeof input !== 'undefined' && input.keys) {
            // backup guess
            input.keys = {};
        }

        // Force show home button since game is resuming
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.classList.remove('hidden');
            homeBtn.style.display = 'block';
        }
    };

    // Pause -> Restart
    document.getElementById('pause-restart-btn').onclick = () => {
        STATE.paused = false;

        // Reset Inputs
        if (typeof keys !== 'undefined') for (let k in keys) delete keys[k];

        startLevel(STATE.level);
    };

    // Pause -> Main Menu (Level Select)
    document.getElementById('main-menu-btn').onclick = () => {
        STATE.active = false;
        STATE.paused = false;
        showLevelSelect();
    };

    // Pause -> Settings
    document.getElementById('settings-btn').onclick = () => {
        showScreen(document.getElementById('settings-screen'));
    };

    // --- Settings Sliders ---
    const speedSlider = document.getElementById('speed-slider');
    const jumpSlider = document.getElementById('jump-slider');
    const speedVal = document.getElementById('speed-val');
    const jumpVal = document.getElementById('jump-val');

    // Init Values
    speedSlider.value = SETTINGS.speed;
    speedVal.innerText = SETTINGS.speed;
    jumpSlider.value = SETTINGS.jumpForce;
    jumpVal.innerText = SETTINGS.jumpForce;

    // Listeners
    speedSlider.oninput = (e) => {
        SETTINGS.speed = parseInt(e.target.value);
        speedVal.innerText = SETTINGS.speed;
        localStorage.setItem('spidy_speed', SETTINGS.speed);
    };

    jumpSlider.oninput = (e) => {
        SETTINGS.jumpForce = parseInt(e.target.value);
        jumpVal.innerText = SETTINGS.jumpForce;
        localStorage.setItem('spidy_jump', SETTINGS.jumpForce);
    };

    // --- Audio Toggles ---
    const musicToggle = document.getElementById('bg-music-toggle');
    const sfxToggle = document.getElementById('sfx-toggle');

    if (musicToggle) {
        musicToggle.checked = SETTINGS.musicEnabled;
        musicToggle.onchange = (e) => {
            SETTINGS.musicEnabled = e.target.checked;
            localStorage.setItem('spidy_music', SETTINGS.musicEnabled);
            updateAudioSettings();
        };
    }

    if (sfxToggle) {
        sfxToggle.checked = SETTINGS.sfxEnabled;
        sfxToggle.onchange = (e) => {
            SETTINGS.sfxEnabled = e.target.checked;
            localStorage.setItem('spidy_sfx', SETTINGS.sfxEnabled);
        };
    }

    // Reset Defaults
    document.getElementById('reset-settings-btn').onclick = () => {
        SETTINGS.speed = 8;
        SETTINGS.jumpForce = 22;

        speedSlider.value = 8;
        speedVal.innerText = 8;
        jumpSlider.value = 22;
        jumpVal.innerText = 22;

        localStorage.setItem('spidy_speed', 8);
        localStorage.setItem('spidy_jump', 22);

        // Audio Resets
        SETTINGS.musicEnabled = true;
        SETTINGS.sfxEnabled = true;
        if (musicToggle) musicToggle.checked = true;
        if (sfxToggle) sfxToggle.checked = true;
        localStorage.setItem('spidy_music', true);
        localStorage.setItem('spidy_sfx', true);
        updateAudioSettings();
    };
    // ------------------------

    // Close Settings
    document.getElementById('close-settings-btn').onclick = () => {
        hideScreens();
        if (STATE.active) {
            // If game is active, go back to Pause Screen
            showScreen(document.getElementById('pause-screen'));
        } else {
            // If in menu, go back to start
            showScreen(document.getElementById('start-screen'));
        }
    };

    // Open Leaderboard
    document.getElementById('open-leaderboard-btn').onclick = () => {
        renderLeaderboard();
        showScreen(document.getElementById('leaderboard-screen'));
    };

    // Close Leaderboard
    document.getElementById('close-leaderboard-btn').onclick = showLevelSelect;
}

function setupMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    if (!mobileControls) return;

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump');

    const handleTouch = (key, active) => {
        keys[key] = active;
    };

    if (btnLeft) {
        btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch('ArrowLeft', true); });
        btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); handleTouch('ArrowLeft', false); });
    }
    if (btnRight) {
        btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch('ArrowRight', true); });
        btnRight.addEventListener('touchend', (e) => { e.preventDefault(); handleTouch('ArrowRight', false); });
    }
    if (btnJump) {
        btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch('ArrowUp', true); });
        btnJump.addEventListener('touchend', (e) => { e.preventDefault(); handleTouch('ArrowUp', false); });
    }
}

/* ---------- Leaderboard Logic ---------- */
// Removed generateLeaderboardData as we now use Supabase

async function renderLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    if (!listEl) return;

    listEl.innerHTML = '<div style="color: #fff; text-align: center; padding: 20px;">Loading...</div>'; // Loading state

    // Fetch from Supabase
    const data = await fetchLeaderboard();

    listEl.innerHTML = ''; // Clear loading

    // Create fragment for performance
    const fragment = document.createDocumentFragment();

    data.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = 'lb-item';

        // Highlight top 3
        let rankColor = '#a0c4ff';
        if (index === 0) rankColor = '#ffd700'; // Gold
        if (index === 1) rankColor = '#c0c0c0'; // Silver
        if (index === 2) rankColor = '#cd7f32'; // Bronze

        item.innerHTML = `
            <span class="lb-rank" style="color: ${rankColor}">${index + 1}</span>
            <span class="lb-name">${p.name}</span>
            <span class="lb-score">${p.score}</span>
        `;
        fragment.appendChild(item);
    });

    if (data.length === 0) {
        listEl.innerHTML = '<div style="color: #aaa; text-align: center; padding: 20px;">No scores yet. Be the first!</div>';
    } else {
        listEl.appendChild(fragment);
    }
}

function showLevelSelect() {
    hideScreens();
    const screen = document.getElementById('level-select-screen');
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';

    // Refresh Latest State for Current User
    STATE.maxUnlocked = parseInt(getSafeItem('spidy_max_level')) || 1;

    // Display Current Player Name
    const levelTitle = screen.querySelector('.level-title');
    if (levelTitle) {
        const userName = getCurrentUser();
        levelTitle.innerText = `SELECT LEVEL - ${userName.toUpperCase()}`;
    }

    // Render Leaderboard
    renderLeaderboard();

    // Get Scores
    const storedScores = JSON.parse(getSafeItem('spidy_level_scores') || '{}');

    // Generate 100 Level Slots
    for (let i = 1; i <= 100; i++) {
        const lvlNum = i;
        const btn = document.createElement('div');
        btn.className = 'level-btn';

        // Playable Levels (Present in LEVELS array)
        if (i <= LEVELS.length) {
            let content = `<span>${lvlNum}</span>`;

            if (lvlNum > STATE.maxUnlocked) {
                btn.classList.add('locked');
                content = '🔒';
            } else {
                btn.onclick = () => {
                    startLevel(lvlNum);
                };

                // Show Score if earned
                if (storedScores[lvlNum]) {
                    const s = storedScores[lvlNum];
                    content += `<div class="level-stars" style="color: #ffd700; font-size: 0.8rem; letter-spacing: 0;">SCORE: ${s}</div>`;
                }
            }
            btn.innerHTML = content;
        }
        // Coming Soon Levels (11-100)
        else {
            btn.classList.add('locked');
            btn.style.opacity = '0.3'; // Dimmer than normal locked
            btn.innerHTML = `<div style="font-size: 0.5em; line-height: 1.2;">COMING<br>SOON</div>`;
        }

        if (lvlNum === STATE.level) {
            btn.classList.add('active-level');
        }

        grid.appendChild(btn);
    }

    showScreen(screen);
}

// Full startLevel implementation with Timer and UI resets
function startLevel(lvlIdx) {
    STATE.level = lvlIdx;
    STATE.active = true;
    STATE.paused = false;
    // Manage Scores
    if (typeof STATE.totalScore === 'undefined') STATE.totalScore = 0; // Session total
    STATE.levelScore = 0; // Current Level

    // Legacy support if using STATE.score elsewhere, map it to levelScore primarily
    STATE.score = 0;

    STATE.lives = 3;

    // Remove Grayscale if present
    document.getElementById('gameCanvas').classList.remove('grayscale-filter');
    document.getElementById('hud').classList.remove('grayscale-filter');

    // Hide Wasted Overlay if present
    const wasted = document.getElementById('wasted-overlay');
    if (wasted) wasted.classList.add('hidden');

    // Show Home Button safely
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.classList.remove('hidden');
        homeBtn.style.display = 'block';
    }

    // Timer Logic
    if (window.gameTimer) clearInterval(window.gameTimer);
    STATE.time = 0;

    window.gameTimer = setInterval(() => {
        if (!STATE.active || STATE.paused) return;
        STATE.time++;
    }, 1000);

    // Fix: Prevent Double Game Loop
    if (window.gameLoopID) cancelAnimationFrame(window.gameLoopID);

    loadLevel(lvlIdx);
    loop();
    updateHUD();
}

// Next Level
document.getElementById('next-level-btn').onclick = () => {
    STATE.level++;
    startLevel(STATE.level);
};

// Retry (Restart CURRENT level from Game Over / Win)
document.getElementById('retry-btn').onclick = () => {
    startLevel(STATE.level);
};

// Victory -> Restart Game (Back to Level Select)
document.getElementById('restart-btn').onclick = showLevelSelect;





function updateHUD() {
    document.getElementById('hud-lives').innerText = '❤️'.repeat(STATE.lives);
    // Score removed from HUD
    const next = STATE.citizens.find(c => !c.rescued);
    document.getElementById('hud-next').innerText = next ? `${next.name}` : "All Clear";
}

function showLevelSummary() {
    const modal = document.getElementById('level-screen');
    const table = document.getElementById('summary-table-body');
    table.innerHTML = '';

    STATE.citizens.forEach(c => {
        // Status is always "Rescued"
        // Color depends on points: 500 = Green (Correct), 300 = Orange (Wrong)
        const isPerfect = c.rescuePoints === 500;
        const color = isPerfect ? "#48bb78" : "#ed8936";
        const subText = isPerfect ? "Correct Order" : "Wrong Order";

        const row = `<tr>
            <td>${c.name}</td>
            <td>${c.priority}</td>
            <td style="color: ${color}; font-weight: bold;">
                <div>Rescued</div>
                <div style="font-size: 0.8rem; color: #cbd5e0; margin-top: 2px;">${subText}</div>
            </td>
        </tr>`;
        table.innerHTML += row;
    });

    document.getElementById('level-score-disp').innerHTML =
        `<div>Level Complete!</div>
         <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px;">
            <div>
                <div style="font-size: 0.8em; opacity: 0.8;">LEVEL SCORE</div>
                <div style="color: #4ecdc4; font-size: 1.5rem;">${STATE.levelScore || 0}</div>
            </div>
         </div>`;

    showScreen(modal);
}

// Ensure global listeners are active
// Restart Level (Summary Screen)
const restartBtn = document.getElementById('restart-level-btn');
if (restartBtn) {
    restartBtn.onclick = () => {
        startLevel(STATE.level);
    };
}


async function showGameOver() {
    // Score display removed from UI per request
    // document.getElementById('final-score').innerText = STATE.score;

    // Main Menu Button Logic
    const menuBtn = document.getElementById('game-over-menu-btn');
    if (menuBtn) {
        menuBtn.onclick = () => {
            STATE.active = false;
            STATE.paused = false;
            showLevelSelect();
        };
    }

    // Submit Score
    const localUser = localStorage.getItem('spidy_user_data');
    let userName = "Anonymous";
    if (localUser) {
        try {
            const u = JSON.parse(localUser);
            if (u.name) userName = u.name;
        } catch (e) { }
    }
    await submitScore(userName, STATE.score);

    showScreen(document.getElementById('game-over-screen'));
}

async function showFinalVictory() {
    STATE.active = false; // Stop the game loop
    STATE.paused = false;

    // Calculate Total Score from all levels
    let totalScore = 0;
    try {
        const storedScores = JSON.parse(getSafeItem('spidy_level_scores') || '{}');
        totalScore = Object.values(storedScores).reduce((a, b) => a + b, 0);
    } catch (e) { }

    document.getElementById('final-score-win').innerText = totalScore;

    // Submit Score (Final Victory)
    const localUser = localStorage.getItem('spidy_user_data');
    let userName = "Anonymous";
    if (localUser) {
        try {
            const u = JSON.parse(localUser);
            if (u.name) userName = u.name;
        } catch (e) { }
    }
    await submitScore(userName, totalScore);

    showScreen(document.getElementById('victory-screen'));
}

function showScreen(el) {
    if (!el) return;

    // 1. Get all screens
    const allScreens = document.querySelectorAll('.screen');

    // 2. Mark the new screen as active immediately
    // This allows it to start its fade-in/reveal and stay on top if z-index is higher
    el.classList.remove('hidden');
    el.style.display = 'flex';
    el.classList.add('active');
    el.style.opacity = '1';

    // 3. Gracefully deactivate other screens
    allScreens.forEach(s => {
        if (s !== el && s.id !== 'wasted-overlay') { // Keep wasted-overlay manual
            s.classList.remove('active');
            s.style.opacity = '0';

            // We only hide them after a delay to ensure the new one has covered the view
            // to prevent the "black blink"
            setTimeout(() => {
                if (!s.classList.contains('active')) {
                    s.classList.add('hidden');
                    s.style.display = 'none';
                }
            }, 600); // Slightly longer than the longest transition (0.5s)
        }
    });

    // Toggle Home Button Visibility
    const homeBtn = document.getElementById('home-btn');
    const mobileCtrl = document.getElementById('mobile-controls');

    if (homeBtn) {
        if (el && (el.id === 'start-screen' || el.id === 'level-select-screen' || el.id === 'victory-screen' || el.id === 'game-over-screen' || el.id === 'level-screen' || el.id === 'pause-screen' || el.id === 'user-info-screen')) {
            homeBtn.classList.add('hidden');
            homeBtn.style.display = 'none';
            if (mobileCtrl) mobileCtrl.classList.remove('visible');
        } else {
            homeBtn.style.display = 'block';
            if (isTouchDevice && mobileCtrl) mobileCtrl.classList.add('visible');
        }
    }
}

function hideScreens() {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
        s.style.display = 'none';
        s.style.opacity = '0';
    });
    // If hiding screens, we are likely playing
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.classList.remove('hidden');
        homeBtn.style.display = 'block';
    }

    const mobileCtrl = document.getElementById('mobile-controls');
    if (isTouchDevice && mobileCtrl) mobileCtrl.classList.add('visible');
}

// Initial Launch
window.onload = function () {
    try {
        init();
        // showScreen(document.getElementById('start-screen')); // Removed to let loading screen finish
    } catch (e) {
        console.error("Game Init Error:", e);
        alert("Game Init Error: " + e.message);
    }
};
