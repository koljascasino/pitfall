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