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