let player;
let enemies = [];
let bullets = [];
let clones = [];
let turrets = [];
let airstrikes = [];
let lasers = [];
let pillarHeight = CONFIG.PILLAR_HEIGHT;
let playerHealth = CONFIG.PLAYER_HEALTH;
let enemiesKilled = 0;
let framesSinceLastShot = 0;
let totalEnemiesSpawned = 0;

let skillCooldowns = {
    clone: 0,
    turret: 0,
    airstrike: 0,
    laser: 0
};

let camera;
let gameFont;
let shootSound;

// Camera control variables
let cameraRotationX = -0.4; // Less steep angle for better perspective
let cameraRotationY = 0;
let zoomLevel = 2.0; // Wider view of battlefield
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let baseCameraDistance = 300; // Base distance that will be multiplied by zoomLevel

class Player {
    constructor() {
        this.x = 0;
        this.y = 0; // Will be calculated based on pillar height
        this.z = 0;
        this.width = CONFIG.PLAYER_WIDTH;
        this.height = CONFIG.PLAYER_HEIGHT;
        this.depth = CONFIG.PLAYER_DEPTH;
        this.rotation = 0;
        this.targetEnemy = null;
        this.updateHeight(); // Initialize height
    }

    show() {
        this.showAimLines(3); // Show aim lines for 3 nearest enemies
        
        push();
        translate(this.x, this.y, this.z);
        rotateY(this.rotation);
        
        // Player body
        fill(0, 255, 0);
        box(this.width, this.height, this.depth);
        
        // Gun
        push();
        translate(this.width/2, -this.height/4, 0);
        fill(100);
        rotateZ(HALF_PI);
        cylinder(2, 20);
        pop();
        
        pop();
    }

    findNearestEnemy(count = 1) {
        let bulletStartX = this.x + cos(this.rotation - HALF_PI) * this.width/2;
        let bulletStartZ = this.z + sin(this.rotation - HALF_PI) * this.width/2;
        
        // Create array of enemies with their distances and hit prediction
        let enemyData = enemies.map(enemy => {
            let d = dist(bulletStartX, bulletStartZ, enemy.x, enemy.z);
            let angle = atan2(enemy.z - bulletStartZ, enemy.x - bulletStartX);
            let willHit = false;
            
            // Calculate if bullet would hit enemy
            let hitX = bulletStartX;
            let hitZ = bulletStartZ;
            
            for (let t = 0; t < CONFIG.WORLD_RADIUS; t += CONFIG.BULLET_SPEED) {
                hitX += cos(angle) * CONFIG.BULLET_SPEED;
                hitZ += sin(angle) * CONFIG.BULLET_SPEED;
                
                let hitDist = dist(hitX, hitZ, enemy.x, enemy.z);
                if (hitDist < enemy.width/2) {
                    willHit = true;
                    break;
                }
            }
            
            return {
                enemy,
                distance: d,
                willHit
            };
        });
        
        // Filter hittable enemies and sort by distance
        let nearestEnemies = enemyData
            .filter(data => data.willHit)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, count)
            .map(data => data.enemy);
        
        return count === 1 ? nearestEnemies[0] || null : nearestEnemies;
    }

    autoShoot() {
        this.targetEnemy = this.findNearestEnemy(1);
        
        if (this.targetEnemy && framesSinceLastShot >= CONFIG.FIRE_RATE) {
            // Get gun position
            let gunX = this.x + cos(this.rotation - HALF_PI) * this.width/2;
            let gunZ = this.z + sin(this.rotation - HALF_PI) * this.width/2;
            
            // Calculate direct angle to target
            let angle = atan2(this.targetEnemy.z - gunZ, this.targetEnemy.x - gunX);
            
            // Update player rotation to face target
            this.rotation = angle + HALF_PI;
            
            // Spawn bullet from gun position
            bullets.push(new Bullet(gunX, this.y - this.height/4, gunZ, angle));
            shootSound.play();
            framesSinceLastShot = 0;
        }
    }
    
    update() {
        this.updateHeight();
        this.autoShoot();
    }

    updateHeight() {
        // Update height based on pillar
        this.y = -pillarHeight * 5;
        // Update clones height too
        for (let clone of clones) {
            clone.y = this.y;
        }
    }
    
    showAimLines(count = 1) {
        // Get multiple targets
        let targets = this.findNearestEnemy(count);
        if (!targets) return;
        
        // Convert single target to array for consistent processing
        if (!Array.isArray(targets)) {
            targets = [targets];
        }
        
        push();
        
        for (let target of targets) {
            // Get gun position
            let gunX = this.x + cos(this.rotation - HALF_PI) * this.width/2;
            let gunZ = this.z + sin(this.rotation - HALF_PI) * this.width/2;
            let gunY = this.y - this.height/4;
            
            // Draw straight aim line
            stroke(255, 255, 0);
            strokeWeight(2);
            line(gunX, gunY, gunZ, target.x, gunY, target.z);
            
            // Draw target box
            push();
            translate(target.x, gunY, target.z);
            noFill();
            stroke(255, 0, 0);
            box(target.width * 2);
            pop();
            
            // Draw vertical markers
            stroke(255, 255, 0);
            // At gun
            line(gunX, gunY - 10, gunZ, gunX, gunY + 10, gunZ);
            // At target
            line(target.x, gunY - 10, target.z, target.x, gunY + 10, target.z);
        }
        
        pop();
    }
}

class Enemy {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.y = 0;
        this.width = CONFIG.ENEMY_WIDTH;
        this.height = CONFIG.ENEMY_HEIGHT;
        this.depth = CONFIG.ENEMY_DEPTH;
        this.health = CONFIG.ENEMY_HEALTH;
        this.speed = CONFIG.ENEMY_SPEED;
        this.rotation = 0;
    }

    static spawnRandom() {
        let angle = random(TWO_PI);
        let radius = CONFIG.ENEMY_RADIUS;
        let x = cos(angle) * radius;
        let z = sin(angle) * radius;
        return new Enemy(x, z);
    }

    update() {
        let angle = atan2(0 - this.z, 0 - this.x);
        this.x += cos(angle) * this.speed;
        this.z += sin(angle) * this.speed;
        this.rotation = angle + HALF_PI; // Make enemy face the pillar

        if (dist(this.x, this.z, 0, 0) < 50) {
            pillarHeight = max(0, pillarHeight - CONFIG.ENEMY_DAMAGE_TO_PILLAR);
            if (pillarHeight === 0) {
                playerHealth -= CONFIG.ENEMY_DAMAGE_TO_PLAYER;
            }
        }
    }

    show() {
        push();
        translate(this.x, this.y, this.z);
        rotateY(this.rotation);
        fill(255, 0, 0);
        box(this.width, this.height, this.depth);
        pop();
    }
}

class Bullet {
    constructor(x, y, z, angle) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.angle = angle;
        this.speed = CONFIG.BULLET_SPEED;
        this.size = CONFIG.BULLET_SIZE;
    }

    update() {
        this.x += cos(this.angle) * this.speed;
        this.z += sin(this.angle) * this.speed;
        
        // Check collision with enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];
            let d = dist(this.x, this.z, enemy.x, enemy.z);
            if (d < enemy.width) {
                enemy.health -= CONFIG.BULLET_DAMAGE;
                if (enemy.health <= 0) {
                    enemies.splice(i, 1);
                    enemiesKilled++;
                }
                return true; // Bullet hit something
            }
        }
        
        // Check if bullet is too far
        if (dist(0, 0, this.x, this.z) > CONFIG.WORLD_RADIUS) {
            return true; // Bullet out of range
        }
        
        return false; // Bullet still active
    }

    show() {
        push();
        translate(this.x, this.y, this.z);
        fill(255, 255, 0);
        sphere(this.size);
        pop();
    }
}

class Clone {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.lifespan = CONFIG.CLONE.DURATION;
        this.lastShot = 0;
        this.rotation = 0;
        this.targetEnemy = null;
    }

    update() {
        this.lifespan--;
        
        // Find and shoot at nearest enemy
        if (millis() - this.lastShot > CONFIG.CLONE.FIRE_RATE) {
            let nearestEnemy = null;
            let minDist = Infinity;
            
            for (let enemy of enemies) {
                let d = dist(this.x, this.z, enemy.x, enemy.z);
                if (d < minDist) {
                    minDist = d;
                    nearestEnemy = enemy;
                }
            }
            
            if (nearestEnemy) {
                this.targetEnemy = nearestEnemy;
                let angle = atan2(nearestEnemy.z - this.z, nearestEnemy.x - this.x);
                this.rotation = angle + HALF_PI;
                bullets.push(new Bullet(this.x, this.y, this.z, angle));
                this.lastShot = millis();
            }
        }
    }

    showAimLine() {
        if (this.targetEnemy) {
            push();
            stroke(0, 255, 0, 50);
            strokeWeight(1);
            line(this.x, this.y + 10, this.z, 
                 this.targetEnemy.x, this.y + 10, this.targetEnemy.z);
            pop();
        }
    }

    show() {
        this.showAimLines(3); // Show aim lines for 3 nearest enemies
        
        push();
        translate(this.x, this.y, this.z);
        rotateY(this.rotation);
        
        // Clone body
        fill(0, 200, 0, map(this.lifespan, 0, CONFIG.CLONE.DURATION, 0, 255));
        box(CONFIG.PLAYER_SIZE * 0.8);
        
        // Gun
        push();
        translate(CONFIG.PLAYER_SIZE/2, 0, 0);
        fill(100, map(this.lifespan, 0, CONFIG.CLONE.DURATION, 0, 255));
        rotateZ(HALF_PI);
        cylinder(1.5, 15);
        pop();
        
        pop();
    }
}

class Turret {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.lifespan = 300;
    }

    update() {
        this.lifespan--;
        if (frameCount % 15 === 0) {
            let closestEnemy = null;
            let minDist = Infinity;
            for (let enemy of enemies) {
                let d = dist(this.x, this.y, enemy.x, enemy.y);
                if (d < minDist) {
                    minDist = d;
                    closestEnemy = enemy;
                }
            }
            if (closestEnemy) {
                let angle = atan2(closestEnemy.y - this.y, closestEnemy.x - this.x);
                bullets.push(new Bullet(this.x, this.y, angle));
            }
        }
    }

    show() {
        fill(100, 100, 255, this.lifespan);
        rect(this.x - 10, this.y - 10, 20, 20);
    }
}

class Airstrike {
    constructor() {
        this.x = -50;
        this.y = 100;
        this.speed = 5;
    }

    update() {
        this.x += this.speed;
        if (frameCount % 5 === 0) {
            bullets.push(new Bullet(this.x, this.y, HALF_PI));
        }
    }

    show() {
        fill(150);
        triangle(this.x, this.y, this.x - 20, this.y - 10, this.x - 20, this.y + 10);
    }
}

class Laser {
    constructor() {
        this.y = height/2;
        this.lifespan = 60;
    }

    update() {
        this.lifespan--;
        for (let enemy of enemies) {
            if (abs(enemy.y - this.y) < 20) {
                enemy.health -= 5;
            }
        }
    }

    show() {
        stroke(255, 0, 0, this.lifespan * 4);
        strokeWeight(4);
        line(0, this.y, width, this.y);
        strokeWeight(1);
        stroke(0);
    }
}

function spawnEnemies() {
    if (enemies.length < CONFIG.MAX_ENEMIES && frameCount % CONFIG.SPAWN_INTERVAL === 0) {
        enemies.push(Enemy.spawnRandom());
        totalEnemiesSpawned++;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function mouseWheel(event) {
    // Zoom with mouse wheel - rolling forward (negative delta) decreases zoom level (zooms in)
    // rolling backward (positive delta) increases zoom level (zooms out)
    zoomLevel = constrain(zoomLevel + (event.delta * 0.001), 0.2, 10.0);
    return false; // Prevent default scrolling
}

function mousePressed() {
    // Start dragging with middle mouse button (button 1)
    if (mouseButton === CENTER) {
        isDragging = true;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
    }
}

function mouseReleased() {
    if (mouseButton === CENTER) {
        isDragging = false;
    }
}

function updateCamera() {
    // Update camera rotation when dragging
    if (isDragging) {
        let deltaX = (mouseX - lastMouseX) * 0.01;
        let deltaY = (mouseY - lastMouseY) * 0.01;
        
        cameraRotationY += deltaX;
        cameraRotationX = constrain(cameraRotationX + deltaY, -PI/2, 0);
        
        lastMouseX = mouseX;
        lastMouseY = mouseY;
    }
    
    // Position camera behind player at 1/3 screen height
    let currentDistance = baseCameraDistance * zoomLevel;
    
    // Calculate camera position
    let camX = sin(cameraRotationY) * currentDistance;
    let camZ = cos(cameraRotationY) * currentDistance;
    
    // Position camera behind player
    camera.setPosition(
        camX, // Keep player centered horizontally
        player.y - 600, // Camera slightly above player
        camZ + 100 // Camera behind player
    );
    
    // Look at point in front of player at 1/3 screen height
    camera.lookAt(
        0, // Keep centered horizontally
        player.y + 700, // Look slightly down
        -400 // Look ahead of player
    );
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    camera = createCamera();
    gameFont = loadFont('opensans-light.ttf');
    shootSound = loadSound('single-shot.mp3');
    player = new Player();
    
    // Initial enemy spawn
    for (let i = 0; i < CONFIG.ENEMY_COUNT; i++) {
        enemies.push(Enemy.spawnRandom());
        totalEnemiesSpawned++;
    }
}



function draw() {
    framesSinceLastShot++;
    
    // Sky gradient
    background(135, 206, 235); // Light blue sky
    
    // Update player first to get new height
    player.update();
    
    // Update camera position and rotation
    updateCamera();
    
    // Add some ambient light
    ambientLight(100);
    pointLight(255, 255, 255, 0, -500, 0);
    
    // Draw ground
    push();
    translate(0, 50, 0);
    rotateX(HALF_PI);
    fill(34, 139, 34); // Forest green
    noStroke();
    plane(CONFIG.WORLD_RADIUS * 2, CONFIG.WORLD_RADIUS * 2);
    
    // Add grid pattern
    stroke(45, 150, 45);
    strokeWeight(1);
    let gridSize = 100;
    for(let x = -CONFIG.WORLD_RADIUS; x <= CONFIG.WORLD_RADIUS; x += gridSize) {
        line(x, -CONFIG.WORLD_RADIUS, x, CONFIG.WORLD_RADIUS);
    }
    for(let z = -CONFIG.WORLD_RADIUS; z <= CONFIG.WORLD_RADIUS; z += gridSize) {
        line(-CONFIG.WORLD_RADIUS, z, CONFIG.WORLD_RADIUS, z);
    }
    pop();

    // Draw pillar
    push();
    translate(0, 25 - pillarHeight * 2.5, 0);
    fill(150);
    box(50, pillarHeight * 5, 50);
    // Add visual markers on pillar
    for (let i = 0; i < 5; i++) {
        push();
        translate(0, pillarHeight * 2.5 - i * pillarHeight, 0);
        fill(100);
        box(52, 2, 52);
        pop();
    }
    pop();

    // Spawn new enemies
    spawnEnemies();
    
    player.show();

    // Update and show enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        enemies[i].show();
        if (enemies[i].health <= 0) {
            enemies.splice(i, 1);
            enemiesKilled++;
            if (enemies.length < 50) {
                enemies.push(new Enemy());
            }
        }
    }

    // Update and show bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].update()) { // Returns true if bullet should be removed
            bullets.splice(i, 1);
        } else {
            bullets[i].show();
        }
    }

    // Update and show clones
    for (let i = clones.length - 1; i >= 0; i--) {
        clones[i].update();
        clones[i].show();
        if (clones[i].lifespan <= 0) {
            clones.splice(i, 1);
        }
    }

    // Update and show turrets
    for (let i = turrets.length - 1; i >= 0; i--) {
        turrets[i].update();
        turrets[i].show();
        if (turrets[i].lifespan <= 0) {
            turrets.splice(i, 1);
        }
    }

    // Update and show airstrikes
    for (let i = airstrikes.length - 1; i >= 0; i--) {
        airstrikes[i].update();
        airstrikes[i].show();
        if (airstrikes[i].x > width + 50) {
            airstrikes.splice(i, 1);
        }
    }

    // Update and show lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
        lasers[i].update();
        lasers[i].show();
        if (lasers[i].lifespan <= 0) {
            lasers.splice(i, 1);
        }
    }

    // Update cooldowns
    for (let skill in skillCooldowns) {
        if (skillCooldowns[skill] > 0) {
            skillCooldowns[skill]--;
        }
    }

    // Update status board
    document.getElementById('pillar-height').textContent = Math.ceil(pillarHeight);
    document.getElementById('health').textContent = Math.ceil(playerHealth);
    document.getElementById('kills').textContent = enemiesKilled;

    // Check win/lose conditions
    if (playerHealth <= 0) {
        noLoop();
        push();
        translate(-100, 0, 0); // Center the text in 3D space
        textFont(gameFont);
        textSize(32);
        fill(255, 0, 0);
        textAlign(CENTER);
        text('Game Over!', 0, 0);
        pop();
    } else if (enemiesKilled >= 1000) {
        noLoop();
        push();
        translate(-100, 0, 0); // Center the text in 3D space
        textFont(gameFont);
        textSize(32);
        fill(0, 255, 0);
        textAlign(CENTER);
        text('Victory!', 0, 0);
        pop();
    }
}

// Auto-shooting is handled in player.autoShoot()

function keyPressed() {
    if (key === 'c' || key === 'C') {
        if (skillCooldowns.clone <= 0) {
            // Create clone at random position around the player
            let angle = random(TWO_PI);
            let radius = 30;
            let cloneX = player.x + cos(angle) * radius;
            let cloneZ = player.z + sin(angle) * radius;
            clones.push(new Clone(cloneX, player.y, cloneZ));
            skillCooldowns.clone = CONFIG.CLONE.COOLDOWN;
        }
    } else if (key === 't' || key === 'T') {
        if (skillCooldowns.turret <= 0) {
            turrets.push(new Turret(player.x + random(-50, 50), player.y));
            skillCooldowns.turret = 300;
        }
    } else if (key === 'a' || key === 'A') {
        if (skillCooldowns.airstrike <= 0) {
            airstrikes.push(new Airstrike());
            skillCooldowns.airstrike = 600;
        }
    } else if (key === 'l' || key === 'L') {
        if (skillCooldowns.laser <= 0) {
            lasers.push(new Laser());
            skillCooldowns.laser = 450;
        }
    }
}
