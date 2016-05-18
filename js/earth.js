(function (app) {
	"use strict";

	/**
	 * Creates the earth for the game level, the earth object holds all 
	 * earth items i.e. blocks and goodies
	 * @param game
	 * @param sounds
	 * @param width
	 * @param height
	 */
	var Earth = function Earth(game, sounds, width, height) {
		this.game = game;
		this.sounds = sounds;
		this.width = width;
		this.height = height;
		this.backgroundScroll = 0;

		// Configuration
		this.config = {
				autocorrelation: 0.8,
				decay: 0.999,
				levelHeight: 50,
				blockWidth: 50,
				lfo1period: 100,
				lfo2period: 450
		};
		this.frames = {
				HEALTH: 16, 
				ENERGY: 17,
				BONUS: 18,
		};

		// Some parameters
		this.nBlocks = this.width / this.config.blockWidth;
		this.nLevels = Math.floor(this.height / this.config.levelHeight);
		
		// Block background, these are all the blocks which are not at the edge of the earth
		// i.e. the space completely surrounded by other blocks 
		this.blockfield = this.game.add.tileSprite(0, 0, this.width, this.height, "earth");

		// Background tile sprites are used to model the background
		// On the canvas they occupy the space in the crack, also each item has a background tile
		// Everything that is not covered by the by the block field 
		this.background = this.game.add.group();
		this.background.enableBody = true;
		this.background.physicsBodyType = Phaser.Physics.ARCADE;
		var tile;
		for (var x = 0; x < (2 * this.nLevels + 4); x++) {
			tile = new Phaser.TileSprite(this.game, 0, 0, this.config.blockWidth, this.config.levelHeight, "starfield");
			this.background.add(tile);
		}

		// This holds items at the edge of the earth and goodies
		// Use this to run collisions
		this.items = this.game.add.group();
		this.items.enableBody = true;
		this.items.physicsBodyType = Phaser.Physics.ARCADE;
		this.items.createMultiple(6 * (this.nLevels + 4), "earth");

		// Maintain list of last row of cells created
		// Use this to link neighboring cells
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
		this.background.y = 0;
		this.explosions.y = 0;
		for (var i = 0; i < this.nBlocks; i++) {
			this.lastRow[i] = null;
		}
		this.autocorrelation = this.config.autocorrelation;
		this.lfo1period = this.config.lfo1period;
		this.lfo2period = this.config.lfo2period;
		this.random = 0.5;
		this.lfo = 0.5;
		
		this.items.forEach(this.kill, this);
		this.items.callAll("kill"); // forEach(this.kill) does not kill all
		this.background.callAll("kill");
		
		console.log("Earth reset");
		console.log("	Items " + this.items.length + " / " + this.items.countLiving() + "  alive." );
		console.log("	Background sprites "+ this.background.length + " / " + this.background.countLiving() + " alive." );
		
		// Set the first background tile for the space until the blocks start
		var tile = this.background.next();
		tile.reset(0, 0);
		tile.width = this.width;
		tile.height = this.height;
	
		this.updateLevel(0);
	};

	/**
	 * Recycles an item by killing it and relinking its neighbors.
	 * Should be called when killing an individual item
	 * @param item
	 */
	Earth.prototype.kill = function(item, updateFrame) {
		var cell = item.cell;
		
		// Reset cell
		if (typeof cell !== "undefined" && cell !== null) {
			
			// Update game item frame
			if (this.isBlock(cell) && (updateFrame || typeof updateFrame === "undefined")) {
				
				// Reset frame
				cell.frame = null;
				cell.item = null;
				
				this.updateFrame(cell.neighbors.left);
				this.updateFrame(cell.neighbors.right);
				this.updateFrame(cell.neighbors.top);
				this.updateFrame(cell.neighbors.bottom);
			} else {
				
				// Reset frame
				cell.frame = null;
				cell.item = null;
			}
		}
		
		// Kill item
		item.kill();
		item.anchor.setTo(0, 0);
		item.body.moves = false;
		item.frame = 0;
		item.width = this.config.blockWidth;
		item.cell = null;
		item.background = null;
	};

	/**
	 * Updates the frame of the cell
	 * creates a new game item if necessary
	 * @param cell
	 */
	Earth.prototype.updateFrame = function(cell) {
		var frame = 0;
		if (cell === null) {
			return;
		}

		// Recalculate frame
		if (this.isBlock(cell)) {
			if (!this.isBlock(cell.neighbors.left)) {
				frame += 1;
			}
			if (!this.isBlock(cell.neighbors.bottom))  {
				frame += 2;
			} 
			if (!this.isBlock(cell.neighbors.right)) {
				frame += 4;
			}
			if (!this.isBlock(cell.neighbors.top)) {
				frame += 8;
			}
			cell.frame = frame;

			// Update existing block frame
			if (cell.item !== null){
				cell.item.frame = frame;
			} 
		}

		// Create item
		if (cell.item === null){
			this.createItem(cell);	
		}
	};
	
	/**
	 * Adds to the cell object an actual game item i.e. block, goodie or gap
	 * @param item to set the frame
	 */
	Earth.prototype.createItem = function(cell) {
		var 
			item = null,
			x = cell.j * this.config.blockWidth,
			y = this.height + cell.l * this.config.levelHeight;
		
		// Item already attached
		if (cell.item !== null){
			return;
		}

		// Create new item if not gap and not block surrounded by other blocks completely
		if (cell.item === null && cell.frame > 0) {
			item = this.items.getFirstExists(false);
			if (item === null){
				console.error("Running out of earth items.");
			}
			item.reset(x, y);
			item.frame = cell.frame;
			cell.item = item;
			item.cell = cell;
		}
		
		// Attach a background but not for blocks surrounded by other blocks completely
		if (cell.frame === null || cell.frame > 0){
			this.createBackground(cell, x, y);
		}
	};

	/**
	 * Attaches a background sprite to the cell
	 * @param cell
	 * @param x position of cell item
	 * @param y position of cell item
	 */
	Earth.prototype.createBackground = function(cell, x, y) {
		var item = null;
		
		// Do nothing for blocks surrounded completely or if gap already exists
		if (cell.frame === 0 || this.hasBackground(cell)) {
			return;
		}

		// If background item already exists left then expand it
		if (this.hasBackground(cell.neighbors.left)) {
			item = cell.neighbors.left.background;
			item.width += this.config.blockWidth;
		}
		
		// If background exists right then expand it
		else if (this.hasBackground(cell.neighbors.right)) {
			item = cell.neighbors.right.background;
			item.x -= this.config.blockWidth;
			item.tilePosition.x = -x;
			item.width += this.config.blockWidth;
		}

		// Else create a new background
		else {
			item = this.background.next();
			item.reset(x, y);
			item.tilePosition.x = -x;
			item.tilePosition.y = -y + this.backgroundScroll;
			item.width = this.config.blockWidth;
			item.height = this.config.levelHeight;
		}
		
		// Attach background to parent cell
		cell.background = item;
	};

	/**
	 * Moves the earth up during each frame.
	 * Checks if a new row of blocks needs to be created 
	 */
	Earth.prototype.update = function(player) {
		var step = 4,
		l = 0;

		if (!player.sprite.alive) {
			step = 1;
		}
		
		// Scroll blocks
		this.items.y -= step;
		this.background.y -= step;
		this.explosions.y -= step;
		this.blockfield.tilePosition.y = this.items.y % this.config.levelHeight;
		
		// Scroll background slower than blocks
		this.backgroundScroll = Math.floor(this.items.y / 8);
		var scroll = function(item) {
			item.tilePosition.y = -item.y + this.backgroundScroll;	
		}.bind(this);
		this.background.forEach(scroll);
		
		l = Math.floor(-this.items.y / this.config.levelHeight) + 1;
		if (l > player.level) {
			player.updateLevel(l);
			this.updateLevel(l);
		}
	};

	/**
	 * Creates a new row of blocks by recycling the disappearing ones
	 * @param l New level
	 */
	Earth.prototype.updateLevel = function(l){
		var j = 0,
		lfo1 = 0,
		lfo2 = 0,
		gap = 0,
		gapWidth = 0,
		cell = null,
		frame = null,
		forEach = null;

		// Update player and random parameters
		this.autocorrelation = this.autocorrelation * this.config.decay;
		this.lfo1period = this.lfo1period * this.config.decay;
		this.lfo2period = this.lfo2period * this.config.decay * this.config.decay;
		this.random = (1 - this.autocorrelation) * Math.random() + this.autocorrelation * this.random;
		lfo1 = (Math.sin(l * 2 * Math.PI / this.lfo1period) + 1) / 2;
		lfo2 = (Math.sin(l * 2 * Math.PI / this.lfo2period) + 1) / 2;
		gap = (lfo1/3 + lfo2/3 + this.random/3) * (this.nBlocks - 4) + 2;
		gapWidth = Math.round(Math.random() * 3) + 3;

		// Store cells from previous row
		this.previousRow = this.lastRow;
		this.lastRow = new Array(this.nBlocks);

		// Create new cells for this row
		for (j = 0; j < this.nBlocks; j++) {
			cell = null;
			frame = null;

			if (j < Math.max(1, gap - gapWidth/2) || j > Math.min(this.nBlocks-2, gap + gapWidth/2)) {
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

			// Create cell
			cell = {
					item: null,
					j: j,
					l: l,
					frame: frame,
					neighbors: {
						top: null, 
						left: null, 
						right: null, 
						bottom: null
					}
			};
			this.lastRow[j] = cell;
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

		if (l === 0) {
			return;
		}
		
		// Previous row place holders are now linked, set their frames
		for (j = 0; j < this.nBlocks; j++){
			this.updateFrame(this.previousRow[j]);
		}
			
		// Remove disappearing earth
		forEach = function(item) {
			if (item !== null && item.body !== null && item.body.y < 0){
				this.kill(item, false);
			}
		}.bind(this);
		this.items.forEachAlive(forEach, this);
	};

	/**
	 * Returns true for a block of earth and false for goodies or gap items (i.e. null)
	 * @param item
	 * @returns {Boolean}
	 */
	Earth.prototype.isBlock = function(cell) {
		return cell !== null && cell.frame !== null && cell.frame < this.frames.HEALTH;
	};
	
	
	/**
	 * Returns true if the cell has a background attached
	 * @param item
	 * @returns {Boolean}
	 */
	Earth.prototype.hasBackground = function(cell) {
		return typeof cell.background !== "undefined" && cell.background !== null;
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

	app.Earth = Earth;
}(App));



