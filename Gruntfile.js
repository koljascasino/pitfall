module.exports = function(grunt){

	require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		htmlhint: {
			build: {
				options: {
					'tag-pair': true,
					'tagname-lowercase': true,
					'attr-lowercase': true,
					'attr-value-double-quotes': true,
					'doctype-first': true,
					'spec-char-escape': true,
					'id-unique': true,
					'head-script-disabled': true,
					'style-disabled': true
				},
				src: ['index.html']
			}
		},

		watch: {
			html: {
				files: ['index.html'],
				tasks: ['htmlhint']
			},
			js: {
				files: [
				        'js/ui.js',
				        'js/music.js',
				        'js/track.js',
				        'js/sound.js',
				        'js/game.js',
				        'js/player.js',
				        'js/earth.js',
				        'js/run.js'
				        ],
				        tasks: ['concat', 'uglify']
			}
		},

		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			files: ['js/*.js']
		},

		concat: {
			'build/pitfall.js': [
			                     'js/run.js',
			                     'js/ui.js',
			                     'js/music.js',
			                     'js/track.js',
			                     'js/sound.js',
			                     'js/game.js',
			                     'js/player.js',
			                     'js/earth.js'
			                     ]
		},
		uglify: {
			'build/pitfall.min.js': [
			                         'build/pitfall.js'
			                         ],
			                         options: {
			                        	 compress: {
			                        		 drop_console: true
			                        	 }
			                         }
		}


	});

	grunt.registerTask('default', []);

};
