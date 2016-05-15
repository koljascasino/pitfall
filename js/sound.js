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