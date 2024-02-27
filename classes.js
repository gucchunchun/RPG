import { CHARACTER_STATE } from "./types.js";
import { rectCollision } from './utils.js';

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
    C.fillStyle =  '#FF0000';
    // this.c.fillStyle =  'transparent';
    this.c.fillRect(this.position.x, this.position.y, this.width, this.height);
  }
  updatePositionBy({x, y}) {
    // 小数を含む場合の対策
    this.position.x =  Math.round((this.position.x + x) * 10)/10;
    this.position.y = Math.round((this.position.y + y) * 10)/10;
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
    this.drawWidth = 0;
    this.drawHeight = 0;
    this.image.onload = () => {
      this.width = this.image.width / this.frames.max;
      this.height = this.image.height;
    };
  }
  _drawImageAndAnimate() {
    // イメージの描写
    this.c.drawImage(
        this.image,
        this.frames.val * this.width,
        0,
        this.width,
        this.height,
        this.position.x,
        this.position.y,
        this.drawWidth?this.drawWidth:this.width,
        this.drawHeight?this.drawHeight:this.height,
    );

    if (!this.moving) {
        return;
    }
    if (1 < this.frames.max) {
        this.frames.elapsed++;
    }
    if (this.frames.elapsed % this.movementDelay !== 0) {
        return;
    }
    if (this.frames.val < this.frames.max - 1) {
        this.frames.val++;
    } else {
        this.frames.val = 0;
    }
  }
  draw() {
    if(!this.width || !this.height) {
      if(this.image.complete) {
        this.width = this.image.width / this.frames.max;
        this.height = this.image.height;
        this._drawImageAndAnimate();
      }else {
        this.image.onload = () => {
          this.width = this.image.width / this.frames.max;
          this.height = this.image.height;
          this._drawImageAndAnimate();
        };
      }
    }else {
      this._drawImageAndAnimate();
    }
  }
  updatePosition({x, y}) {
    this.position.x = x;
    this.position.y = y;
  }
  updatePositionBy({x, y}) {
    // 小数を含む場合の対策
    this.position.x =  Math.round((this.position.x + x) * 10)/10;
    this.position.y = Math.round((this.position.y + y) * 10)/10;
  }
  updateDrawSize({width, height}) {
    this.drawWidth = width;
    this.drawHeight = height;
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
    this.stepMove = 24;
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
  step() {
    this.data.step ++;
    this.moved = 0;
  }
  move() {
    this.moving = true;
    this.moved = Math.round((this.moved + this.velocity)*10)/10;
  }
  stop() {
    this.moving = false;
    this.moved = 0;
    // 左右が交互に前進する（frame.val偶数番はプレイヤーが止まっているフレーム）
    while(this.frames.val % 2 === 1) {
      this.frames.val ++;
      if( (this.frames.max - 1) < this.frames.val ) {
        this.frames.val = 0;
        break;
      }
    }
  }
  changeStateTo(newState) {
    if(this.state !== newState) {
      this.state = newState;
      this._updateImage(newState);
      this.frames.val = 0;
      this.moved = 0;
    }
  }
  changeVelocity(newVelocity) {
    if(this.velocity !== newVelocity) {
      this.velocity = newVelocity;
      this.movementDelay = Math.round(this.stepMove / newVelocity / 2 * 10) / 10;
    }
  }
  isColliding(rectangle) {
    const IS_COLLIDING = rectCollision({rect1: this, rect2: rectangle});
    return IS_COLLIDING;
  }
  nextStepDirection() {
      let xChange = 0;
      let yChange = 0;
      switch (this.state) {
        case CHARACTER_STATE.down:
          yChange = this.velocity;
          break;
        case CHARACTER_STATE.up:
          yChange = -this.velocity;
          break;
        case CHARACTER_STATE.left:
          xChange = -this.velocity;
          break;
        case CHARACTER_STATE.right:
          xChange = this.velocity;
          break;
      }
      
      const DIRECTION = {x: xChange, y: yChange};
      return DIRECTION;
  }
}

class PlayerBattle extends Character {
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, moving = false, data}) {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving, data});
    this.image.onload = () => {
      this.position = {
        x: canvas.width / 6,
        y: canvas.height - this.image.height
      }
      this.width = this.image.width / this.frames.max;
      this.height = this.image.height;
      this.drawWidth = this.width;
      this.drawHeight = this.height;
    } 
  }
  draw() {
    if(!this.position) {
      if(this.image.complete) {
        this.position = {
          x: canvas.width / 6,
          y: canvas.height - this.image.height
        }
        super.draw();
      }else {
        this.image.onload = () => {
          this.position = {
            x: canvas.width / 6,
            y: canvas.height - this.image.height
          }
          super.draw();
        };
      }
    }else {
      super.draw();
    }
  }
  // constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, moving = false, data}) {
  //   super({canvas, canvasContent, position, image, movementDelay, frames, moving, data});
  //   if(this.image.complete) {
  //     this.position = {
  //       x: canvas.width / 6,
  //       y: canvas.height - this.image.height
  //     }
  //   }else {
  //     this.image.onload = () => {
  //       this.position = {
  //         x: canvas.width / 6,
  //         y: canvas.height - this.image.height
  //       }
  //     };
  //   }
  // }
}

export { Boundary, Sprite, Character, Player, PlayerBattle };