const CONFIG = {
    // World settings
    WORLD_RADIUS: 1500,
    MAX_ENEMIES: 50,
    SPAWN_INTERVAL: 60, // frames between spawns
    // Game settings
    PILLAR_HEIGHT: 100,
    PLAYER_HEALTH: 100,
    VICTORY_KILLS: 1000,
    
    // Player settings
    PLAYER_WIDTH: 20,
    PLAYER_HEIGHT: 40,
    PLAYER_DEPTH: 20,
    FIRE_RATE: 30, // frames between shots

    // Bullet settings
    BULLET: {
        PLAYER: {
            SPEED: 20,
            DAMAGE: 35,
            SIZE: 5,
            COLOR: [255, 255, 0] // Yellow
        },
        TURRET: {
            SPEED: 20,
            DAMAGE: 10,
            SIZE: 5,
            COLOR: [255, 100, 100] // Red
        }
    },
    
    // Enemy settings
    ENEMY_RADIUS: 1000,
    ENEMY_COUNT: 50,
    ENEMY_SPEED: 0.5, // Increased enemy speed but still slower than bullets
    ENEMY_WIDTH: 20,
    ENEMY_HEIGHT: 40,
    ENEMY_DEPTH: 20,
    ENEMY_HEALTH: 100,
    ENEMY_DAMAGE_TO_PILLAR: 0.02,
    ENEMY_DAMAGE_TO_PLAYER: 0.2,
    
    // Skill settings
    CLONE: {
        COOLDOWN: 500,
        DURATION: 8000,
        FIRE_RATE: 30, // Shoot as fast as player
        DAMAGE: 15,
        MAX_CLONES: 10
    },
    
    TURRET: {
        COOLDOWN: 5000, // 5 seconds cooldown
        DURATION: 3000, // 3 seconds duration
        FIRE_RATE: 30,  // Same as clone
        DAMAGE: 10,
        RANGE: 300,
        BULLET_SIZE: 5,
        MAX_TARGETS: 3  // Shoot 3 enemies at once
    },
    
    AIRSTRIKE: {
        COOLDOWN: 500,
        SPEED: 3,
        BOMB_RATE: 200,
        DAMAGE: 50,
        BLAST_RADIUS: 100
    },
    
    LASER: {
        COOLDOWN: 500,
        DURATION: 3000,
        DAMAGE: 8,
        WIDTH: 40
    }
};
