import { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE } from "../js/types.js";
import { rectCollision, trueWithRatio } from '../js/utils.js';


class Boundary {
  static WIDTH = 48 // 12*12(TILE) * 400 (ZOOM)
  static HEIGHT = 48 // 12*12(TILE) * 400 (ZOOM)
  constructor({canvas, canvasContent, position}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.position = position;
    this.width = Boundary.WIDTH;
    this.height = Boundary.HEIGHT;
  }
  draw() {
    // this.c.fillStyle =  '#FF0000';
    this.c.fillStyle =  'transparent';
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
      this._handleImageOnLoad();
    };
  }
  _handleImageOnLoad() {
    this.width = this.image.width / this.frames.max;
    this.height = this.image.height;
  }
  _draw() {
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
        this._handleImageOnLoad();
        this._draw();
      }else {
        this.image.onload = () => {
          this.draw();
        };
      }
    }else {
      this._draw();
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
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, moving = false, isPlayer = true, data, pathToImg}) {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving});
    this.isPlayer = isPlayer;
    this.data = data? data: this.isPlayer? PLAYER_DATA_TYPE: ENEMY_DATA_TYPE;
    this.pathToImg = pathToImg;
  }
  editData(key, newValue) {
    if(Object.keys(this.data).includes(key)) {
      this.data[key] = newValue;
      return true;
    }else {
      console.log(`Data does not includes key ${key}`)
      console.log(this.data)
      return false;
    }
  }
  updateData(newData) {
    if(typeof newData !== 'object') {
      console.log('UpdateData needs to be an object');
      return false;
    }
    const NEW_DATA_KEYS = Object.keys(newData);
    const DATA_KEYS = Object.keys(this.data);
    const IS_SAME_KEYS = NEW_DATA_KEYS.length === DATA_KEYS.length
                          && NEW_DATA_KEYS.every(key => DATA_KEYS.includes(key));
    if(IS_SAME_KEYS) {
      for(let key in newData) {
        this.data[key] = newData[key];
      }
      this.updateImg();
      return true;
    }else {
      console.log('Input object does not have the same keys as class data.');
      return false;
    }
  }
  updateImg(src) {
    this.width = undefined;
    this.height = undefined;
    // image.downが正面を向いたキャラクター画像
    const SRC = (src?src:this.pathToImg + this.data.image.down);
    const IMAGE = new Image();
    IMAGE.onload = () => {
      this._handleImageOnLoad();
    }
    IMAGE.src = SRC;
    this.image = IMAGE;
  }
  loseHp(amount) {
    amount = amount? amount : 1;
    if(isNaN(amount)) {
      console.log('argument should be a number'); 
      return false;
    }
    const CURR_HP = this.data.hp;
    if(isNaN(CURR_HP)) {
      console.log(`currentHP is not a number,but ${this.data.hp}`); 
      return false;
    } 
    amount = (CURR_HP - amount < 0)? CURR_HP: amount;
    this.data.hp = CURR_HP - amount;
    const RETURN = { ok: true, amount: amount, hp: this.data.hp}
    return RETURN;    
  }
  recoverHp(amount) {
    if(this.data.hp === this.data.maxHp) return false;
    amount = amount? amount : 1;
    if(isNaN(amount)) {
      console.log('argument should be a number'); 
      return false;
    }
    const CURR_HP = this.data.hp;
    if(isNaN(CURR_HP)) {
      console.log(`currentHP is not a number,but ${this.data.hp}`); 
      return false;
    } 
    amount = (this.data.maxHp < CURR_HP + amount)? this.data.maxHp - CURR_HP: amount;
    this.data.hp = CURR_HP + amount;
    const HAS_PLAYER_RECOVERED = { ok: true, amount: amount, hp: this.data.hp}
    return HAS_PLAYER_RECOVERED;    
  }
  _setPositionToDefault(){
  }
  _handleImageOnLoad() {
    this._setPositionToDefault();
    super._handleImageOnLoad();
  }
}

// velocity: px / ゲーム1frame( 1000/FPS )
class Player extends Character {
  static stepMove = 24;
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, 
                moving = false, data, pathToImg, sprite, velocity = 2.4}) 
  {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving, isPlayer:true, data, pathToImg });
    this.state = CHARACTER_STATE.down;
    this.sprite = sprite;
    this.velocity = velocity;
    this.moved = 0;
    this.stepMove = Player.stepMove;
    this.image.onload = () => {
      this._handleImageOnLoad();
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
    // 左右が交互に前進するようにフレームを設定（frame.val偶数番はプレイヤーが止まっているフレーム）
    while(this.frames.val % 2 === 1) {
      this.frames.val ++;
      if( (this.frames.max - 1) < this.frames.val ) {
        this.frames.val = 0;
        break;
      }
    }
  }
  levelUp() {
    const CONDITION = this.data.lvUpCondition;
    if(!CONDITION) return false;
    for(let key in CONDITION) {
      if(this.data[key] < CONDITION[key]) return false;
    }
    if(!this.data.lv) return false;
    this.data.lv++;
    for(let key in CONDITION) {
      CONDITION[key] *= 2;
    }
    return true;
  }
  changeStateTo(newState) {
    if(this.state === newState) return;
    this.state = newState;
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
    this.frames.val = 0;
    this.moved = 0;
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
  getNextStepDirection() {
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
  addItem(item) {
    if(!this.data.item) {
      console.log('Player.data.item is not found');
      return false;
    }
    if(this.data.item.includes(item)) return false;
    this.data.item.push(item);
    return true;
  }
  _setPositionToDefault(){
    // プレイヤーを画面のセンターに配置
    this.position = {
      x: this.canvas.width/2 - this.image.width/this.frames.max/2,
      y: this.canvas.height/2 - this.image.height/2,
    }
  }
}
class PlayerBattle extends Player {
  // キャンバスに対するキャラクターサイズの比率
  static PLAYER_WIDTH_RATIO = 1/6;
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, moving = false, data, pathToImg}) {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving, data, pathToImg});
      this.drawWidth = Math.round(this.canvas.width * 10 * PlayerBattle.PLAYER_WIDTH_RATIO)/ 10;
      this.drawHeight = Math.round(this.canvas.width * 10 * PlayerBattle.PLAYER_WIDTH_RATIO) / 10;
      this.hp = new Hp({
        canvasContent: this.c,
        position: {
          x: 0,
          y: 0,
        },
        thickness: 5,
        width: this.drawWidth,
        currentHp:this.data.hp,
        maxHp: this.data.maxHp? this.data.maxHp :this.data.hp
      });
      this.image.onload = () => {
        this._handleImageOnLoad();
      } 
  }
  updateImg() {
    this.position = undefined;
    const SRC = this.pathToImg + this.data.image.up;
    super.updateImg(SRC);
  }
  updateData(newData) {
    if(super.updateData(newData)) {
      this.hp.updateCurrentHp({currHp: newData.hp, maxHp: newData.maxHp || newData.hp});
      return true;
    }
    return false;
  }
  addEnemyLog(enemyKey) {
    this.data.enemy.push(enemyKey);
  }
  loseHp(amount) {
    const RESULT = super.loseHp(amount);
    if(!RESULT) return false;
    if(!this.hp.loseHp(RESULT.amount)) return false;
    return RESULT;
  }
  recoverHp(amount) {
    const RESULT = super.recoverHp(amount);
    if(!RESULT) return false;
    if(!this.hp.recoverHp(RESULT.amount)) return false;
    return RESULT;
  }
  run() {
    if(trueWithRatio(this.data.rateRun)) {
      this.succeedRun = true;
      return true;
    }else {
      return false;
    }
  }
  _setPositionToDefault() {
    this.position = {
      // 数字は敵と均等に配置できるように設定
      x: Math.round(this.canvas.width / 6 * 10) / 10,
      y: Math.round((this.canvas.height - this.drawHeight) / 2 * 10) / 10
    }
  }
  _handleImageOnLoad() {
    super._handleImageOnLoad();
    this.hp.updatePosition(this.position);
  }
  _draw() {
    super._draw();
    this.hp.draw();
  }
}
class EnemyBattle extends Character {
  // キャンバスに対するキャラクターサイズの比率
  static ENEMY_WIDTH_RATIO = 1/8;
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, moving = false, data, pathToImg}) {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving, data, pathToImg});
      this.drawWidth = Math.round(this.canvas.width * 10 * EnemyBattle.ENEMY_WIDTH_RATIO)/ 10;
      this.drawHeight = Math.round(this.canvas.width * 10 * EnemyBattle.ENEMY_WIDTH_RATIO) / 10;
      this.hp = new Hp({
        canvasContent: this.c,
        position: {
          x: 0,
          y: 0,
        },
        thickness: 5,
        width: this.drawWidth,
        currentHp:this.data.hp,
        maxHp: this.data.maxHp? this.data.maxHp :this.data.hp
      });
      this.image.onload = () => {
        this._handleImageOnLoad();
      } 
  }
  updateImg() {
    this.position = undefined;
    const SRC = this.pathToImg + this.data.image.down;
    super.updateImg(SRC);
  }
  updateData(newData) {
    if(super.updateData(newData)) {
      this.hp.updateCurrentHp({currHp: newData.hp, maxHp: newData.maxHp || newData.hp});
      return true;
    }
    return false;
  }
  loseHp(amount) {
    const RESULT = super.loseHp(amount);
    if(!RESULT) return false;
    if(!this.hp.loseHp(RESULT.amount)) return false;
    return RESULT;
  }
  recoverHp(amount) {
    const RESULT = super.recoverHp(amount);
    if(!RESULT) return false;
    if(!this.hp.recoverHp(RESULT.amount)) return false;
    return RESULT;
  }
  _setPositionToDefault() {
    this.position = {
      // 数字はプレイヤーと均等に配置できるように設定
      x: Math.round((this.canvas.width * 5/6 - this.drawWidth) * 10) / 10,
      y: Math.round(this.canvas.height / 4 * 10) / 10
    }
  }
  _handleImageOnLoad() {
    super._handleImageOnLoad();
    this.hp.updatePosition(this.position);
  }
  _draw() {
    super._draw();
    this.hp.draw();
  }
}

class Hp {
  constructor({canvasContent, position, thickness=5, width=15, colorBase='rgb(255,255,255)', color='rgb(0,255,0)', currentHp, maxHp}) {
    this.c = canvasContent;
    this.position = position;
    this.thickness = thickness;
    this.width = width;
    this.colorBase = colorBase;
    this.color = color;
    this.currHp = currentHp;
    this.maxHp = maxHp;
  }
  draw() {
    const HP_WIDTH = Math.round(this.width * this.currHp / this.maxHp * 10) / 10;
    this.c.fillStyle = this.colorBase;
    this.c.fillRect(this.position.x, this.position.y - 10, this.width , this.thickness); // fillRect instead of rect
    this.c.fillStyle = this.color;
    this.c.fillRect(this.position.x, this.position.y - 10, HP_WIDTH , this.thickness); // fillRect instead of rect
  }
  loseHp(amount) {
    amount = amount? amount : 1;
    if(isNaN(amount)) {
      console.log('argument should be a number'); 
      return false;
    }
    const CURR_HP = this.currHp;
    if(isNaN(CURR_HP)) {
      console.log(`currentHP is not a number, but ${this.currHp}`); 
      return false;
    } 
    amount = (CURR_HP - amount < 0)? CURR_HP: amount;
    this.currHp = CURR_HP - amount;
    const RETURN = { ok: true, amount: amount, hp: this.currHp}
    return RETURN;   
  }
  recoverHp(amount) {
    amount = amount? amount : 1;
    if(isNaN(amount)) {
      console.log('argument should be a number'); 
      return false;
    }
    const CURR_HP = this.currHp;
    if(isNaN(CURR_HP)) {
      console.log(`currentHP is not a number, but ${this.currHp}`); 
      return false;
    } 
    amount = (this.maxHp < CURR_HP - amount)? CURR_HP: amount;
    this.currHp = CURR_HP + amount;
    const RETURN = { ok: true, amount: amount, hp: this.currHp}
    return RETURN;   
  }
  updatePosition(position) {
    this.position = position;
  }
  updateCurrentHp({currHp, maxHp}) {
    this.currHp = currHp || this.currHp;
    this.maxHp = maxHp || this.maxHp;
  }
}

export { Boundary, Sprite, Character, Player, PlayerBattle, EnemyBattle};