 (function (app) {
	"use strict";

	var config_loops = [];
	var config_drums = [];
	var config_sounds;
	
	config_loops[1] = {
			pause: {path: "music/level1/", duration: 45.176485260770974, next: {loop: 1.0}, reverse: true},
			intro: {path: "music/level1/", duration: 5.647074829931973, next: {verse1: 1.0}},
			verse1: {path: "music/level1/", duration: 39.529433106575965, next: {verse2: 0.8, ref: 0.2}},
			verse2: {path: "music/level1/", duration: 39.529433106575965, next: {verse1: 0.2, ref: 0.8}},
			ref: {path: "music/level1/", duration: 33.88235827664399, next: {verse2: 0.4, bridge: 0.6}},
			bridge: {path: "music/level1/", duration: 33.88235827664399, next: {verse1: 0.4, verse2: 0.2, ref: 0.4}},
			starship: {path: "music/level1/", duration: 16.941179138321996, next: {verse2: 1.0}}
		};
	config_drums[1] = {
		drums0: {path: "music/level1/", duration: 11.294126984126985, next: {drums1: 1.0}},
		drums1: {path: "music/level1/", duration: 5.647074829931973, next: {loop: 0.8, drums0: 0.2}},
		drums2: {path: "music/level1/", duration: 11.294126984126985, next: {loop: 0.8, drums3: 0.2}},
		drums3: {path: "music/level1/", duration: 11.294126984126985, next: {drums2: 1.0}}
	};
	config_loops[2] = {
			pause: {path: "music/level2/", duration: 45.176485260770974, next: {loop: 1.0}, reverse: true},
			intro: {path: "music/level2/", duration: 44.30770975056689, next: {verse1: 1.0}},
			verse1: {path: "music/level2/", duration: 22.153854875283447, next: {loop: 0.2, ref: 0.8}},
			ref: {path: "music/level2/", duration: 29.538480725623582, next: {verse1: 0.3, bridge1: 0.6, bridge2: 0.2}},
			bridge1: {path: "music/level2/", duration: 14.769251700680272, next: {verse1: 0.5, ref: 0.5}},
			bridge2: {path: "music/level2/", duration: 44.30770975056689, next: {verse1: 0.5, ref: 0.5}},
			starship: {path: "music/level2/", duration: 22.153854875283447, next: {verse1: 1.0}}
	};
	config_drums[2] = {
		drums0: {path: "music/level2/", duration: 7.384625850340136, next: {drums1: 1.0}},
		drums1: {path: "music/level2/", duration: 7.384625850340136, next: {loop: 0.8, drums0: 0.2}},
		drums2: {path: "music/level2/", duration: 7.384625850340136, next: {loop: 1.0}}
	};
	
	config_sounds = [
	                 "hurt", 
	                 "die",
	                 "arrow",
	                 "hit",
	                 "arrow",
	                 "rupee",
	                 "shield"
	                 ];

	/**
	 * Manages the music, loads, loops and synchronizes the tracks and plays sound effect via WebAudio.
	 * @param context {AudioContext}
	 */
	var Music = function Music(context) {
		this.context = context;
		this.loops = [];
		this.drums = [];
		this.sounds = []; 
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
		this.loadCount = 0;
		this.level = 1;
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
	Music.prototype.load = function(level, onLoad) {
		var key = "", i = 0, len = 0;
		
		this.unlock();
		
		var callback = function(track){
			if (typeof track !== "undefined" && track == this.masterTrack){
				track.play();
			}
			if (--this.loadCount === 0) {
				onLoad();
			}
		}.bind(this);
		
		// Load sounds
		for (i = 0, len = config_sounds.length; i < len; i++) {
			this.loadCount++;
			key = config_sounds[i];
			this.sounds[key] = new app.Sound(this, key, callback); 
		}
		
		// Load drums
		this.drums[level] = [];
		for (key in config_drums[level]) {
			this.loadCount++;
			this.drums[level][key] = new app.Track(this, this.drums[level], key, config_drums[level][key], callback);
		}
		
		// Load loops
		this.loops[level] = [];
		for (key in config_loops[level]) {
			this.loadCount++;
			this.loops[level][key] = new app.Track(this, this.loops[level], key, config_loops[level][key], callback);
		}
		
//		this.tracks.pause = new app.Track(this, "pause", 45.176485260770974, {loop: 1.0}, true);
		/*this.tracks.verse1 = new app.Track(this, "verse1", 39.529433106575965, {verse2: 0.8, ref: 0.2});
		this.tracks.verse2 = new app.Track(this, "verse2", 39.529433106575965, {verse1: 0.2, ref: 0.8});
		this.tracks.ref = new app.Track(this, "ref", 33.88235827664399, {verse2: 0.4, bridge: 0.6});
		this.tracks.bridge = new app.Track(this, "bridge", 33.88235827664399, {verse1: 0.4, verse2: 0.2, ref: 0.4});
		this.tracks.drums0 = new app.Track(this, "drums0", 11.294126984126985, {drums1: 1.0});
		this.tracks.drums1 = new app.Track(this, "drums1", 5.647074829931973, {loop: 0.8, drums0: 0.2});
		this.tracks.drums2 = new app.Track(this, "drums2", 11.294126984126985, {loop: 0.8, drums3: 0.2});
		this.tracks.drums3 = new app.Track(this, "drums3", 11.294126984126985, {drums2: 1.0});
		this.tracks.starship = new app.Track(this, "starship", 16.941179138321996, {verse2: 1.0});*/
//		this.tracks.intro = new app.Track(this, "intro", 44.30770975056689, {verse1: 1.0});
//		this.tracks.verse1 = new app.Track(this, "verse1", 22.153854875283447, {loop: 0.2, ref: 0.8});
//		this.tracks.ref = new app.Track(this, "ref", 29.538480725623582, {verse1: 0.3, bridge1: 0.6, bridge2: 0.2});
//		this.tracks.bridge1 = new app.Track(this, "bridge1", 14.769251700680272, {verse1: 0.5, ref: 0.5});
//		this.tracks.bridge2 = new app.Track(this, "bridge2", 44.30770975056689, {verse1: 0.5, ref: 0.5});		
//		this.tracks.starship = new app.Track(this, "starship", 22.153854875283447, {verse1: 1.0});
		if (level === 1){
			this.masterTrack = this.loops[level].pause;
		}
	};

	/**
	 * Stop all tracks and play intro/pause music
	 */
	Music.prototype.pause = function(reverse) {
		this.stopTracks();
		this.masterTrack = this.loops[this.level].pause;
		this.loops[this.level].pause.play(0, reverse);
	};

	/**
	 * Stop all tracks and play master track 
	 */
	Music.prototype.play = function(key) {
		this.stopTracks();
		if (typeof key !== "undefined"){
			this.level = key;
		}
		this.masterTrack = this.loops[this.level].intro;
		this.loops[this.level].intro.play();
		this.drums[this.level].drums1.play(0, false, null, this.loops[this.level].intro.endTime);
//		this.masterTrack = this.loops[this.level].verse1;
//		this.loops[this.level].verse1.play();
//		this.drums[this.level].drums1.play();	
	};
	
	/**
	 * Stops all tracks
	 */
	Music.prototype.stop = function(){
		this.stopTracks();
	};

	/**
	 * Reset level after game over 
	 */
	Music.prototype.reset = function(){
		this.level = 1;
		this.play();
	};


	/**
	 * Switch beat to double time and back to half time
	 */
	Music.prototype.doubleTime = function(value) { 
		var startTrack = value ? this.drums[this.level].drums2 : this.drums[this.level].drums1;
		
		// Stop all drum tracks except drums1 (half time) or drums2 (double time)
		for (var key in this.drums[this.level]) {
			if (key !== startTrack.key){
				this.drums[this.level][key].stop(0.2);	
			}
		}
	
		// In case starship track is playing
		// Schedule start at end of starship track
		if (this.loops[this.level].starship.startTime !== null){
			startTrack.play(0, false, null, this.loops[this.level].starship.endTime);
		} else {
			startTrack.play(0.2);
		}
	};

	Music.prototype.starship = function(callback) {

		// Figure out which drum loop is playing next
		// So it can be rescheduled, then stop all tracks
		var nextDrumLoop = this.drums[this.level].drums1;
		for (var key in this.drums[this.level]) {
			if (nextDrumLoop.startTime === null || this.drums[this.level][key].startTime > nextDrumLoop.startTime) {
				nextDrumLoop = this.drums[this.level][key];
			}
		}
		this.stopTracks();
		
		// Play starship loop
		this.masterTrack = this.loops[this.level].starship;
		this.loops[this.level].starship.play(0, false, callback);
		
		// Reschedule drum track
		nextDrumLoop.play(0, false, null, this.loops[this.level].starship.endTime);
	};
	
	/**
	 * Stop all tracks
	 */
	Music.prototype.stopTracks = function(fadeTime){
		var key = "";
		for (key in this.loops[this.level]) {
			this.loops[this.level][key].stop(fadeTime);
		}
		for (key in this.drums[this.level]) {
			this.drums[this.level][key].stop(fadeTime);
		}
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
		return Math.round((time - this.masterTrack.startTime) / this.drums[this.level].drums1.duration, 4);
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