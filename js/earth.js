(function (app) {
	"use strict";

	/**
	 * Creates the earth for the game level, the earth object holds all 
	 * earth items i.e. blocks and goodies
	 * @param game
	 * @param sounds
	 * @param player
	 * @param width
	 * @param height
	 */
	var Earth = function Earth(game, sounds, player, width, height) {
		this.game = game;
		this.sounds = sounds;
		this.player = player;
		this.width = width;
		this.height = height;

		// Configuration
		this.config = {
				initialAutocorrelation: 0.9,
				difficultyFactor: 0.9999,
				levelHeight: 50,
				blockWidth: 50
		};
		this.frames = {
				HEALTH: 16, 
				ENERGY: 17,
				BONUS: 18,
		};

		// Some parameters
		this.nBlocks = this.width / this.config.blockWidth;
		this.nLevels = Math.floor(this.height / this.config.levelHeight);

		// Autocorrelation of gap in earth
		this.autocorrelation = null;
		this.dice = null;

		// Add game items
		this.items = this.game.add.group();
		this.items.enableBody = true;
		this.items.physicsBodyType = Phaser.Physics.ARCADE;
		this.items.createMultiple(this.nBlocks * (this.nLevels + 4), "earth");

		// Edges contains the outer blocks and goodies
		// But not blocks that lie completely inside other blocks
		// Use this to run collisions
		this.edges = this.game.add.group();

		// Maintain list of last row of items created
		// Use this to link neighboring items
		this.lastRow = [];
		this.previousRow = [];

		// Create explosions
		this.explosions = this.game.add.group();
		this.explosions.createMultiple(30, "kaboom");
		var setupExplosion = function(block) {
			block.anchor.x = 0.5;
			block.anchor.y = 0.5;
			block.animations.add("kaboom");
		};
		this.explosions.forEach(setupExplosion, this);

		// Set initial parameters and setup items
		this.reset();
	};

	/**
	 * Sets up or resets initial earth parameters and all items
	 */
	Earth.prototype.reset = function() {
		this.items.y = 0;
		this.edges.y = 0;
		this.explosions.y = 0;
		for (var i = 0; i < this.nBlocks; i++) {
			this.lastRow[i] = null;
		}
		this.autocorrelation = this.config.initialAutocorrelation;
		this.dice = 0.5;
		this.items.addMultiple(this.edges);
		this.items.forEach(this.resetItem, this);
	};


	/** Sets up or resets a block, removes neighbor links.
	 * This should not be called on individual items, but on all
	 * @param item to be removed
	 */
	Earth.prototype.resetItem = function(item) {
		item.kill();
		item.anchor.setTo(0, 0);
		item.body.moves = false;
		item.neighbors = {
				top: null, 
				left: null, 
				right: null, 
				bottom: null
		};
		item.frame = 0;
	};

	/**
	 * Recycles an item by killing it and relinking its neighbors.
	 * Should be called when killing an individual item
	 * @param item
	 */
	Earth.prototype.kill = function(item) {
		item.kill();
		this.updateNeighborsAfterKilling(item);
		item.neighbors = {
				top: null, 
				left: null, 
				right: null, 
				bottom: null
		};
		
		// Remove from edge and reset frame
		if (item.frame > 0) {
			this.edges.remove(item);
			this.items.add(item);
			item.frame = 0;
		}
	};

	/**
	 * Returns true for a block of earth and false for goodies or empty earth (i.e. null)
	 * @param item
	 * @returns {Boolean}
	 */
	Earth.prototype.isBlock = function(item) {
		return item !== null && item.frame < this.frames.HEALTH;
	};

	/**
	 * Sets the correct frame by checking neighbors
	 * Also adds goodies to the edge array
	 * This should only be called once after creating the item
	 * @param item to set the frame
	 */
	Earth.prototype.setFrame = function(item) {	
		if (item !== null) {
			if (item.frame === 0) {
				if (!this.isBlock(item.neighbors.left)) {
					item.frame += 1;
				}
				if (!this.isBlock(item.neighbors.bottom)) {
					item.frame += 2;
				}
				if (!this.isBlock(item.neighbors.right)) {
					item.frame += 4;
				}
				if (!this.isBlock(item.neighbors.top)) {
					item.frame += 8;
				}
			}
			
			// Add to edge
			if (item.frame > 0) {
				this.items.remove(item);
				this.edges.add(item);
			}
		}
	};

	/**
	 * Increment frame, move to edge if frame is larger than zero
	 * @param item
	 * @param increment
	 */
	Earth.prototype.incrementFrame = function(item, increment) {
		if (item.frame === 0) {
			this.edges.add(item);
			this.items.remove(item);
		}
		item.frame += increment;
	};

	/**
	 * Removes the links from all neighbors after killing the item
	 * @param item
	 */
	Earth.prototype.updateNeighborsAfterKilling = function(item) {
		if (this.isBlock(item)){
			if (this.isBlock(item.neighbors.top)) {
				item.neighbors.top.neighbors.bottom = null;
				this.incrementFrame(item.neighbors.top, 2);
			}
			if (this.isBlock(item.neighbors.left)) {
				item.neighbors.left.neighbors.right = null;
				this.incrementFrame(item.neighbors.left, 4);
			}
			if (this.isBlock(item.neighbors.right)) {
				item.neighbors.right.neighbors.left = null;
				this.incrementFrame(item.neighbors.right, 1);
			}
			if (this.isBlock(item.neighbors.bottom)) {
				item.neighbors.bottom.neighbors.top = null;
				this.incrementFrame(item.neighbors.bottom, 8);
			}
		}
	};

	/**
	 * Creates an explosion
	 * @param item used to position the explosion
	 */
	Earth.prototype.explode = function(item) {
		this.sounds.hit.play();
		var explosion = this.explosions.getFirstExists(false);
		if (explosion) {
			explosion.reset(item.body.x + item.body.width/2, -this.items.y + item.body.y + item.body.height/2);
			explosion.play("kaboom", 30, false, true);
		}
	};

	/**
	 * Moves the earth up during each frame.
	 * Checks if a new row of blocks needs to be created 
	 */
	Earth.prototype.update = function() {
		var step = 4,
		l = 0;

		if (!this.player.sprite.alive) {
			step = 1;
		}
		this.items.y -= step;
		this.edges.y -= step;
		this.explosions.y -= step;

		l = Math.floor(-this.items.y / 50) + 1;
		if (l > this.player.level) {
			this.updateLevel(l);
		}
	};
	
	/**
	 * Creates a new row of blocks by recycling the disappearing ones
	 * @param l New level
	 */
	Earth.prototype.updateLevel = function(l){
		var j = 0,
		gap = 0,
		gapWidth = 0,
		item = null,
		frame = null,
		forEach = null;

		// Update player and random parameters
		this.player.update(l);
		this.autocorrelation = this.autocorrelation * this.config.difficultyFactor;
		this.dice = (1 - this.autocorrelation) * Math.random() + this.autocorrelation * this.dice;
		gap = this.dice * this.nBlocks;
		gapWidth = Math.round(Math.random() * 3) + 3;

		// Store items from previous row
		this.previousRow = this.lastRow;
		this.lastRow = new Array(this.nBlocks);

		// Create new items for this row
		for (j = 0; j < this.nBlocks; j++) {
			item = null;
			frame = null;

			if (j < gap - gapWidth/2 || j > gap + gapWidth/2) {
				frame = 0;
			} else {
				var r = Math.random();
				if (r > 0.999) {
					frame = this.frames.BONUS;	
				} else if (r > 0.995) {
					frame = this.frames.HEALTH;
				} else if (r > 0.98) {
					frame = this.frames.ENERGY;	
				}
			}
			if (frame !== null) {
				item = this.items.getFirstExists(false);
				if (item !== null) {
					item.reset(j * this.config.blockWidth, this.height + l * this.config.levelHeight);
					item.frame = frame;
				} else {
					console.log("Running out of recycable earth.");
				}
			}
			this.lastRow[j] = item;
		}

		// Link neighbors, right most block is linked to the left most and vice versa
		for (j = 0; j < this.nBlocks; j++) {
			if (this.lastRow[j] !== null) {
				this.lastRow[j].neighbors.left = this.lastRow[(((j-1) % this.nBlocks) + this.nBlocks) % this.nBlocks];
				this.lastRow[j].neighbors.right = this.lastRow[(j+1) % this.nBlocks];
				this.lastRow[j].neighbors.top = this.previousRow[j];
			}
			if (this.previousRow[j] !== null) {
				this.previousRow[j].neighbors.bottom = this.lastRow[j];
			}
		}

		// Previous row neighbors are now linked, set their frames 
		for (j = 0; j < this.nBlocks; j++) {
			this.setFrame(this.previousRow[j]); 
		}

		// Remove disappearing earth
		forEach = function(block) {
			if (block !== null && block.body !== null && block.body.y < 0){
				this.kill(block);
			}
		}.bind(this);
		this.items.forEachAlive(forEach, this);
		this.edges.forEachAlive(forEach, this);
	};


	app.Earth = Earth;
}(App));



