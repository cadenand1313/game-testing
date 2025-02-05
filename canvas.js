// Initialize canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Set default font for better emoji support
const defaultFont = '"Noto Color Emoji", "NotoEmoji", sans-serif';

// Game state
const gameState = {
    camera: { x: 0, y: 0 },
    player: {
        x: 100,
        y: 100,
        emoji: '🧍',
        speed: 2
    },
    tileSize: 20,
    lastFrameTime: Date.now()
};

// Biome colors and textures
const biomeProperties = {
    forest: {
        mainColor: '#2d5a27',
        transitionColor: '#3a7034',
        textureEmoji: '🌿'
    },
    mountain: {
        mainColor: '#6b6b6b',
        transitionColor: '#838383',
        textureEmoji: '🪨'
    },
    desert: {
        mainColor: '#d4b483',
        transitionColor: '#e0c49a',
        textureEmoji: '🌵'
    },
    plains: {
        mainColor: '#90b657',
        transitionColor: '#a6c76c',
        textureEmoji: '🌾'
    },
    island: {
        mainColor: '#85c17e',
        transitionColor: '#9bd394',
        textureEmoji: '🌺'
    }
};

// Set canvas dimensions to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Reset text settings after resize
    ctx.font = `20px ${defaultFont}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.imageSmoothingEnabled = false;
}

// Convert grid coordinates to screen coordinates
function gridToScreen(x, y) {
    return {
        x: Math.round(x * gameState.tileSize - gameState.camera.x),
        y: Math.round(y * gameState.tileSize - gameState.camera.y)
    };
}

// Convert screen coordinates to grid coordinates
function screenToGrid(x, y) {
    return {
        x: Math.floor((x + gameState.camera.x) / gameState.tileSize),
        y: Math.floor((y + gameState.camera.y) / gameState.tileSize)
    };
}

// Draw an emoji at specified coordinates
function drawEmoji(emoji, x, y, size = gameState.tileSize, scale = 1.0) {
    const adjustedSize = Math.round(size * scale);
    ctx.font = `${adjustedSize}px ${defaultFont}`;
    const centerX = Math.round(x + (size/2));
    const centerY = Math.round(y + (size/2));
    ctx.fillText(emoji, centerX, centerY);
}

// Get biome blend factor
function getBlendFactor(x, y) {
    return (Math.sin(x/10) * Math.cos(y/10) + 1) / 2;
}

// Render ground textures
function renderGround() {
    const startX = Math.floor(gameState.camera.x / gameState.tileSize);
    const startY = Math.floor(gameState.camera.y / gameState.tileSize);
    const endX = startX + Math.ceil(canvas.width / gameState.tileSize);
    const endY = startY + Math.ceil(canvas.height / gameState.tileSize);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (x >= 0 && x < gameGrid.width && y >= 0 && y < gameGrid.height) {
                const screen = gridToScreen(x, y);
                const currentBiome = gameGrid.getBiome(x, y);
                const biomeProps = biomeProperties[currentBiome];

                ctx.fillStyle = biomeProps.mainColor;
                ctx.fillRect(
                    Math.round(screen.x), 
                    Math.round(screen.y), 
                    gameState.tileSize, 
                    gameState.tileSize
                );

                let neighborBiomes = new Set();
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (x + dx >= 0 && x + dx < gameGrid.width && 
                            y + dy >= 0 && y + dy < gameGrid.height) {
                            neighborBiomes.add(gameGrid.getBiome(x + dx, y + dy));
                        }
                    }
                }

                if (neighborBiomes.size > 1) {
                    const blendFactor = getBlendFactor(x, y);
                    ctx.fillStyle = biomeProps.transitionColor;
                    ctx.globalAlpha = blendFactor * 0.3;
                    ctx.fillRect(
                        Math.round(screen.x), 
                        Math.round(screen.y), 
                        gameState.tileSize, 
                        gameState.tileSize
                    );
                    ctx.globalAlpha = 1;
                }

                if (gameGrid.shouldShowTexture(x, y)) {
                    drawEmoji(
                        biomeProps.textureEmoji, 
                        screen.x, 
                        screen.y, 
                        gameState.tileSize * 0.7
                    );
                }
            }
        }
    }
}

// Get object scale based on type
function getObjectScale(object) {
    const scales = {
        'mountain': 3.0,
        'small_mountain': 1.8,
        'palm_tree': 1.5
    };

    // Add random size variation for forest trees
    if (object.type === 'tree') {
        // Generate a consistent random scale based on object's position
        const hash = Math.sin(object.x * 12.9898 + object.y * 78.233) * 43758.5453;
        const consistentRandom = hash - Math.floor(hash);
        // Random scale between 0.5 and 2.0 for much more noticeable variation
        return 0.5 + consistentRandom * 1.5;
    }

    return scales[object.type] || 1.0;
}

// Get object y-offset based on type
function getObjectYOffset(object, size) {
    const offsets = {
        'mountain': -size * 0.5,
        'small_mountain': -size * 0.3
    };
    return offsets[object.type] || 0;
}

// Render game objects
function renderObjects() {
    const sortedObjects = Array.from(gameGrid.objects.values())
        .sort((a, b) => a.y - b.y);

    for (const obj of sortedObjects) {
        const screen = gridToScreen(obj.x, obj.y);
        const size = Math.round(obj.width * gameState.tileSize);
        const scale = getObjectScale(obj);
        const yOffset = getObjectYOffset(obj, size);
        drawEmoji(obj.emoji, screen.x, screen.y + yOffset, size, scale);
    }
}

// Render clouds
function renderClouds() {
    for (const cloud of gameGrid.clouds) {
        const screen = gridToScreen(cloud.x, cloud.y);
        drawEmoji(cloud.currentEmoji, screen.x, screen.y, gameState.tileSize * 3);
    }
}

// Render poops
function renderPoops() {
    for (const poop of gameGrid.poops) {
        const screen = gridToScreen(poop.x, poop.y);
        ctx.globalAlpha = poop.opacity;
        drawEmoji(poop.emoji, screen.x, screen.y, gameState.tileSize, poop.scale);
        ctx.globalAlpha = 1.0;
    }
}

// Render decorations
function renderDecorations() {
    const startX = Math.floor(gameState.camera.x / gameState.tileSize);
    const startY = Math.floor(gameState.camera.y / gameState.tileSize);
    const endX = startX + Math.ceil(canvas.width / gameState.tileSize);
    const endY = startY + Math.ceil(canvas.height / gameState.tileSize);

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            if (x >= 0 && x < gameGrid.width && y >= 0 && y < gameGrid.height) {
                const tile = gameGrid.tiles[y][x];
                const screen = gridToScreen(x, y);
                tile.decorations.forEach(decoration => {
                    drawEmoji(
                        decoration.emoji, 
                        screen.x, 
                        screen.y, 
                        gameState.tileSize,
                        decoration.scale
                    );
                });
            }
        }
    }
}

// Render player
function renderPlayer() {
    const screen = gridToScreen(gameState.player.x, gameState.player.y);
    drawEmoji(gameState.player.emoji, screen.x, screen.y);
}

// Main render function
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderGround();
    renderDecorations();
    renderObjects();
    renderPoops();
    renderClouds();
    renderPlayer();
    requestAnimationFrame(render);
}

// Handle keyboard input
const keys = new Set();
window.addEventListener('keydown', e => keys.add(e.key));
window.addEventListener('keyup', e => keys.delete(e.key));

// Check if a move is valid
function canMove(newX, newY) {
    return !gameGrid.isPositionBlocked(newX, newY);
}

// Update game state
function update() {
    const now = Date.now();
    const deltaTime = now - gameState.lastFrameTime;
    gameState.lastFrameTime = now;

    // Update clouds
    gameGrid.updateClouds(deltaTime);

    // Update poops with player position
    gameGrid.updatePoops(deltaTime, gameState.player.x, gameState.player.y);

    // Player movement with collision checking
    const moveSpeed = gameState.player.speed / gameState.tileSize;
    let newX = gameState.player.x;
    let newY = gameState.player.y;

    if (keys.has('ArrowLeft') || keys.has('a')) {
        newX = gameState.player.x - moveSpeed;
    }
    if (keys.has('ArrowRight') || keys.has('d')) {
        newX = gameState.player.x + moveSpeed;
    }
    if (keys.has('ArrowUp') || keys.has('w')) {
        newY = gameState.player.y - moveSpeed;
    }
    if (keys.has('ArrowDown') || keys.has('s')) {
        newY = gameState.player.y + moveSpeed;
    }

    // Check collision and update position if valid
    if (canMove(newX, newY)) {
        gameState.player.x = newX;
        gameState.player.y = newY;
    }

    // Camera follows player with pixel-perfect positioning
    gameState.camera.x = Math.round(gameState.player.x * gameState.tileSize - canvas.width/2);
    gameState.camera.y = Math.round(gameState.player.y * gameState.tileSize - canvas.height/2);

    // Keep camera within bounds
    gameState.camera.x = Math.max(0, Math.min(gameState.camera.x, 
        gameGrid.width * gameState.tileSize - canvas.width));
    gameState.camera.y = Math.max(0, Math.min(gameState.camera.y, 
        gameGrid.height * gameState.tileSize - canvas.height));
}

// Game loop
function gameLoop() {
    update();
    requestAnimationFrame(gameLoop);
}

// Initialize game
function initGame() {
    gameState.lastFrameTime = Date.now();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    render();
    gameLoop();
}

// Wait for fonts to load before starting
document.fonts.ready.then(() => {
    // Set default text settings
    ctx.font = `20px ${defaultFont}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.imageSmoothingEnabled = false;

    // Start the game
    initGame();
});
