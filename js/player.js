(function (app) {
	"use strict";

	/**
	 * Player object, consists of the player sprite, the current level, health etc.
	 * @param game Handle to the game object
	 * @param ui Handle to the ui object
	 * @param music Handler to the music object
	 * @param width Game width
	 */
	var Player = function Player(game, ui, music, width) {
		this.game = game;
		this.ui = ui;
		this.music = music;
		this.width = width;
		this.highScore = 0;
		this.starship = false;
		this.sprite = this.game.add.sprite(this.width/2, 80, "ship");
		this.sprite.anchor.setTo(0.5, 0.5);
		this.game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
		this.reset();
	};

	/**
	 * Resets the player to restart game
	 * Revives the player, restores health, energy and bonus 
	 * and repositions the player in the middle of the screen 
	 */
	Player.prototype.reset = function() {
		this.stage = 1;
		this.level = 1;
		this.depth = -1;
		this.goal = 0;
		this.shield = 100;
		this.energy = 100;
		this.bonus = 0;
		this.starship = false;
		this.sprite.revive();
		this.sprite.x = this.width/2;
	};

	/**
	 * Updates the level count in the player object
	 * Also increases the energy and decreases bonus during each step
	 * @param level
	 */
	Player.prototype.update = function(depth, goal) {
		if (depth !== this.depth){
			this.depth = depth;
			this.goal = goal;
			if (this.energy < 100) {
				this.energy += 1;
			}
			if (this.bonus > 0){
				this.bonus -=1;
				
				// Change music when bonus has run out
				if (this.bonus === 0) {
					this.music.doubleTime(false);
				}
			}
			
			// Blinking player change tint every
			if (this.starship) {
				if (depth % 2 === 0) {
					this.sprite.frame = 1;
				} else {
					this.sprite.frame = 2;
				}
			}
			
			// Update status
			if (this.sprite.alive) {
				this.ui.update(this);
			}
		}
	};

	app.Player = Player;
}(App));