class Boundary {
  static width = 48 // 12*12(TILE) * 400 (ZOOM)
  static height = 48 // 12*12(TILE) * 400 (ZOOM)
  constructor({position}) {
    this.position = position;
    this.width = 48;
    this.height = 48;
  }
  draw() {
    // C.fillStyle =  '#FF0000';
    C.fillStyle =  'transparent';
    C.fillRect(this.position.x, this.position.y, this.width, this.height);
  }
  update({position}) {
    this.position.x = position.x;
    this.position.y = position.y;
  }
}

class Sprite {
  constructor({canvas, canvasContent, position, movementDelay = 50, image, frames = {max: 1}, moving = false}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.position = position;
    this.movementDelay = movementDelay;
    this.image = image;
    this.frames = {...frames, val: 0, elapsed: 1};
    this.image.onload = () => {
      this.width = this.image.width / this.frames.max;
      this.height = this.image.height;
    }
    this.moving = moving;
  }
  draw() {
    this.c.drawImage(
      this.image,
      this.frames.val * this.width,
      0,
      this.width,
      this.height,
      this.position.x,
      this.position.y,
      this.width,
      this.height,
    );

    if(!this.moving){
      this.frames.val = 0;
      return
    }
    if(1 < this.frames.max) this.frames.elapsed++;

    if(this.frames.elapsed % this.movementDelay !== 0) return;
    if(this.frames.val < this.frames.max - 1) this.frames.val++;
    else this.frames.val = 0;
  }
  update({position=this.position, moving}) {
    this.position.x = position.x;
    this.position.y = position.y;
    if(moving) this.moving = moving;
    if(!this.moving){
      this.frames.val = 0;
    }
  }
}

const CHARACTER_STATE = {
  down: true,
  up: false,
  left: false,
  right: false,
}

class Character extends Sprite {
  constructor({canvas, canvasContent, position = {x: 0, y: 0}, movementDelay = 2, image, frames = {max: 4}, moving = false, sprite}) {
    super({canvas, canvasContent, position, movementDelay, image, frames, moving});
    this.sprite = sprite;
    this.state = CHARACTER_STATE;
    this.image.onload = () => {
      this.position = {
        x: this.canvas.width/2 - this.image.width/this.frames.max/2,
        y: this.canvas.height/2 - this.image.height/2,
      },
      this.width = this.image.width / this.frames.max;
      this.height = this.image.height;
    } 
  }
  update({position=this.position, moving=false, state=this.state}) {
    this.position.x = position.x;
    this.position.y = position.y;
    this.moving = moving;
    if(!this.moving){
      this.frames.val = 0;
    }
    this.state = state;
    this.image = this.sprite[Object.keys(this.state).find(state=>this.state[state])];
    if(state) {
      this.frames.val = 0;
    }
  }
}

class Player extends Character {
  constructor({canvas, canvasContent, position = {x: 0, y: 0},
               movementDelay = 5, image, frames = {max: 4}, moving = false, 
               sprite, velocity = 2.4, rateEncounter = 0.5}) {
    super({canvas, canvasContent, position, movementDelay, image, frames, moving, sprite});
    this.velocity = velocity;
    this.rateEncounter = rateEncounter;
    this.step = 0;
    this.moved = 0;
  }
  update({position=this.position, moving=false, state=this.state, step=this.steps}) {
    super.update({position, moving, state});
    if(state) {
      this.frames.val = 0;
      this.moved = 0;
    }
    if(step) {
      this.steps = step;
      this.moved = 0;
    }
    
  }

}