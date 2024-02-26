import { CHARACTER_STATE } from "./types.js";

class Boundary {
  static width = 48 // 12*12(TILE) * 400 (ZOOM)
  static height = 48 // 12*12(TILE) * 400 (ZOOM)
  constructor({canvas, canvasContent, position}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.position = position;
    this.width = 48;
    this.height = 48;
  }
  draw() {
    // C.fillStyle =  '#FF0000';
    this.c.fillStyle =  'transparent';
    this.c.fillRect(this.position.x, this.position.y, this.width, this.height);
  }
  update({position}) {
    this.position.x = position.x;
    this.position.y = position.y;
  }
}

// movementDelay: ゲームの何フレームごとにSprite自身の次のフレームに切り替わるか。(1000/FPS*movementDelay)秒/frame
class Sprite {
  constructor({canvas, canvasContent, position, image, movementDelay = 60, frames = {max: 1}, moving = false}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.position = position;
    this.image = image;
    this.movementDelay = movementDelay;
    this.frames = {...frames, val: 0, elapsed: 1};
    this.moving = moving;
    this.image.onload = () => {
      this.width = this.image.width / this.frames.max;
      this.height = this.image.height;
    };
  }
  draw() {
    if(!this.width || !this.height) {
      if(this.image.complete) {
        this.width = this.image.width / this.frames.max;
        this.height = this.image.height;
      }else {
        this.image.onload = () => {
          this.width = this.image.width / this.frames.max;
          this.height = this.image.height;
          this.draw();
        };
      }
    }
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
      return
    }

    if(1 < this.frames.max) this.frames.elapsed++;
    if(this.frames.elapsed % this.movementDelay !== 0) return;
    if(this.frames.val < this.frames.max - 1) {
      this.frames.val++
    }else {
      this.frames.val = 0
    };
  }
  update({position, moving=this.moving}) {
    if(position) {
      this.position.x = position.x;
      this.position.y = position.y;
    }
    this.moving = moving;
    if(!this.moving){
      this.frames.val = 0;
    }
  }
}

class Character extends Sprite {
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, moving = false, data}) {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving});
    this.data = data;
  }
}

// velocity: px / ゲーム1frame( 1000/FPS )
class Player extends Character {
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, 
                moving = false, data, sprite, velocity = 2.4}) 
  {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving, data});
    this.state = CHARACTER_STATE.down;
    this.sprite = sprite;
    this.velocity = velocity;
    this.moved = 0;
    this.image.onload = () => {
      this.positionCenter();
      this.width = this.image.width / this.frames.max;
      this.height = this.image.height;
    } 
  }
  positionCenter(){
    // プレイヤーを画面のセンターに配置
    this.position = {
      x: this.canvas.width/2 - this.image.width/this.frames.max/2,
      y: this.canvas.height/2 - this.image.height/2,
    }
  }
  _updateImage(newState) {
    switch(newState) {
      case CHARACTER_STATE.down:
        this.image = this.sprite.down;
        break;
      case CHARACTER_STATE.up:
        this.image = this.sprite.up;
        break;
      case CHARACTER_STATE.left:
        this.image = this.sprite.left;
        break;
      case CHARACTER_STATE.right:
        this.image = this.sprite.right;
        break;
    }
  }
  update({position, moving, state, step}) {
    super.update({position, moving});
    if(state) {
      this.state = state;
      this._updateImage(state);
      this.frames.val = 0;
      this.moved = 0;
    }
    if(step) {
      this.data.step = step;
      this.moved = 0;
    }
  }

}

export { Boundary, Sprite, Character, Player };