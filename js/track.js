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