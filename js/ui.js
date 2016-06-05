(function (app) {
	"use strict";

	/**
	 * Module for all user interaction that is not handled by Phaser via the canvas directly.
	 * E.g. the splash screens and menu lives outside the canvas 
	 * This is so the can be made full screen, even if the canvas has a maximum width. 
	 * Also fonts render nicer outside the canvas and we can use HTML, CSS and jQuery. 
	 * @param music Handle to the music module
	 */
	var Ui = function Ui(music) {
		this.music = music;
		this.touch = false;
		this.orientation = null;

		// Detect support of device orientation interface
		// Player will be steered by tilting the phone
		var deviceOrientationListener = function(event) {
			var orientation = null;
			if (event.beta > 30){
				orientation = event.gamma;
			} else if (event.gamma < -30) {
				orientation = event.beta;
			} else if (event.gamma > 30) {
				orientation = -event.beta;
			}
			if (orientation !== null){
				this.orientation = Math.max(Math.min(orientation / 20.0, 1.0), -1.0);
			}
		}.bind(this);
		if (window.DeviceOrientationEvent) {
			window.addEventListener("deviceorientation", deviceOrientationListener);
		}

		// Detect touch support
		var onTouchEnd = null;
		onTouchEnd = function() {
			$("#splashscreen").unbind("touchend", onTouchEnd);
			this.touch = true;
		}.bind(this);
		$("#splashscreen").bind("touchend", onTouchEnd);
	};

	/**
	 * After the game and ui are loaded start the application 
	 * by showing the audio consent screen, aka player.
	 * Note the player is not the same DOM element as the splash screen shown later
	 * Once clicked, the audio is loaded and the audio consent screen aka player
	 * transforms into a simple mute/unmute button
	 * Once the audio is loaded the start screen is shown by calling startScreen()
	 * 
	 */
	Ui.prototype.loadScreen = function(callback, context) {

		// Add a click handler on the audio player element
		var onAudioClick = function(e) {
			e.preventDefault();
			e.stopPropagation();

			// Consent screen clicked
			if ($("#player").hasClass("fullscreen")) {
				$("#player").removeClass("fullscreen");
				$(".help").removeClass("hidden");
				if (this.orientation === null){
					$(".deviceorientation-on").addClass("hidden");
				} else {
					$(".deviceorientation-off").addClass("hidden");
				}
				this.showSplashScreen("", "Loading audio");
				var onAudioLoad = function(){
					$("#player_pause").removeClass("hidden");
					this.startScreen(callback, context);
				}.bind(this);
				this.music.load(1, onAudioLoad);
			} else {

				// Mute/unmute button was clicked
				this.music.mute();
				$(".playerbutton").toggleClass("hidden");
			}
		}.bind(this);
		this.addHandler($("#player"), onAudioClick, false);
		$("#splashscreen").addClass("hidden");
		$("#player").removeClass("hidden");
	};

	/**
	 * Shows the splash screen to start the game
	 */
	Ui.prototype.startScreen = function(onHidden, context) {
		$("#loader").addClass("hidden");
		this.showSplashScreen("", "Press any key to start your mission.");
		this.setSplashScreenHandler(onHidden, context);
	};
	
	/**
	 * Shows the stage complete screen
	 */
	Ui.prototype.levelScreen = function(level, onHidden, context) {
		this.showSplashScreen("Stage complete!", "Loading audio");
		var onAudioLoad = function() {
			this.showSplashScreen("Stage complete!", "Press any key to continue your mission.");
			this.setSplashScreenHandler(onHidden, context);
		}.bind(this);
		this.music.load(level, onAudioLoad);
	};

	/**
	 * Shows the pause screen
	 */
	Ui.prototype.pauseScreen = function(callback, context) {
		this.showSplashScreen("Paused", "Press any key to continue.");
		this.setSplashScreenHandler(callback, context);
	};

	/**
	 * Shows the game over screen
	 */
	Ui.prototype.gameOverScreen = function(callback, context) {
		this.showSplashScreen("GAME OVER", "");
		var delayedCallback = function() {
			this.showSplashScreen("GAME OVER", "Press any key to restart");
			this.setSplashScreenHandler(callback, context);
		}.bind(this); 
		setTimeout(delayedCallback, 3000);
	};
	
	/**
	 * Win screen
	 */
	Ui.prototype.winScreen = function(callback, context) {
		this.showSplashScreen("WELL DONE EARTHLING!", "You made it to the core of the planet.");
		var delayedCallback = function() {
			this.showSplashScreen("WELL DONE EARTHLING!", "Press any key to restart");
			this.setSplashScreenHandler(callback, context);
		}.bind(this); 
		setTimeout(delayedCallback, 60000);
	};

	/**
	 * Shows a splash screen
	 * @param header {Sting} Large header in the splash screen
	 * @param text {String} Small text in the splash screen 
	 */
	Ui.prototype.showSplashScreen = function(header, text) {
		$("#header").text(header);
		$("#text").text(text);
		$("#splashscreen").removeClass("hidden");
	};

	/**
	 * Adds a click handler to the splash screen 
	 * the handler first hides the splash screen again, then calls the callback 
	 * @param callback
	 * @param context
	 */
	Ui.prototype.setSplashScreenHandler = function(onHidden, context) {
		var callback = function() {
			this.hideSplashScreen(onHidden, context);
		}.bind(this);
		this.addHandler($("#splashscreen"), callback, true);
	};

	/**
	 * Hides the splash screen, and calls the callback 
	 * after flickering the splash screen for a while
	 * This also always stops the music
	 * @param callback {function} to be called after hiding
	 */
	Ui.prototype.hideSplashScreen = function(callback, context) {
		this.music.stopTracks(1.1);
		var flicker = setInterval(function() {
			$("#text").toggleClass("flicker");
		}, 100);
		setTimeout(function() {
			clearInterval(flicker);
			$("#text").removeClass("flicker");
			$("#header").text("");
			$("#text").text("");
			$(".help").addClass("hidden");
			$("#splashscreen").addClass("hidden");
			if (typeof callback !== "undefined") {
				callback.call(context);
			}
		}, 1100);
	};

	/**
	 * Updates menu with player score, health, energy etc.
	 * @param player Player object
	 */
	Ui.prototype.update = function(player) {
		var levelString = "Level : ";
		var depthString = " | Depth : ";
		if (player.depth > player.highScore) {
			player.highScore = player.depth;
		}
		$("#menu_left").text(levelString + this.format(player.level, 1) + depthString + this.format(player.depth * 5, 5) + "/" + this.format(player.goal * 5, 5) + "m");
		$("#health_bar").width(String(player.shield) + "%");
		if (player.bonus > 0){
			$("#energy_bar").addClass("hidden");
			$("#bonus_bar").width(String(player.bonus) + "%");
			$("#bonus_bar").removeClass("hidden");    	
		} else {
			$("#bonus_bar").addClass("hidden");
			$("#energy_bar").width(String(player.energy) + "%");
			$("#energy_bar").removeClass("hidden");
		}
	};

	/**
	 * Attaches a click handler and a key down handler to a DOM element
	 * @param element
	 * @param f Function to be attached as click and key down handler
	 * @param clickOnce if true then the click handler will be removed after being called once
	 */
	Ui.prototype.addHandler = function(element, f, clickOnce) {
		var wrapper = null;
		wrapper = function(e) {

			// Ignore control, alt, cmd keys in the key down handler
			if (!(e.keyCode === Phaser.Keyboard.CONTROL ||
					e.keyCode === Phaser.Keyboard.ALT ||
					e.keyCode === 91)) {
				if (clickOnce) {
					element.off("click", wrapper);
				}
				$(document).off("keydown", wrapper);
				f(e);
			}
		}.bind(this);
		element.on("click", wrapper);
		$(document).on("keydown", wrapper);
	};

	/**
	 * Converts number to text for formatting score in menu
	 * with leading zeros
	 * @param {Number} value 
	 * @param d {Number} number of digits 
	 * @returns {String}
	 */ 
	Ui.prototype.format = function(value, d){
		var v = value,
		string = "",
		i = 0;
		for (i = d; i > 0; i--){
			var p = Math.pow(10, i-1);
			string = string + Math.floor(v / p);
			v -= Math.floor(v / p) * p;
		}
		return string;
	};
	
	/**
	 * Shows a splash screen with an error message
	 * @param message
	 */
	/*Ui.prototype.alert = function(message){
		$("#splashscreen").removeClass("hidden");
		$("#header").text("ERROR");
		$("#text").text(message);
		this.setSplashScreenHandler();
	};*/

	app.Ui = Ui;
}(App));


