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
  constructor({position, velocity = 50, image, frames = {max: 1}, moving = false}) {
    this.position = position;
    this.velocity = velocity;
    this.image = image;
    this.frames = {...frames, val: 0, elapsed: 0};
    this.image.onload = () => {
      this.width = this.image.width / this.frames.max;
      this.height = this.image.height;
    }
    this.moving = moving;
  }
  draw() {
    C.drawImage(
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
      this.frames.val = 0 
      return;
    }
    if(1 < this.frames.max) this.frames.elapsed++;

    if(this.frames.elapsed % this.velocity != 0) return;
    if(this.frames.val < this.frames.max - 1) this.frames.val++;
    else this.frames.val = 0;
  }
  update({position=this.position, moving}) {
    this.position.x = position.x;
    this.position.y = position.y;
    if(moving)this.moving = moving;
  }
}

const CHARACTER_STATE = {
  front: true,
  back: false,
  left: false,
  right: false,
}

class Character extends Sprite {
  constructor({position = {x: 0, y: 0}, velocity = 10, image, frames = {max: 4}, moving = false, canvas, sprite, state = CHARACTER_STATE}) {
    super({position, velocity, image, frames, moving});
    this.canvas = canvas;
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
  update({position=this.position, moving, state=this.state}) {
    this.position.x = position.x;
    this.position.y = position.y;
    if(moving)this.moving = moving;
    this.state = state;
    this.image = this.sprite[Object.keys(this.state).find(state=>this.state[state])];
  }
}