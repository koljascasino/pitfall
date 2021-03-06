(function (app) {
	"use strict";

	/**
	 * Implements and extends the Phaser GameState object.
	 * This holds all information about the current game state
	 * @param ui Handle to the ui
	 * @param music Handle to the music module
	 * @param game Handle to the phaser game
	 * @param width Game width
	 * @param height Game height
	 */
	var GameState = function GameState(ui, music, game, width, height) {
		this.width = width;
		this.height = height;
		this.game = game;
		this.ui = ui;
		this.music = music;

		this.config = [];
		
		// Level 1
		this.config[0] = [{
			autocorrelation: 0.9,
			lfo1period: 100,
			lfo2period: 100,
			gap: {width: 4, stdev: 0.2},
			probability: {starship: 0, bonus: 0, health: 0.004, energy: 0.01 },
			goal: {stage: 200, level: 1000}
		},{
			autocorrelation: 0.9,
			lfo1period: 100,
			lfo2period: 50,
			gap: {width: 2.75, stdev: 0.2},
			probability: {starship: 0, bonus: 0.002, health: 0.006, energy: 0.03 },
			goal: {stage: 800, level: 1000}
		},{
			autocorrelation: 0.8,
			lfo1period: 50,
			lfo2period: 50,
			gap: {width: 3, stdev: 0.2},
			probability: {starship: 0, bonus: 0.002, health: 0.005, energy: 0.02 },
			goal: {stage: 1000, level: 1000}
		}];
		
		// Level 2
		this.config[1] = [{
			autocorrelation: 0.7,
			lfo1period: 100,
			lfo2period: 200,
			gap: {width: 3, stdev: 0.5},
			probability: {starship: 0, bonus: 0, health: 0.007, energy: 0.02 },
			goal: {stage: 1200, level: 2000}
		},{
			autocorrelation: 0.6,
			lfo1period: 40,
			lfo2period: 60,
			gap: {width: 3, stdev: 0.5},
			probability: {starship: 0, bonus: 0.002, health: 0.005, energy: 0.02 },
			goal: {stage: 1500, level: 2000}
		},{
			autocorrelation: 0.6,
			lfo1period: 100,
			lfo2period: 125,
			gap: {width: 3, stdev: 0.6},
			probability: {starship: 0.001, bonus: 0.002, health: 0.005, energy: 0.02 },
			goal: {stage: 2000, level: 2000}
		}];
		
		// End
		this.config[2] = [{
			autocorrelation: 1,
			lfo1period: 0,
			lfo2period: 0,
			gap: {width: 100, stdev: 0},
			probability: {starship: 0, bonus: 0, health: 0.004, energy: 0.01},
			goal: {stage: 100000, level: 100000}
		}];
	};
	
	GameState.prototype.init = function() {	
		this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.game.scale.setMinMax(0, 0, this.width, this.height);
		this.game.scale.pageAlignHorizontally = true;
		this.game.scale.pageAlignVertically = true;
	};

	GameState.prototype.preload = function() {
		this.game.load.image("bullet", "img/bullet.png");
		this.game.load.spritesheet("earth", "img/earth.png", 50, 50);
		this.game.load.image("playerLight", "img/light_900x600.png");
		this.game.load.spritesheet("ship", "img/ship.png", 40, 27);
		this.game.load.spritesheet("kaboom", "img/explosion.png", 128, 128);
		this.game.load.image("starfield", "img/starfield.png", this.width, this.height);
		this.game.load.image("checker", "img/checker.png", 50, 50);
	};

	GameState.prototype.create = function() {

		// The earth
		this.earth = new app.Earth(this.game, this.music, this.width, this.height, this.config[0][0]);
		
		//  Our bullet group
		this.bullets = this.game.add.group();
		this.bullets.enableBody = true;
		this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
		this.bullets.createMultiple(30, "bullet");
		this.bullets.setAll("anchor.x", 0.5);
		this.bullets.setAll("anchor.y", 1);
		this.bullets.setAll("outOfBoundsKill", true);
		this.bullets.setAll("checkWorldBounds", true);
		this.bulletTime = 0;

		// The hero!
		this.player = new app.Player(this.game, this.ui, this.music, this.width);

		// Light texture
		this.light = {};
		this.light.texture = this.game.add.bitmapData(this.width, this.height);
		this.light.image = this.game.add.image(0, 0, this.light.texture);
		this.light.image.blendMode = Phaser.blendModes.MULTIPLY;    
		this.updateLight();

		// And some controls to play the game with
		this.input.cursors = this.game.input.keyboard.createCursorKeys();
		this.input.fireButton = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		this.input.pauseButton = this.game.input.keyboard.addKey(Phaser.Keyboard.P);
		this.input.pointer1 = this.game.input.addPointer();
		this.input.movement = 0.0;
		this.input.isFiring = false;
		this.input.ui = this.ui;

		this.input.update = function() {

			// Check for orientation
			if (this.ui.orientation !== null) {
				this.movement = this.ui.orientation;
			}

			// Keyboard movement
			else {
				if (this.cursors.left.isDown){
					this.movement = -1.0; 
				} else if (this.cursors.right.isDown){
					this.movement = 1.0;
				} else {
					this.movement = 0.0;
				}
			}

			// Firing via touch or keyboard
			if (this.fireButton.isDown || this.pointer1.isDown) {
				this.isFiring = true;
			} else {
				this.isFiring = false;
			}
		};

		// Tell the ui the game is ready
		this.game.paused = true;
		this.ui.loadScreen(this.play, this);
	};

	/**
	 * Updates the Light texture (this.LightTexture).
	 * First, it fills the entire texture with a dark Light color.
	 * Then it draws a white circle centered on the pointer position.
	 * Because the texture is drawn to the screen using the MULTIPLY
	 * blend mode, the dark areas of the texture make all of the colors
	 * underneath it darker, while the white area is unaffected.
	 */
	GameState.prototype.updateLight = function() {
		var radius = 400;

		// Draw Light
		this.light.texture.context.fillStyle = "rgb(0, 0, 0)";
		this.light.texture.context.fillRect(0, 0, this.width, this.height);

		// Iterate through each of the lights and draw the glow
		var addLight = function(sprite) {

			var gradient = this.light.texture.context.createRadialGradient(sprite.x, sprite.y, 0, sprite.x, sprite.y, radius);
			gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
			gradient.addColorStop(0.1, "rgba(255, 255, 255, 1.0)");
			gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.5)");
			gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.25)");
			gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.125)");
			gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.0625)");
			gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");

			// Draw circle of light with a soft edge
			this.light.texture.context.beginPath();
			this.light.texture.context.fillStyle = gradient;
			this.light.texture.context.arc(sprite.x, sprite.y, radius, 0, 2*Math.PI);
			this.light.texture.context.fill();

		}.bind(this);

		// Draw player headlights if alive
		if (this.player.sprite.alive){
			this.light.texture.draw("playerLight", this.player.sprite.x - this.width/2, 50);
			if (this.player.starship) {
				addLight(this.player.sprite);
			}
		} else {
			addLight(this.player.sprite);
		}

		// Draw a light for each bullet
		this.bullets.forEachAlive(addLight);

		// This just tells the engine it should update the texture cache
		this.light.texture.dirty = true;
	};


	GameState.prototype.update = function() {
		var resistance = 0.2;
		var boost = 20;
		var stickyness = 40;
		var depth = 0;	
		var config = this.config[this.player.level-1][this.player.stage-1];
		
		// Update earth and player
		depth = this.earth.update(this.player, this.config);
		this.player.update(depth, config.goal.level);
		
		// Check if stage completed
		if (depth == config.goal.stage) {
			
			// Level is completed
			if (depth == config.goal.level) {
				
				// Win screen
				if (this.player.level == this.config.length-1){
					this.ui.winScreen(this.restart, this);
				
				// Next level
				} else {
					this.game.paused = true;
					this.player.stage = 1;
					this.player.level += 1;
					this.ui.levelScreen(this.player.level, function() {
						this.game.paused = false;
						this.music.play(this.player.level);
					}, this);	
				}
			}  else {
				this.player.stage += 1;
			}
		}
		
		// Update lights and input
		this.updateLight();
		this.input.update();

		// Check for movement keys, input provides value between -1 and 1
		this.player.sprite.body.velocity.x += this.input.movement * boost;

		// Resistance
		var r = resistance;
		if (Math.abs(this.player.sprite.body.velocity.x) > stickyness){
			r = r*r;
		}
		this.player.sprite.body.velocity.x = Math.sign(this.player.sprite.body.velocity.x) * Math.floor((1-r) * Math.abs(this.player.sprite.body.velocity.x));

		// Firing?
		if (this.input.isFiring) {
			this.fireBullet();
		}

		// Hard boundaries
		if (this.player.sprite.x < 3 * this.player.sprite.width/2 ) {
			this.player.sprite.x = 3 * this.player.sprite.width/2;
			this.player.sprite.body.velocity.x = 0;
		} else if (this.player.sprite.x > this.width - 3 * this.player.sprite.width/2) {
			this.player.sprite.x = this.width - 3 * this.player.sprite.width/2;
			this.player.sprite.body.velocity.x = 0;
		}

		//  Run collision
		this.game.physics.arcade.overlap(this.bullets, this.earth.items, this.bulletHitsEarth, null, this);
		this.game.physics.arcade.overlap(this.earth.items, this.player.sprite, this.playerHitsEarth, null, this);
	};

	GameState.prototype.play = function() {
		this.game.paused = false;
		this.music.play();
		if (this.player.bonus > 0){
			this.music.doubleTime(true);
		}
		this.input.pauseButton.onDown.add(this.pause, this);
	};

	GameState.prototype.pause = function() {
		this.game.paused = true;
		this.music.pause();
		this.ui.pauseScreen(this.play, this);
		this.input.pauseButton.onDown.remove(this.pause, this);
	};

	GameState.prototype.restart = function() {

		// Clear and rebuild earth, revive player
		this.earth.reset(this.config[0][0]);
		this.player.reset();
		this.music.reset();
		this.input.pauseButton.onDown.add(this.pause, this);
	};

	// Bullet hits earth
	GameState.prototype.bulletHitsEarth = function(bullet, item) {

		// Bullet hits earth, create explosion
		// Do not collide with items
		if (item.frame < this.earth.frames.HEALTH) {
			bullet.kill();
			this.earth.explode(item);
			this.earth.kill(item);
		}
	};

	// Player hits earth
	GameState.prototype.playerHitsEarth = function(player, item) {
		if (item.frame >= this.earth.frames.HEALTH){		
			this.playerHitsGoodie(item);
			this.earth.kill(item);
		}
		else {
			this.earth.kill(item);
			this.earth.explode(item);
			if (!this.player.starship) {
				this.playerTakesHit(item);
			}
		}	
	};


	GameState.prototype.fireBullet = function() {

		//  To avoid them being allowed to fire too fast we set a time limit
		if (this.player.sprite.alive && this.game.time.now > this.bulletTime && (this.player.energy > 0 || this.player.bonus > 0)) {

			//  Grab the first bullet we can from the pool
			var bullet = this.bullets.getFirstExists(false);

			if (bullet) {
				if (this.player.bonus > 0) {
					bullet.reset(this.player.sprite.x - 22, this.player.sprite.y + 30);
					bullet.body.velocity.y = 400;
					bullet.body.velocity.x = this.player.sprite.body.velocity.x/2;
					this.bulletTime = this.game.time.now + 200;
					bullet = this.bullets.getFirstExists(false);
					bullet.reset(this.player.sprite.x + 22, this.player.sprite.y + 30);
					bullet.body.velocity.y = 400;
					bullet.body.velocity.x = this.player.sprite.body.velocity.x/2;
					this.bulletTime = this.game.time.now + 200;
					this.music.sounds.arrow.play();
				} else {
					bullet.reset(this.player.sprite.x, this.player.sprite.y + 30);
					bullet.body.velocity.y = 400;
					bullet.body.velocity.x = this.player.sprite.body.velocity.x/2;
					this.bulletTime = this.game.time.now + 200;
					this.music.sounds.arrow.play();
					this.player.energy -= 10;
				}
			}
		}
	};

	GameState.prototype.playerHitsGoodie = function(item) {
		if (item.frame === this.earth.frames.HEALTH) {
			this.player.shield += Math.min(20, 100 - this.player.shield);
		} else if (item.frame === this.earth.frames.ENERGY) {
			this.player.energy += Math.min(20, 100 - this.player.energy);	
		} else if (item.frame === this.earth.frames.BONUS) {
			if (this.player.bonus === 0){
				this.music.doubleTime(true);
			}
			this.player.bonus = 100;
		} else if (item.frame === this.earth.frames.STARSHIP) {
			this.player.starship = true; 
			this.music.starship(function() {
				this.player.starship = false;
				this.player.sprite.frame = 0;		
			}.bind(this));
		}
		this.music.sounds.rupee.play();
		this.ui.update(this.player);
	};

	GameState.prototype.playerTakesHit = function(item) {

		// Decrease health
		this.player.shield -= 10;
		this.ui.update(this.player);
		this.music.sounds.hurt.play();

		// When the player dies
		if (this.player.shield <= 0) {
			this.player.sprite.kill();  
			this.music.sounds.die.play();
			this.music.pause(true);
			this.ui.gameOverScreen(this.restart, this);
			this.input.pauseButton.onDown.remove(this.pause, this);
		}
	};

	app.GameState = GameState;
}(App));