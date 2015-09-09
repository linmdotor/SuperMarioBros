/********************
INICIALIZA EL MOTOR
*********************/

window.addEventListener("load",function() {

// ## Set up an instance of the Quintus engine and include
// the Sprites, Scenes, Input and 2D module. The 2D module
// includes the `TileLayer` class as well as the `2d` componet.
var Q = Quintus({ development: true, audioSupported: [ 'mp3','ogg' ] })
      .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio")
      // Set the size of the html file (canvas)
      // And turn on default input controls and touch input (for UI)
      .setup("mario").controls().touch()
      // Enable sounds.
      .enableSound();

// ## Define the constants for the collision masks
//The original values are also defined in the "quintus_sprites.js"
Q.SPRITE_NONE = 0;
Q.SPRITE_PLAYER = 1;
Q.SPRITE_ENEMY = 2;
Q.SPRITE_COLLECTABLE = 4;
Q.SPRITE_FRIEND = 8;

backgroundH = 18*32;
backgroundW = 250*32; //CHANGE THIS CONSTANT FOR A VARABLE REFERED TO THE STAGE WIDTH

// ## Define the class "Player"
Q.Sprite.extend("Player",{

	init: function(p) {
		this._super(p, {
			// Default values		
			sprite: "mario",
			sheet: "marioR", // Setting a sprite sheet sets sprite width and height
			frame: 0,
			jumpSpeed: -550,
			speed: 200,
			dead: false,
			won: false,
      		direction: "right",
      		secondCounter: 0,

			type: Q.SPRITE_PLAYER,
      		collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_COLLECTABLE
		});

		this.add('2d, platformerControls, animation, tween');

		this.on("enemy.hit","die");
		this.on("win","win");
	},

	step: function(dt) {

		//
		this.p.secondCounter = this.p.secondCounter + dt;
		if(this.p.secondCounter >= 1) {
			Q.state.dec("time", 1);
			if(Q.state.get("time") == 0) {
				this.die();
			}
			this.p.secondCounter = 1 - this.p.secondCounter;
		}

		//runs when is landed and the key Z is pressed 
		if(this.p.landed > 0) {
			if(Q.inputs['fire']) {
				this.p.speed = 300;
			} else {
				this.p.speed = 200;
			}
		}

		//follow the character unless he is in the corners of the map
		if (this.p.x > (Q.width/2 - this.p.cx)  && this.p.x < (backgroundW - (Q.width/2 + this.p.cx))) {
			this.stage.follow( this, {x: true, y: false});
		} else {
			this.stage.follow( this, {x: false, y: false});
		}

		//dont allow to pass the character more than the map size
		if (this.p.x < 0 + this.p.cx) {
			this.p.x = this.p.cx;
		} else if (this.p.x > backgroundW - this.p.cx){
			this.p.x = backgroundW - this.p.cx;
		}

		//when fall down, dies
		if( this.p.y >= backgroundH - this.p.cy) {
			this.die();
		}

		//Control the animations
		if(this.p.vx > 0) {
			this.p.direction = "right";
		} else if(this.p.vx < 0) {
			this.p.direction = "left";
		}

		//If not dead, play animations and control the movement
		if(!this.p.dead && !this.p.won) {
			if(this.p.vy == 0 && this.p.vx == 0 && !this.p.ignoreControls) {
				this.play("stand_" + this.p.direction);
			} else if(this.p.landed > 0 && !this.p.ignoreControls) {
				if(Q.inputs['fire']) {
					this.play("run_" + this.p.direction);
				} else {
					this.play("walk_" + this.p.direction);
				}
				
			} else if(this.p.ignoreControls) { //duck 
				this.play("duck_" + this.p.direction);
			} else {
				this.play("jump_" + this.p.direction);
			}

			//When duck, slide if is in the floor
			if(Q.inputs['down']) {
				this.p.ignoreControls = true;
	        	
		        if(this.p.landed > 0) {
		          this.p.vx = this.p.vx * (1 - dt*10);
		        }
	      	} else {
	      		this.p.ignoreControls = false;
			}

			//Play the jumping sound
			if(Q.inputs['up'] && this.p.landed > 0 && !this.p.ignoreControls && !this.p.jumping) {
				Q.audio.play('jump_small.ogg');
			}

		} else if (this.p.dead) {
			this.play("dead_" + this.p.direction);
		}

	},

	die: function() {
		if(!this.p.dead) {
			this.p.dead = true;
			//this.p.type = Q.SPRITE_NONE;
			//this.p.collisionMask = Q.SPRITE_NONE;
			this.del('2d, platformerControls');		

			//Play the die music
			Q.audio.stop('music_main.ogg'); // Everything will stop playing
			Q.audio.play('music_die.ogg');
			//Animate falling down and destroy
	     	this.animate({ x: this.p.x, y: this.p.y-50, angle: 0 }, 0.25, Q.Easing.Linear);
		 	this.animate({ x: this.p.x, y: backgroundH+this.p.h, angle: 0 }, 2.5, Q.Easing.Quadratic.In, {delay: 0.5, callback: function() { 
		 		this.destroy(); 
		 		this.stage.pause(); //"pause" can be removed to continue seeing the game when the player dies

		 		if(Q.state.get("lives") > 0) {
					Q.state.dec("lives", 1);
					//restart the level
					Q.clearStages();
	    			Q.stageScene('level1');
	    			Q.stageScene("HUD", 3);
				} else {
					//end the game
					Q.stageScene("endGame",1, { label: "You Died!" });
					Q.audio.play('music_game_over.ogg');
				}

		 	}}); 
			
			
		}
	},

	win: function() {
		if(!this.p.won) {
			this.p.won = true;
			this.del('2d, platformerControls');
			//Play the win music
			Q.audio.stop('music_main.ogg'); // Everything will stop playing
			Q.audio.play('music_level_complete.ogg');
			//Animate the player
			this.animate({ x: this.p.x-15, y: this.p.y-10, angle: 360 }, 5, Q.Easing.Linear, {callback: function() { this.stage.pause(); }});
			//restart the level
			Q.stageScene("endGame",1, { label: "You Won!" });
		}	 
	}

});

// ## Define the "abstract" class "Enemy"
Q.MovingSprite.extend("Enemy", {

  init: function(p,defaults) {
    this._super(p, Q._defaults(defaults||{},{
      sheet: p.sprite,
      dead: false,

      type: Q.SPRITE_ENEMY,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_ENEMY
    }));

    this.add('2d, aiBounce, animation');
    this.on("bump.top",this,"stomp");
    //this.on("bump.left, bump.right, bump.bottom",this,"hit"); //otro modo
    this.on("hit.sprite",this,"hit");
    this.on("hit",this,"collision");
    this.on("destroy", this, "destroy");
  },

  step: function(dt) {
    if(this.p.dead) {
      this.del('2d, aiBounce');
      return;
    }

    this._super(dt);
  },

  hit: function(col) {
  	if(col.obj.isA("Player") && !this.p.dead) {
      col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
    }
  },

  collision: function(col) {

  },

  stomp: function(col) {
    if(col.obj.isA("Player") && !col.obj.p.dead) {
      Q.audio.play('squish_enemy.ogg');
      this.p.dead = true;
      this.p.vx=this.p.vy=0;
      col.obj.p.vy = -300;
      this.play("die", 10);    
    }
  }

});

Q.Enemy.extend("Goomba", {
  init: function(p) {
    this._super(p,{
    });
    this.p.vx = -20; //this goes here because doesn't work in the super constructor... why?
  },

  step: function(dt) {
  	this._super(dt);

  	//Animations
  	if(this.p.vx != 0) {
  		this.play("walk");
  	} else {
  		this.play("stand");
  	}
  }
  
});

Q.Enemy.extend("Bloopa", {
  init: function(p) {
    this._super(p,{
      vx: 0,
      gravity:0.2,
      jumpTimer:0
    });

    this.on("bloopa.jumped", this, "jumped");
  },

  step: function(dt) {
  	this._super(dt);
  	//when step into the floor, stop the X movement
  	if(this.p.vy == 0)
  		this.p.vx = 0;

  	this.p.jumpTimer = this.p.jumpTimer + dt;
  	if (this.p.jumpTimer > 3) {
        // Each 3 secs, jump in a random direction.
        this.play("jump", 1);
        this.p.jumpTimer = 0;
      }

	//Animations
	if(this.p.vy == 0) {
  		this.play("stand");
  	} 
  
  },

  //Wait until the jump animation has played
  jumped: function() {
  	this.p.vy = -175;
  	this.p.vx = (Math.random()*100) -50;
  	this.play("stand");
  }

});

// ## Define the class "Princess"
Q.Sprite.extend("Princess",{

	init: function(p) {
		this._super(p, {		
			asset: "princess.png",

			type: Q.SPRITE_FRIEND,
      		collisionMask: Q.SPRITE_DEFAULT
		});

	this.add('2d');

    this.on("hit.sprite",this,"hit");
  },

  hit: function(col) {
  	if(col.obj.isA("Player")) {
      col.obj.trigger('win');
    }
  }

});

Q.Sprite.extend("Collectable", {
  
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_PLAYER,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0,
      processed: false
    });

    this.add("animation, tween");

    this.on("sensor");
  },

  // When a Collectable is hit.
  sensor: function(colObj) {
  	// Increment the score.
    if(!this.p.processed)
    {
	    this.p.processed = true;
	    if (this.p.amount) {
	      colObj.p.score += this.p.amount;
	      Q.stageScene('HUD', 3, colObj.p);
	    }
	    Q.audio.play('coin.mp3');
	    this.destroy();
	}
  }
});

Q.Collectable.extend("Coin", {
  // When a Coin is hit.
  sensor: function(colObj) {
    // Increment the coins.
    if(!this.p.processed)
    {
    	this.p.processed = true;
    	Q.state.inc("coins", 1);	    

	    // This event can be also done repainting the HUD with -> 
		    //Q.state.coins++;
		    //Q.stageScene('HUD', 3);

	    Q.audio.play('coin.mp3');

	    this.anim();
  	}
  },

  step: function(colObj) {
  	this.play("shine");
  },

  anim: function() {
  	this.animate({ x: this.p.x, y: this.p.y-25, angle: 0 }, 0.25, Q.Easing.Linear, {callback: function() { this.destroy(); }});
  }

});

// ## Define the class "MagicBox"
Q.Sprite.extend("MagicBox", {

	init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      
      coins: 1,
      vx: 0,
      vy: 0,
      gravity: 0,

      type: Q.SPRITE_DEFAULT,
      collisionMask: Q.SPRITE_PLAYER
    });

    this.add('2d, animation, tween');
    this.on("bump.bottom",this,"hit");
    
    this.play("shine");
  },

  hit: function(col) {

  	if(col.obj.isA("Player") && this.p.coins > 0) {
    	Q.state.inc("coins", 1);
	    this.p.coins = this.p.coins-1;
	    if (this.p.coins <= 0) {
	    	this.play("empty");
	    }
	    Q.audio.play('coin.mp3');
	    this.animate({ x: this.p.x, y: this.p.y-15, angle: 0 }, 0.05, Q.Easing.Linear, {callback: function() { 
			var coin = new Q.Coin({ x:this.p.x, y:this.p.y-15, sprite:"coin"});
			this.stage.insert(coin);
			coin.anim();
			this.animate({ x: this.p.x, y: this.p.y+15, angle: 0 }, 0.05, Q.Easing.Linear );
		}});
	}
  }

  });

// ## Define the start menu scene
Q.scene("mainTitle", function(stage) {
	stage.insert(new Q.Repeater( { asset: "mainTitle.png" } ));

	var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height*2/3, fill: "rgba(0,0,0,0.5)"
  	}));

	var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
	                                              label: "Play" }))         
	
	button.on("click",function() {
		Q.clearStages();
		Q.stageScene('level1');
		Q.stageScene("HUD", 3);
	});

	container.fit(20);

	//Restart coins and lives
	Q.state.set("coins",0);
	Q.state.set("lives",3);

});

// ## Define the HUD scene
Q.scene("HUD", function(stage) {
	var container = stage.insert(new Q.UI.Container({
    	x: 50, y: 0
  	}));

	var label_lives_bg = container.insert(new Q.UI.Text({x:22, y: 22,
    	label: "Lives: " + Q.state.get("lives"), color: "black", size: 20 }));
  	var label_lives = container.insert(new Q.UI.Text({x:20, y: 20,
    	label: "Lives: " + Q.state.get("lives"), color: "white", size: 20 }));

	var label_coins_bg = container.insert(new Q.UI.Text({x:202, y: 22,
    	label: "Coins: " + Q.state.get("coins"), color: "black", size: 20}));
  	var label_coins = container.insert(new Q.UI.Text({x:200, y: 20,
    	label: "Coins: " + Q.state.get("coins"), color: "white", size: 20}));

  	var label_time_bg = container.insert(new Q.UI.Text({x:112, y: 52,
    	label: "Time: " + Q.state.get("time"), color: "black", size: 20}));
  	var label_time = container.insert(new Q.UI.Text({x:110, y: 50,
    	label: "Time: " + Q.state.get("time"), color: "white", size: 20}));

  	container.fit(20);

  	Q.state.on("change.coins", this, function(coins) {
  		if(coins >= 100) {
  			Q.state.inc("lives",1);
  			Q.state.set("coins",0);
  		}
		label_coins_bg.p.label = "Coins: " + Q.state.get("coins");
		label_coins.p.label = "Coins: " + Q.state.get("coins");
	});

  	Q.state.on("change.lives", this, function() {
		label_lives_bg.p.label = "Lives: " + Q.state.get("lives");
		label_lives.p.label = "Lives: " + Q.state.get("lives");
	});

	Q.state.on("change.time", this, function() {
		if(Q.state.get("time") >= 0 ) {
			label_time_bg.p.label = "Time: " + Q.state.get("time");
			label_time.p.label = "Time: " + Q.state.get("time");
		}
	});

});

// ## Define the main scene
Q.scene("level1", function(stage) {
	Q.stageTMX("level1.tmx",stage);

	Q.state.set("time", 120);

	// Add in a repeater for a little parallax action (tis is added as a propierty in the TMX file)
	//stage.insert(new Q.Repeater({ asset: "bg.png", speedX: 0.5, speedY: 0.5 }));

	//The main viewport
	stage.add("viewport");
	stage.viewport.centerOn(160, 336);
	//stage.viewport.offsetX = -Q.width/3;
	//stage.viewport.offsetY = 100;

	Q.audio.stop(); // Everything will stop playing
	Q.audio.play('music_main.ogg', { loop: true });

});

// ## Define the end scene (with the restart button)
Q.scene('endGame',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0.5)"
  }));

  var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
                                                  label: "Play Again" }))         
  var label = container.insert(new Q.UI.Text({x:0, y: -10 - button.p.h, 
                                                   label: stage.options.label }));
  button.on("click",function() {
    Q.clearStages();
    Q.stageScene("mainTitle");
  });

  container.fit(20);
});

// ## Asset Loading and Game Launch
// assets that are already loaded will be skipped
Q.loadTMX("level1.tmx, mainTitle.png, mario_small_modified.png, mario_small_modified.json, bloopa.png, bloopa.json, coin.png, coin.json, magicBox.png, magicBox.json, goomba.png, goomba.json, princess.png, music_main.ogg, music_main.mp3, music_die.ogg, music_die.mp3, music_game_over.ogg, music_game_over.mp3, music_level_complete.ogg, music_level_complete.mp3, squish_enemy.mp3, squish_enemy.ogg, kill_enemy.mp3, kill_enemy.ogg, jump_small.mp3, jump_small.ogg, hit_head.mp3, hit_head.ogg, coin.ogg, coin.mp3", function(){
	// Sprites sheets can be created manually
	//Q.sheet("tiles","tiles.png", { tilew: 32, tileh: 32 });
	// Or can be created from a .json asset that defines sprite locations	
	Q.compileSheets("mario_small_modified.png","mario_small_modified.json");
	Q.compileSheets("bloopa.png","bloopa.json");
	Q.compileSheets("coin.png","coin.json");
	Q.compileSheets("magicBox.png","magicBox.json");
	Q.compileSheets("goomba.png","goomba.json");
	//Make the animations
	Q.animations("mario", {
		walk_right: { frames: [1,2], rate: 0.3, flip: false, loop: false, next: 'stand_right' },
		walk_left: { frames:  [1,2], rate: 0.3, flip: 'x', loop: false, next: 'stand_left' },
		run_right: { frames: [1,2], rate: 0.2, flip: false, loop: false, next: 'stand_right' },
		run_left: { frames:  [1,2], rate: 0.2, flip: 'x', loop: false, next: 'stand_left' },
		jump_right: { frames: [4], rate: 0.5, flip: false },
		jump_left: { frames:  [4], rate: 0.5, flip: 'x' },
		stand_right: { frames:[0], rate: 1, flip: false },
		stand_left: { frames: [0], rate: 1, flip: 'x' },
		dead_right: { frames:[12], rate: 1, flip: false },
		dead_left: { frames: [12], rate: 1, flip: 'x' },
		duck_right: { frames: [13], rate: 0.1, flip: false, loop: false },
      	duck_left: { frames:  [13], rate: 0.1, flip: "x", loop: false }
	});
	Q.animations("goomba", {
		stand: { frames: [0], rate: 1 },
		walk: { frames: [0,1], rate: 2/3, loop: false},
		die: { frames: [2], rate: 3, loop: false, trigger: "destroy"}
	});
	Q.animations("bloopa", {
		stand: { frames: [0], rate: 1 },
		jump: { frames: [1], rate: 1/4, loop: false, trigger: "bloopa.jumped" },
		die: { frames: [1], rate: 3, loop: false, trigger: "destroy"}
	});
	Q.animations("coin", {
		shine: { frames: [0,1,2,1], rate: 1/3 }
	});
	Q.animations("magicBox", {
		shine: { frames: [0,1,2,1], rate: 1/3 },
		empty: { frames: [3], rate: 1 }
	});
	// Finally, call stageScene to run the game
	Q.stageScene("mainTitle");
});

});

