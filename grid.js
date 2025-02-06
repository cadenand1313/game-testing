// Define object types with their properties
const ObjectTypes = {
    TREE: { type: 'tree', width: 2, height: 2, emoji: '🌳', interactive: true, collidable: true, resourceType: 'wood', resourceAmount: 15 },
    ROCK: { type: 'rock', width: 1, height: 1, emoji: '🪨', interactive: true, collidable: true, resourceType: 'stone', resourceAmount: 15 },
    HOUSE: { type: 'house', width: 4, height: 4, emoji: '🏠', interactive: true, collidable: true },
    BASECAMP: { type: 'basecamp', width: 3, height: 3, emoji: '🏕️', interactive: true, collidable: true, storage: {} },
    BUSH: { type: 'bush', width: 1, height: 1, emoji: '🌿', interactive: false, collidable: false },
    MOUNTAIN: { type: 'mountain', width: 4, height: 4, emoji: '⛰️', interactive: false, collidable: true },
    SMALL_MOUNTAIN: { type: 'small_mountain', width: 2, height: 2, emoji: '⛰️', interactive: false, collidable: true },
    PALM_TREE: { type: 'palm_tree', width: 2, height: 2, emoji: '🌴', interactive: true, collidable: true }
};

// Define biome types
const BiomeTypes = {
    FOREST: 'forest',
    MOUNTAIN: 'mountain',
    DESERT: 'desert',
    PLAINS: 'plains',
    ISLAND: 'island'
};

class Poop {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.spawnTime = Date.now();
        this.emoji = '💩';
        this.scale = 0.5;
        this.opacity = 1.0;
        this.isDespawned = false;
    }

    update(currentTime) {
        const age = currentTime - this.spawnTime;
        
        if (age > 10000) {
            this.opacity = Math.max(0, 1 - (age - 10000) / 5000);
            
            if (age > 15000) {
                this.isDespawned = true;
            }
        }
    }
}

class Cloud {
    constructor(x, y, dx, dy) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.animationFrame = 0;
        this.lastFrameChange = Date.now();
        this.lastDirectionChange = Date.now();
        this.emojis = ['🌧️', '☁️', '⛈️'];
        this.currentEmoji = this.emojis[0];
    }

    update(deltaTime) {
        const now = Date.now();
        if (now - this.lastDirectionChange > 4000) {
            const angleChange = (Math.random() - 0.5) * Math.PI / 16;
            const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
            const currentAngle = Math.atan2(this.dy, this.dx);
            const newAngle = currentAngle + angleChange;
            
            this.dx = Math.cos(newAngle) * speed;
            this.dy = Math.sin(newAngle) * speed;
            
            this.lastDirectionChange = now;
        }

        this.x += this.dx * deltaTime;
        this.y += this.dy * deltaTime;

        if (now - this.lastFrameChange > 1000) {
            this.animationFrame = (this.animationFrame + 1) % this.emojis.length;
            this.currentEmoji = this.emojis[this.animationFrame];
            this.lastFrameChange = now;
        }
    }
}

class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = Array(height).fill().map(() => 
            Array(width).fill().map(() => ({
                occupied: false,
                objectId: null,
                biome: null,
                decorations: [],
                texturePosition: Math.random()
            }))
        );
        this.objects = new Map();
        this.clouds = new Set();
        this.poops = new Set();
        this.lastCloudSpawn = 0;
        this.lastPoopTime = 0;
        this.generateBiomes();
        this.generateMountains();
        this.placeObject(10, 10, ObjectTypes.BASECAMP);
    }

    generateBiomes() {
        // First pass: Generate biomes
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const elevation = Math.sin(x/80) * Math.cos(y/80) * 0.6 +
                                Math.sin(x/40) * Math.cos(y/40) * 0.3 +
                                Math.sin(x/20) * Math.cos(y/20) * 0.1;
                
                const moisture = Math.cos(x/60) * Math.sin(y/60) * 0.6 +
                               Math.cos(x/30) * Math.sin(y/30) * 0.4;

                const boundaryNoise = (Math.sin(x/5) * Math.cos(y/5) + 
                                     Math.sin(x*1.3) * Math.cos(y*1.3)) * 0.03;

                let biome;
                const noisyElevation = elevation + boundaryNoise;
                const noisyMoisture = moisture + boundaryNoise;

                if (noisyElevation > 0.3) {
                    biome = BiomeTypes.MOUNTAIN;
                } else if (noisyElevation < -0.3) {
                    if (noisyMoisture > 0) {
                        biome = BiomeTypes.FOREST;
                    } else {
                        biome = BiomeTypes.DESERT;
                    }
                } else {
                    if (noisyMoisture > 0.2) {
                        biome = BiomeTypes.FOREST;
                    } else if (noisyMoisture < -0.2) {
                        biome = BiomeTypes.DESERT;
                    } else {
                        biome = BiomeTypes.PLAINS;
                    }
                }

                if (noisyElevation < -0.4 && noisyMoisture > 0.4) {
                    biome = BiomeTypes.ISLAND;
                }
                
                this.tiles[y][x].biome = biome;
                
                if (this.tiles[y][x].texturePosition < 0.1) {
                    this.tiles[y][x].decorations.push(this.getRandomDecoration(biome));
                }

                // Add palm trees in island biomes
                if (biome === BiomeTypes.ISLAND && Math.random() < 0.05) {
                    this.placeObject(x, y, ObjectTypes.PALM_TREE);
                }
            }
        }

        // Second pass: Generate clustered trees in forest biomes
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x].biome === BiomeTypes.FOREST) {
                    // Create forest density noise using multiple frequencies
                    const forestNoise = 
                        Math.sin(x/6) * Math.cos(y/6) * 1.0 +    // Medium clusters (increased frequency)
                        Math.sin(x/3) * Math.cos(y/3) * 0.8 +    // Small clusters (increased frequency)
                        Math.sin(x/40) * Math.cos(y/40) * 0.6;   // Large patterns (increased influence)

                    // Very minimal randomness for consistent density
                    const randomFactor = Math.random() * 0.02;
                    
                    // Much lower threshold for more tree placement
                    if (forestNoise + randomFactor > 0.2 && Math.random() < 0.995) {
                        // Check an even smaller area to allow very dense clusters
                        let nearbyTrees = 0;
                        const checkRadius = 2; // Reduced radius for very dense forests
                        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
                            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                                const distance = Math.sqrt(dx*dx + dy*dy);
                                if (distance <= checkRadius && 
                                    x + dx >= 0 && x + dx < this.width && 
                                    y + dy >= 0 && y + dy < this.height) {
                                    const tile = this.tiles[y + dy][x + dx];
                                    if (tile.objectId) {
                                        const obj = this.objects.get(tile.objectId);
                                        if (obj && obj.type === 'tree') {
                                            nearbyTrees++;
                                        }
                                    }
                                }
                            }
                        }

                        // Allow many more trees in all areas
                        const maxNearbyTrees = forestNoise > 0.6 ? 20 : 12;
                        if (nearbyTrees < maxNearbyTrees) {
                            this.placeObject(x, y, ObjectTypes.TREE);
                        }
                    }
                }
            }
        }
    }

    generateMountains() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x].biome === BiomeTypes.MOUNTAIN && Math.random() < 0.04) {
                    this.generateMountainRange(x, y);
                }
            }
        }
    }

    generateMountainRange(startX, startY) {
        let x = startX;
        let y = startY;
        const rangeLength = Math.floor(Math.random() * 3) + 2;
        const isLargeMountainRange = Math.random() < 0.2;
        const mountainType = isLargeMountainRange ? ObjectTypes.MOUNTAIN : ObjectTypes.SMALL_MOUNTAIN;
        const spacing = isLargeMountainRange ? 3 : 2;

        for (let i = 0; i < rangeLength; i++) {
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                if (this.isAreaAvailable(x, y, mountainType.width, mountainType.height)) {
                    this.placeObject(x, y, mountainType);
                }
            }

            const direction = Math.random();
            if (direction < 0.4) {
                x += spacing;
                y -= 1;
            } else if (direction < 0.8) {
                x += spacing;
                y += 1;
            } else {
                x += spacing;
            }
        }
    }

    getRandomDecoration(biome) {
        const decorations = {
            [BiomeTypes.DESERT]: ['🌵'],
            [BiomeTypes.PLAINS]: ['🌾', '🌿'],
            [BiomeTypes.FOREST]: ['🍂', '🌿'],
            [BiomeTypes.MOUNTAIN]: ['🪨'],
            [BiomeTypes.ISLAND]: ['🌺']
        };
        const biomeDecorations = decorations[biome];
        return {
            emoji: biomeDecorations[Math.floor(Math.random() * biomeDecorations.length)],
            scale: this.getDecorationScale(biomeDecorations[0])
        };
    }

    getDecorationScale(emoji) {
        const scales = {
            '🌺': 0.3,
            '🍂': 0.4,
            '🌿': 0.6,
            '🌾': 0.6,
            '🌵': 1.0,
            '🪨': 0.8
        };
        return scales[emoji] || 1.0;
    }

    updateClouds(deltaTime) {
        const now = Date.now();
        if (now - this.lastCloudSpawn > 8000 && Math.random() < 0.15) {
            this.spawnCloud();
            this.lastCloudSpawn = now;
        }

        for (const cloud of this.clouds) {
            cloud.update(deltaTime);
            
            if (cloud.x < -10 || cloud.x > this.width + 10 || 
                cloud.y < -10 || cloud.y > this.height + 10) {
                this.clouds.delete(cloud);
            }
        }
    }

    updatePoops(deltaTime, playerX, playerY) {
        const now = Date.now();
        
        if (now - this.lastPoopTime > 10000 && Math.random() < 0.9) {
            this.poops.add(new Poop(playerX, playerY));
            this.lastPoopTime = now;
        }

        for (const poop of this.poops) {
            poop.update(now);
            if (poop.isDespawned) {
                this.poops.delete(poop);
            }
        }
    }

    spawnCloud() {
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        const baseSpeed = 0.001;
        
        switch(edge) {
            case 0:
                x = Math.random() * this.width;
                y = -5;
                break;
            case 1:
                x = this.width + 5;
                y = Math.random() * this.height;
                break;
            case 2:
                x = Math.random() * this.width;
                y = this.height + 5;
                break;
            case 3:
                x = -5;
                y = Math.random() * this.height;
                break;
        }

        const angle = Math.random() * Math.PI * 2;
        const dx = Math.cos(angle) * baseSpeed;
        const dy = Math.sin(angle) * baseSpeed;

        const cloud = new Cloud(x, y, dx, dy);
        this.clouds.add(cloud);
    }

    isAreaAvailable(x, y, width, height) {
        if (x + width > this.width || y + height > this.height) return false;
        
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                if (this.tiles[y + dy][x + dx].occupied) return false;
            }
        }
        return true;
    }

    placeObject(x, y, object) {
        if (!this.isAreaAvailable(x, y, object.width, object.height)) return false;
        
        const objectInstance = {
            ...object,
            id: Math.random().toString(36).substr(2, 9),
            x, y
        };

        for (let dy = 0; dy < object.height; dy++) {
            for (let dx = 0; dx < object.width; dx++) {
                this.tiles[y + dy][x + dx].occupied = true;
                this.tiles[y + dy][x + dx].objectId = objectInstance.id;
            }
        }

        this.objects.set(objectInstance.id, objectInstance);
        return objectInstance.id;
    }

    removeObject(objectId) {
        const object = this.objects.get(objectId);
        if (!object) return false;

        for (let dy = 0; dy < object.height; dy++) {
            for (let dx = 0; dx < object.width; dx++) {
                this.tiles[object.y + dy][object.x + dx].occupied = false;
                this.tiles[object.y + dy][object.x + dx].objectId = null;
            }
        }

        this.objects.delete(objectId);
        return true;
    }

    getBiome(x, y) {
        return this.tiles[y][x].biome;
    }

    getObjectsInArea(x, y, width, height) {
        const objects = new Set();
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const objectId = this.tiles[y + dy][x + dx].objectId;
                if (objectId) objects.add(this.objects.get(objectId));
            }
        }
        return Array.from(objects);
    }

    shouldShowTexture(x, y) {
        return this.tiles[y][x].texturePosition < 0.1;
    }

    isPositionBlocked(x, y) {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);
        
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
            return true;
        }

        const objectId = this.tiles[gridY][gridX].objectId;
        if (objectId) {
            const object = this.objects.get(objectId);
            return object && object.collidable;
        }

        return false;
    }
}

const gameGrid = new Grid(200, 200);
