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
		var game = new Phaser.Game(900, 600, Phaser.AUTO, "canvas_container");
		var gameState = new App.GameState(ui, music, game, 900, 600);
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
		this.extension = "." + this.getAudioExtension();
		this.muted = false;
		this.master = this.context.createGain();
		this.master.connect(this.context.destination);
		this.unlocked = false;
		this.loading = false;
		this.startTime = null; 
		this.config = {
				startDelay: 0.2,
				fadeInTime: 0.2,
				fadeOutTime: 0.1,
				masterGain: 1.0
		};
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
		this.tracks.pause = new app.Track(this, "pause", 45.176485260770974, {loop: 1.0}, true);
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
	Music.prototype.pause = function(reverse) {
		this.stopTracks();
		this.masterTrack = this.tracks.pause;
		this.tracks.pause.play(0, reverse);
	};

	/**
	 * Stop all tracks and play master track 
	 */
	Music.prototype.play = function() {
		this.stopTracks();
		this.masterTrack = this.tracks.loop1;
		this.tracks.loop1.play();
		this.tracks.drums1.play();
	};


	/**
	 * Stops all tracks
	 */
	Music.prototype.stop = function(){
		this.stopTracks();
	};

	/**
	 * Switch beat to half time 
	 */
	Music.prototype.halfTime = function(){
		this.tracks.drums0.stop(0.2);
		this.tracks.drums1.play(0.5);
		this.tracks.drums2.stop(0.5);
		this.tracks.drums3.stop(0.2);
	};

	/**
	 * Switch beat to double time
	 */
	Music.prototype.doubleTime = function(){
		this.tracks.drums0.stop(0.2);
		this.tracks.drums1.stop(0.2);
		this.tracks.drums2.play(0.2);
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

	Music.prototype.getBars = function(time) {
		return Math.round((time - this.masterTrack.startTime) / this.tracks.drums1.duration, 4);
	};

	/**
	 * Returns a reverse deep copy of the audio buffer
	 */
	Music.prototype.getReverseClone = function(audioBuffer) {
		var channels = [],
			numChannels = audioBuffer.numberOfChannels,
			i = 0;

		// Clone the underlying Float32Arrays
		for (i = 0; i < numChannels; i++) {
			channels[i] = new Float32Array(audioBuffer.getChannelData(i));
		}

		// Create the new AudioBuffer (assuming AudioContext variable is in scope)
		var newBuffer = this.context.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);

		// Copy the cloned arrays to the new AudioBuffer
		for (i = 0; i < numChannels; i++) {
			newBuffer.getChannelData(i).set(channels[i]);
		}

		// Reverse the clone
		for (i = 0; i < numChannels; i++) {
			Array.prototype.reverse.call(newBuffer.getChannelData(i));
		}
		return newBuffer;
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
	var Track = function Track(music, key, duration, nextMap, loadReverse) {
		this.music = music;
		this.key = key;
		this.config = {
				path: "music/"
		};
		this.buffer = null;
		this.reverseBuffer = null;
		this.ready = false;
		this.duration = duration;
		this.startTime = null;
		this.endTime = null;
		this.loadReverse = loadReverse;
		this.reverse = false;
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

			// Reverse buffer if needed
			if (typeof this.loadReverse !== "undefined" && this.loadReverse) {
				this.reverseBuffer = this.music.getReverseClone(this.buffer);
			}
			
			// Check if this was the last track to be loaded
			this.music.ready();

			// Start playing master track as soon as its loaded
			if (this.music.masterTrack === this) {
				this.play();
			}
		}.bind(this);
		this.music.loadAudio(this.music.context, this.config.path, this.key, onLoaded); 
	};

	/**
	 * Start playing track
	 * @param startTime
	 * @param fadeTime
	 */
	Track.prototype.play = function(fadeInTime, reverse) {

		// If track is already playing do nothing
		if (this.startTime !== null) {
			return;
		}
		
		// Calculate start time and offset
		var offset = 0;
		var masterStart = 0;
		if (this.music.masterTrack.key === this.key){
			this.startTime = this.music.context.currentTime + this.music.config.startDelay;
			offset = 0;
		} else {
			masterStart = this.music.masterTrack.startTime;
			if (masterStart > this.music.context.currentTime + this.music.config.startDelay / 2){
				this.startTime = masterStart;
				offset = 0;
			} else {
				this.startTime = this.music.context.currentTime + this.music.config.startDelay;
				offset = (this.startTime - masterStart) % this.music.masterTrack.duration % this.duration;
			}
		}
		
		// Reverse buffer if needed
		if (typeof reverse !== "undefined") {
			this.reverse = reverse;
			if (reverse && this.reverseBuffer === null) {
				this.reverseBuffer = this.music.getReverseClone(this.buffer);
			}
		}
		
		// Start track
		console.log("Playing " + this.key  + ", master track: " + this.music.masterTrack.key + " offset " + String(offset));
		this.startDeck(this.startTime, offset, fadeInTime);
		this.scheduleNext();
	};

	/**
	 * Since we want to play loops we potentially need the same track (buffer) in two different decks
	 * Such that the second deck can start immediately when the first deck is scheduled to end
	 * @param startTime
	 * @param offset
	 * @param fadeTime
	 */
	Track.prototype.startDeck = function(startTime, offsetProvided, fadeInTime) {
		
		// Switch deck
		if (this.deck === 0){
			this.deck = 1;
		} else {
			this.deck = 0;
		}
		
		// Resync to master track
		var offset;
		var delay;
		var fadeIn = 0;
		
		// var masterStart = this.music.masterTrack.startTime;
		// var masterDuration = this.music.masterTrack.duration;
		
		// Caller already did the job
		if (typeof offsetProvided !== "undefined"){
			offset = offsetProvided;
			delay = 0;
		} else {
			offset = 0;
			delay = 0;
		}
			
		/*
		// Calculate offset or delay
		} else {
			offset = ((startTime - masterStart)  % masterDuration) % this.duration;
			delay = (((((masterStart - startTime) % masterDuration) + masterDuration) % masterDuration % this.duration) + this.duration) % this.duration;
			if (offset < -0.0001) {
				delay = -offset;
				offset = 0;
			} else if (offset < 0.0001 && delay < 0.0001){
				offset = 0;
				delay = 0;
			} else if (offset < delay) {
				console.log("	Offset: " + offset + ", delay: " + delay + " -> offsetting by " + offset);
				delay = 0;
			} else {
				console.log("	Offset: " + offset + ", delay: " + delay + " -> delaying by " + delay);
				offset = 0;
			}
		}*/
		
		// Set start and end time
		if (this.startTime === null){
			this.startTime = startTime + delay;
		} 
		this.endTime = startTime - offset + this.duration + delay;
		
		// Use reverse buffer?
		var buffer = this.buffer;
		if (this.reverse && this.reverseBuffer !== null){
			buffer = this.reverseBuffer;
		}
		
		// Set up nodes and schedule play
		console.log(this.key + " (deck " + this.deck + ") starting " + this.music.getBars(startTime) + " bars after master " + this.music.masterTrack.key);
		var nodes = this.nodes[this.deck];
		nodes.source = this.music.createBufferSource(buffer);	
		nodes.source.playbackRate.value = 1;
		nodes.gain = this.music.context.createGain();
		nodes.source.connect(nodes.gain);
		nodes.gain.connect(this.music.master);
		nodes.source.start(startTime + delay, offset);

		// Fade in
		if (offset > 0) {
			if (typeof fadeInTime !== "undefined"){
				fadeIn = fadeInTime;
			} else {
				fadeIn = this.music.config.fadeInTime;
			}
			nodes.gain.gain.linearRampToValueAtTime(0, startTime);
			nodes.gain.gain.linearRampToValueAtTime(1, startTime + Math.min(offset, fadeIn));
		} else {
			nodes.gain.gain.value = 1;
		}

		// Set up callback
		nodes.source.onended = this.onEnded.bind(this);
	};
	
	/**
	 * Schedules the next track at the time when this one has ended
	 */
	Track.prototype.scheduleNext = function() {
		
		// Figure out which track to play next
		var dice = Math.random();
		for (var next in this.nextMap) {
			if (dice <= this.nextMap[next]) {
				if (next === "loop") {
					this.next = this.key;
				} else {
					this.next = next;
				}
				break;
			}
			dice -= this.nextMap[next];
		}
		
		// Schedule the deck
		this.music.tracks[this.next].startDeck(this.endTime);
	};
	
	/**
	 * Schedule the next track as soon as this one has stopped playing
	 */
	Track.prototype.onEnded = function() {
		
		// this.next is now playing
		if (this.next !== this.key) {
			this.plays = 0;
			this.startTime = null;
			this.endTime = null;
		}
		
		// Switch master track
		if (this.music.masterTrack === this && this.next !== this.key){
			console.log("Switching master track to " + this.next);
			this.music.masterTrack = this.music.tracks[this.next];
		}
		
		// Schedule next track
		this.music.tracks[this.next].scheduleNext();
	};

	/**
	 * Stop playing track immediately,
	 * also stop the next track if it is already scheduled
	 * @param fadeTime fade out time
	 */
	Track.prototype.stop = function(fadeOutTime) {
		this.plays = 0;
		this.startTime = null;
		this.endTime = null;
		var fadeOut = this.music.config.fadeOutTime;
		if (typeof fadeOutTime !== "undefined") {
			fadeOut = fadeOutTime;
		}
		
		for (var deck = 0; deck < 2; deck++) {
			if (typeof this.nodes[deck].source !== "undefined") {
				this.nodes[deck].source.onended = null;
				if (this.music.config.fadeOutTime > 0) {
					this.nodes[deck].gain.gain.linearRampToValueAtTime(0, this.music.context.currentTime + this.music.config.fadeOutTime );
				}
				try {
					this.nodes[deck].source.stop(this.music.context.currentTime + fadeOut);
				} catch(e){
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
		this.game.load.image("playerLight", "img/light_900x600.png");
		this.game.load.image("ship", "img/ship.png");
		this.game.load.spritesheet("kaboom", "img/explosion.png", 128, 128);
		this.game.load.image("starfield", "img/starfield.png", this.width, this.height);
	};

	GameState.prototype.create = function() {

		// The earth
		this.earth = new app.Earth(this.game, this.sounds, this.width, this.height);
		
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

		this.earth.update(this.player);
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
			this.playerTakesHit(item);
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
			this.music.pause(true);
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
	Player.prototype.updateLevel = function(level) {
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



