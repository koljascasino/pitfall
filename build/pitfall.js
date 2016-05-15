/*global App: true*/
/*jshint unused:false*/

var App = (function () {
    "use strict";
    
   return {};
}());

$(function(){
	var contextClass = (window.AudioContext || 
			window.webkitAudioContext || 
			window.mozAudioContext || 
			window.oAudioContext || 
			window.msAudioContext);
	if (contextClass) {

		// Create audio context
		var context = new contextClass();

		// Start game
		var music = new App.Music(context);
		var ui = new App.Ui(music);
		var game = new Phaser.Game(800, 600, Phaser.AUTO, "canvas_container");
		var gameState = new App.GameState(ui, music, game, 800, 600);
		game.state.add("game", gameState, true);

	} else {
		$("#loader").addClass("hidden");
		$("#header").text("ERROR");
		$("#text").text("This game requires a browser which supports WebAudio.");
	}
});
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
		this.levelString = "Level : ";
		this.highScoreString = " | High score : ";
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
				this.music.load(onAudioLoad);
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
	Ui.prototype.startScreen = function(callback, context) {
		$("#loader").addClass("hidden");
		this.showSplashScreen("", "Press any key to start your mission.");
		this.setSplashScreenHandler(callback, context);
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
	Ui.prototype.setSplashScreenHandler = function(callback, context) {
		var onHidden = function() {
			this.hideSplashScreen(callback, context);
		}.bind(this);
		this.addHandler($("#splashscreen"), onHidden, true);
	};

	/**
	 * Hides the splash screen, and calls the callback 
	 * after flickering the splash screen for a while
	 * @param callback {function} to be called after hiding
	 */
	Ui.prototype.hideSplashScreen = function(callback, context){
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
		if (player.level > player.highScore) {
			player.highScore = player.level;
		}
		$("#menu_left").text(this.levelString + this.format(player.level, 5) + this.highScoreString + this.format(player.highScore, 5));
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



(function (app) {
	"use strict";
	
	/**
	 * Manages the music, loads, loops and synchronizes the tracks and plays sound effect via WebAudio.
	 * @param context {AudioContext}
	 */
	var Music = function Music(context) {
		this.context = context;
		this.sounds = {};
		this.tracks = {};
		this.onLoad = null; 
		this.startDelay = 0.1;
		this.extension = "." + this.getAudioExtension();
		this.muted = false;
		this.master = this.context.createGain();
		this.master.connect(this.context.destination);
		this.master.gain.value = 1.0;
		this.unlocked = false;
		this.loading = false;
	};
	
	/**
	 * Mutes/unmutes the music
	 */
	Music.prototype.mute = function() {
		if (this.master.gain.value === 0){
			this.master.gain.value = 1;
		} else {
			this.master.gain.value = 0;
		}
	};
	
	/**
	 * Loads the audio files and calls callback function when ready
	 * @param onLoad callback when all files are loaded
	 */
	Music.prototype.load = function(onLoad) {
		this.onLoad = onLoad;
		this.unlock();
		this.sounds.hurt = new app.Sound(this, "hurt");
		this.sounds.die = new app.Sound(this, "die");
		this.sounds.arrow = new app.Sound(this, "arrow");
		this.sounds.hit = new app.Sound(this, "hit");
		this.sounds.rupee = new app.Sound(this, "rupee");
		this.sounds.shield = new app.Sound(this, "shield");
		this.tracks.pause = new app.Track(this, "pause", 45.176485260770974, {loop: 1.0});
		this.tracks.loop1 = new app.Track(this, "loop1", 39.529433106575965, {loop: 0.2, loop2: 0.8});
		this.tracks.loop2 = new app.Track(this, "loop2", 33.88235827664399, {loop: 0.2, loop1: 0.8});
		this.tracks.drums0 = new app.Track(this, "drums0", 11.294126984126985, {drums1: 1.0});
		this.tracks.drums1 = new app.Track(this, "drums1", 5.647074829931973, {loop: 0.8, drums0: 0.2});
		this.tracks.drums2 = new app.Track(this, "drums2", 11.294126984126985, {loop: 0.8, drums3: 0.2});
		this.tracks.drums3 = new app.Track(this, "drums3", 11.294126984126985, {drums2: 1.0});
		this.masterTrack = this.tracks.pause;
	};
	
	/**
	 * Creates and empty buffer and plays it in the hope this will unlock/unmute
	 * the AudioContext in iOS.
	 */
	Music.prototype.unlock = function() {
		if (!this.unlocked) {
			this.unlocked = true;
			var buffer = this.context.createBuffer(1, 1, 22050);
			var source = this.createBufferSource(buffer);
			source.connect(this.master);
			source.start(0);
			console.log("Audio unlocked. Playing " + this.extension + " files");
		}
	};
	
	/**
	 * Checks if all audio files are loaded and calls the callback if they are
	 * @returns {Boolean}
	 */
	Music.prototype.ready = function() {
		var key = null;
		for (key in this.tracks) {
			if (!this.tracks[key].ready) {
				return false;
			} 		
		}
		for (key in this.sounds) {
			if (!this.sounds[key].ready) {
				return false;
			} 		
		}
		console.log("Audio files loaded");
		if (this.onLoad !== null) {
			this.onLoad();
		}
		return true;
	};
	
	/**
	 * Stop all tracks and play intro/pause music
	 */
	Music.prototype.pause = function() {
		this.stopTracks(0.1);
		this.masterTrack = this.tracks.pause;
		this.tracks.pause.play(0, 0);
	};
	
	/**
	 * Stop all tracks and play master track 
	 */
	Music.prototype.play = function() {
		this.stopTracks(0.1);
		this.masterTrack = this.tracks.loop1;
		this.tracks.loop1.play(0, 0);
		this.tracks.drums1.play(0, 0);
	};
	
	/**
	 * Stops all tracks
	 */
	Music.prototype.stop = function(){
		this.stopTracks(1);
	};
	
	/**
	 * Switch beat to half time 
	 */
	Music.prototype.halfTime = function(){
		this.tracks.drums0.stop(0, 0.2);
		this.tracks.drums1.play(0, 0.5);
		this.tracks.drums2.stop(0, 0.5);
		this.tracks.drums3.stop(0.2);
	};
	
	/**
	 * Switch beat to double time
	 */
	Music.prototype.doubleTime = function(){
		this.tracks.drums0.stop(0, 0.2);
		this.tracks.drums1.stop(0, 0.2);
		this.tracks.drums2.play(0, 0.2);
		this.tracks.drums3.stop(0.2);
	};
	
	/**
	 * Creates a new BufferSource from an AudioBuffer instance
	 * @param buffer
	 * @returns BufferSource
	 */
	Music.prototype.createBufferSource = function(buffer) {
		var source = this.context.createBufferSource();
		source.buffer = buffer;
		return source;
	};
	
	/**
	 * Fetch and decode an audio asset, then pass the AudioBuffer
	 * to the supplied callback
	 * @param context {AudioContext}
	 * @param path Path to the audio asset
	 * @param key name of the audio asset (excluding extension)
	 * @param callback to pass on the AudioBuffer
	 */
	Music.prototype.loadAudio = function(context, path, key, callback) {
		var request = new XMLHttpRequest();
		var url = path + key + this.extension;
		request.open("GET", url, true);
		request.responseType = "arraybuffer";
		request.onload = function() {
			context.decodeAudioData(request.response, function(buffer) {
				if (!buffer) {
					alert("Error decoding audio file " + url + ".");
					return;
				}
				callback(buffer);
			});
		};
		request.onerror = function() {
			alert("Error loading audio file.");
		};
		request.send();
	};
	
	/**
	 * Stop all tracks
	 */
	Music.prototype.stopTracks = function(fadeTime){
		for (var key in this.tracks) {
			this.tracks[key].stop(fadeTime);
		}
	};
	
	/**
	 * Check if browser can play audio files of a given type
	 * @param ext Extension of the audio file
	 * @returns {Boolean} True if the browser can handle the file
	 */
	Music.prototype.canPlayAudio = function(ext) {  
		var a = document.createElement("audio");
		return ( !! (a.canPlayType && a.canPlayType("audio/" + ext + ";").replace(/no/, "")));
	};
	
	/**
	 * Checks if the browser can play .ogg or "m4a" files and 
	 * returns the preferred audio extension, 
	 * @returns {String} extension
	 */
	Music.prototype.getAudioExtension = function() {  
		var extension = "wav";
		if (this.canPlayAudio("ogg")) {
			extension = "ogg";
		}
		else if (this.canPlayAudio("mp4")) {
			extension = "m4a";
		}
		return extension;
	};

	app.Music = Music;
}(App));
(function (app) {
	"use strict";

	/**
	 * Loads, plays, stops and loops a track with WebAudio.
	 * Note we are not using the WebAudio loop property, since it produces gaps with compressed files
	 * Instead we always schedule next track at the end of the present track as soon as the previous track has ended.
	 * @param music
	 * @param key
	 * @param duration
	 * @param nextMap
	 */
	var Track = function Track(music, key, duration, nextMap) {
		this.music = music;
		this.key = key;
		this.config = {
				path: "music/"
		};
		this.buffer = null;
		this.ready = false;
		this.duration = duration;
		this.offset = 0;
		this.started = false;
		this.deck = 0;
		this.nextMap = nextMap;
		this.next = null;
		this.nodes = [{}, {}];

		// Track loaded callback
		// Check if all tracks are loaded and start playing master track
		var onLoaded = function(buffer) {
			console.log(this.config.path + this.key + this.music.extension + " loaded. Length " + String(buffer.length) + " samples or " + String(buffer.duration) + "s");
			this.buffer = buffer;
			this.ready = true;

			// Check if this was the last track to be loaded
			this.music.ready();

			// Start playing master track as soon as its loaded
			if (this.music.masterTrack === this) {
				this.play(0, 0);
			}
		}.bind(this);
		this.music.loadAudio(this.music.context, this.config.path, this.key, onLoaded); 
	};

	/**
	 * Start playing track
	 * @param startTime
	 * @param fadeTime
	 */
	Track.prototype.play = function(startTime, fadeTime){

		// If track is already playing do nothing
		if (startTime === 0 && this.started) {
			return;
		}
		this.start(startTime, fadeTime);
		this.scheduleNext();
	};

	/**
	 * Load buffer and start playing track
	 * @param startTime
	 * @param fadeTime
	 */
	Track.prototype.start = function(startTime, fadeTime) {

		// Calculate start time and start track
		this.plays = 1;
		if (startTime  === 0) {
			this.startTime = this.music.context.currentTime + this.music.startDelay; 
			this.offset = (this.startTime - this.music.masterTrack.startTime) % this.music.masterTrack.duration % this.duration;
		} else {
			this.startTime = startTime;
			this.offset = 0;
		} 
		console.log("Starting " + this.key + " at time "+ this.startTime + " master track: " + this.music.masterTrack.key + " offset " + String(this.offset));

		this.startDeck(this.startTime, this.offset, fadeTime);
		this.started = true;
	};

	/**
	 * Since we want to play loops we potentially need the same track (buffer) in two different decks
	 * Such that the second deck can start immediately when the first deck is scheduled to end
	 * @param startTime
	 * @param offset
	 * @param fadeTime
	 */
	Track.prototype.startDeck = function(startTime, offset, fadeTime){

		// Switch deck
		if (this.deck === 0){
			this.deck = 1;
		} else {
			this.deck = 0;
		}

		// Set up nodes and schedule play
		var nodes = this.nodes[this.deck];
		nodes.source = this.music.createBufferSource(this.buffer);
		nodes.source.playbackRate.value = 1;
		nodes.gain = this.music.context.createGain();
		nodes.source.connect(nodes.gain);
		nodes.gain.connect(this.music.master);
		nodes.source.start(startTime, offset);

		// Fade in
		if (fadeTime > 0) {
			nodes.gain.gain.linearRampToValueAtTime(0, startTime);
			nodes.gain.gain.linearRampToValueAtTime(1, startTime + fadeTime);
		} else {
			nodes.gain.gain.value = 1;
		}

		// Set up callback
		nodes.source.onended = this.onEnded.bind(this);
	};

	/**
	 * Loop track, switch decks
	 * @param startTime
	 */
	Track.prototype.loop = function(startTime) {
		console.log("Looping " + this.key + " at time " + startTime);
		this.startDeck(startTime, 0, 0);
	};

	/**
	 * Schedules the next track at the time when this one has ended
	 */
	Track.prototype.scheduleNext = function() {

		// Figure out which track to play next
		var dice = Math.random();
		for (var next in this.nextMap) {
			if (dice <= this.nextMap[next]) {

				// Schedule next track
				var startTimeNext = this.startTime + this.duration * this.plays - this.offset;
				if (next === "loop") {
					this.next = this.key;
					this.loop(startTimeNext);
				} else {
					this.music.tracks[next].start(startTimeNext, 0);
					this.next = next;
				}
				break;
			}
			dice -= this.nextMap[next];
		}
	};

	/**
	 * Schedule the next track as soon as this one has stopped playing
	 */
	Track.prototype.onEnded = function() {
		this.plays += 1;
		if (this.music.masterTrack === this && this.next !== this.key){
			console.log("Switching master track to " + this.next);
			this.music.masterTrack = this.music.tracks[this.next];
		}
		this.music.tracks[this.next].scheduleNext();
		if (this.next !== this.key){
			this.started = false;
		}
	};

	/**
	 * Stop playing track immediately
	 * @param fadeTime
	 */
	Track.prototype.stop = function(fadeTime) {
		for (var deck = 0; deck < 2; deck++) {
			if (typeof this.nodes[deck].source !== "undefined") {
				this.nodes[deck].source.onended = null;
				if (fadeTime > 0) {
					this.nodes[deck].gain.gain.linearRampToValueAtTime(0, this.music.context.currentTime + fadeTime);
					this.started = false;
				}
				try {
					this.nodes[deck].source.stop(this.music.context.currentTime + fadeTime);
					this.started = false;
				}
				catch(e){
					console.log(e);
				}
			}
		}
	};

	app.Track = Track;
}(App));
(function (app) {
	"use strict";

	/**
	 * Loads and plays a sound file 
	 * @param music Handle to the music module
	 * @param key filename without extension
	 */
	var Sound = function Sound(music, key) {
		this.music = music;
		this.key = key;
		this.config = {
				path: "sounds/",
				gain: 0.6,
				retriggerdelay: 0.1
		};
		this.buffer = null;
		this.ready = false;
		this.startTime = null;

		// Set flag when sound is loaded and call callback function 
		var onLoaded = function(buffer) {
			console.log(this.config.path + this.key + this.music.extension + " loaded.");
			this.buffer = buffer;
			this.ready = true;
			this.music.ready();
		}.bind(this);
		music.loadAudio(this.music.context, this.config.path, this.key, onLoaded);
	};

	/**
	 * Play the sound
	 */
	Sound.prototype.play = function() {

		// Do not play the sound again if it has been triggered already during the last 100ms
		var now = this.music.context.currentTime;
		if (this.startTime === null || now > this.startTime + this.config.retriggerdelay) {
			this.startTime = now;
			var nodes = {};
			nodes.source = this.music.createBufferSource(this.buffer);
			nodes.source.playbackRate.value = 1;
			nodes.gain = this.music.context.createGain();
			nodes.source.connect(nodes.gain);
			nodes.gain.connect(this.music.master);
			nodes.source.start(0);
			nodes.gain.gain.value = this.config.gain;
		}
	};

	app.Sound = Sound;
}(App));
(function (app) {
	"use strict";

	/**
	 * Implements and extends the Phaser GameState object.
	 * This hold all information about the current game state
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
		this.sounds = music.sounds;
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
		this.game.load.image("playerLight", "img/light_800x600.png");
		this.game.load.image("ship", "img/ship.png");
		this.game.load.spritesheet("kaboom", "img/explosion.png", 128, 128);
		this.game.load.image("starfield", "img/starfield.png", this.width, this.height);
	};

	GameState.prototype.create = function() {

		//  The scrolling starfield background
		this.starfield = this.game.add.tileSprite(0, 0, this.width, this.height, "starfield");

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

		// The earth
		this.earth = new app.Earth(this.game, this.sounds, this.player, this.width, this.height);

		// Shadow and light texture
		this.light = {};
		this.light.texture = this.game.add.bitmapData(this.width, this.height);
		this.light.image = this.game.add.image(0, 0, this.light.texture);
		this.light.image.blendMode = Phaser.blendModes.MULTIPLY;    
		this.updateShadowTexture();

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
	 * Updates the shadow texture (this.shadowTexture).
	 * First, it fills the entire texture with a dark shadow color.
	 * Then it draws a white circle centered on the pointer position.
	 * Because the texture is drawn to the screen using the MULTIPLY
	 * blend mode, the dark areas of the texture make all of the colors
	 * underneath it darker, while the white area is unaffected.
	 */
	GameState.prototype.updateShadowTexture = function() {

		var radius = 400;

		// Draw shadow
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

		// Scroll the background
		this.starfield.tilePosition.y -= 1;
		this.earth.update();
		this.updateShadowTexture();
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
		if (this.player.sprite.x < this.player.sprite.width/2) {
			this.player.sprite.x = this.player.sprite.width/2;
			this.player.sprite.body.velocity.x = 0;
		} else if (this.player.sprite.x > this.width - this.player.sprite.width/2) {
			this.player.sprite.x = this.width - this.player.sprite.width/2;
			this.player.sprite.body.velocity.x = 0;
		}

		//  Run collision
		this.game.physics.arcade.overlap(this.bullets, this.earth.edges, this.bulletHitsEarth, null, this);
		this.game.physics.arcade.overlap(this.earth.edges, this.player.sprite, this.playerHitsEarth, null, this);
	};

	GameState.prototype.play = function() {
		this.game.paused = false;
		this.music.play();
		if (this.player.bonus > 0){
			this.music.doubleTime();
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
		this.earth.reset();
		this.player.reset();
		this.music.play();
		this.input.pauseButton.onDown.add(this.pause, this);
	};

//	Bullet hits earth
	GameState.prototype.bulletHitsEarth = function(bullet, item) {

		// Bullet hits earth, create explosion
		// Do not collide with items
		if (item.frame < this.earth.frames.HEALTH) {
			bullet.kill();
			this.earth.explode(item);
			this.earth.kill(item);
		}
	};

//	Player hits earth
	GameState.prototype.playerHitsEarth = function(player, item) {
		if (item.frame >= this.earth.frames.HEALTH){		
			this.playerHitsGoodie(item);
			this.earth.kill(item);
		}
		else {
			this.playerTakesHit(item);
			this.earth.kill(item);
		}	
	};


	GameState.prototype.fireBullet = function() {

		//  To avoid them being allowed to fire too fast we set a time limit
		if (this.player.sprite.alive && this.game.time.now > this.bulletTime && (this.player.energy > 0 || this.player.bonus > 0)) {

			//  Grab the first bullet we can from the pool
			var bullet = this.bullets.getFirstExists(false);

			if (bullet) {
				if (this.player.bonus > 0){
					bullet.reset(this.player.sprite.x - 22, this.player.sprite.y + 30);
					bullet.body.velocity.y = 400;
					bullet.body.velocity.x = this.player.sprite.body.velocity.x/2;
					this.bulletTime = this.game.time.now + 200;
					bullet = this.bullets.getFirstExists(false);
					bullet.reset(this.player.sprite.x + 22, this.player.sprite.y + 30);
					bullet.body.velocity.y = 400;
					bullet.body.velocity.x = this.player.sprite.body.velocity.x/2;
					this.bulletTime = this.game.time.now + 200;
					this.sounds.arrow.play();
				} else {
					bullet.reset(this.player.sprite.x, this.player.sprite.y + 30);
					bullet.body.velocity.y = 400;
					bullet.body.velocity.x = this.player.sprite.body.velocity.x/2;
					this.bulletTime = this.game.time.now + 200;
					this.sounds.arrow.play();
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
			this.music.doubleTime();
			this.player.bonus = 100;
		}
		this.sounds.rupee.play();
		this.ui.update(this.player);
	};

	GameState.prototype.playerTakesHit = function(item) {

		// Decrease health
		this.player.shield -= 10;
		this.ui.update(this.player);

		// Create explosion
		this.sounds.hurt.play();
		this.earth.explode(item);

		// When the player dies
		if (this.player.shield <= 0) {
			this.player.sprite.kill();  
			this.sounds.die.play();
			this.music.pause();
			this.ui.gameOverScreen(this.restart, this);
			this.input.pauseButton.onDown.remove(this.pause, this);
		}
	};

	app.GameState = GameState;
}(App));
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
		this.level = 0;
		this.highScore = 0;
		this.shield = 100;
		this.energy = 100;
		this.bonus = 0;
		this.sprite = this.game.add.sprite(this.width/2, 80, "ship");
		this.sprite.anchor.setTo(0.5, 0.5);
		this.game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
	};

	/**
	 * Resets the player to restart game
	 * Revives the player, restores health, energy and bonus 
	 * and repositions the player in the middle of the screen 
	 */
	Player.prototype.reset = function() {
		this.level = -1;
		this.shield = 100;
		this.energy = 100;
		this.bonus = 0;
		this.sprite.revive();
		this.sprite.x = this.width/2;
	};

	/**
	 * Updates the level count in the player object
	 * Also increases the energy and decreases bonus during each step
	 * @param level
	 */
	Player.prototype.update = function(level) {
		this.level = level;
		if (this.energy < 100) {
			this.energy += 1;
		}
		if (this.bonus > 0){
			this.bonus -=1;
			if (this.bonus === 0) {
				this.music.halfTime();
			}
		}
		if (this.sprite.alive) {
			this.ui.update(this);
		}
	};

	app.Player = Player;
}(App));
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



