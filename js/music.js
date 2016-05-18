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