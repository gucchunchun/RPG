import { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE } from "./types.js";
import { COLLISION, PATH, FOREST, ITEM, WATER, NAP} from './data/boundaries.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom } from './utils.js';


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
        this._handleImageOnLoad();
        this._drawImageAndAnimate();
      }else {
        this.image.onload = () => {
          this._handleImageOnLoad();
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
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, moving = false, isPlayer = true, data, pathToImg}) {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving});
    this.isPlayer = isPlayer;
    this.data = data? data: this.isPlayer? PLAYER_DATA_TYPE: ENEMY_DATA_TYPE;
    this.pathToImg = pathToImg;
  }
  _updateImage() {
    console.log('updateImage')
    const SRC = this.pathToImg + this.data.image.down;
    const IMAGE = new Image();
    IMAGE.onload = () => {
      this._handleImageOnLoad();
    }
    IMAGE.src = SRC;
    this.image = IMAGE;
  }
  editData({key, newValue}) {
    if(Object.keys(this.data).includes(key)) {
      this.data[key] = newValue;
      return true;
    }else {
      return false;
    }
  }
  updateData(newData) {
    if(typeof newData !== 'object') {
      console.log('UpdateData needs to be an object');
      return false;
    }
    // 全部同一のキーなら交換OK
    const NEW_DATA_KEYS = Object.keys(newData);
    const DATA_KEYS = Object.keys(this.data);
    const IS_SAME_KEYS = NEW_DATA_KEYS.length === DATA_KEYS.length
                          && NEW_DATA_KEYS.every(key => DATA_KEYS.includes(key));
    if(IS_SAME_KEYS) {
      for(let key in newData) {
        this.data[key] = newData[key];
      }
      this._updateImage();
      return true;
    }else {
      console.log('Input object does not have the same keys as class data.');
      return false;
    }
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
  _positionCenter(){
    // プレイヤーを画面のセンターに配置
    this.position = {
      x: this.canvas.width/2 - this.image.width/this.frames.max/2,
      y: this.canvas.height/2 - this.image.height/2,
    }
  }
  _handleImageOnLoad() {
    this._positionCenter();
    super._handleImageOnLoad();
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
    console.log(this.data);
    return true;
  }
  addItem(item) {
    if(!this.data.item) {
      console.log('Player.data.item is not found');
      return false;
    }
    if(this.data.item.includes(item)) return false;
    this.data.item.push(item);
    console.log(this.data.item)
    return true;
  }
}

class CharacterBattle extends Character {
  static PLAYER_WIDTH_RATIO = 1/6;
  static ENEMY_WIDTH_RATIO = 1/8;
  constructor({canvas, canvasContent, position, image, movementDelay = 5, frames = {max: 4}, moving = false, isPlayer = true, data, pathToImg, bottom}) {
    super({canvas, canvasContent, position, image, movementDelay, frames, moving, isPlayer, data, pathToImg});
    this.isPlayer = isPlayer;
    this.bottom = bottom;
    this.succeedRun = false;
    this.drawWidth = this.canvas.width * (this.isPlayer?CharacterBattle.PLAYER_WIDTH_RATIO:CharacterBattle.ENEMY_WIDTH_RATIO);
    this.drawHeight = this.canvas.width * (this.isPlayer?CharacterBattle.PLAYER_WIDTH_RATIO:CharacterBattle.ENEMY_WIDTH_RATIO);
    this.image.onload = () => {
      this._handleImageOnLoad();
      this.hp = new Hp({
        canvasContent: this.c,
        position: {
          x: this.position.x, 
          y:this.position.y - 10
        },
        thickness: 5,
        width: this.drawWidth,
        currentHp:this.data.hp});
    } 
    
  }
  _updateImage() {
    const SRC = this.pathToImg + (this.isPlayer?this.data.image.up:this.data.image.down);
    const IMAGE = new Image();
    IMAGE.onload = () => {
      this._handleImageOnLoad();
    }
    IMAGE.src = SRC;
    this.image = IMAGE;
  }
  _setPositionToDefault() {
    this.position = {
      x: this.isPlayer
        ?canvas.width / 6
        :canvas.width * 5/6 - this.drawWidth,
      y: this.isPlayer
        ?canvas.height - this.drawHeight - this.bottom + 8
        :canvas.height / 4
    }
  }
  _handleImageOnLoad() {
    this._setPositionToDefault();
    super._handleImageOnLoad();
  }
  draw() {
    if(!this.position) {
      if(this.image.complete) {
        this.position = {
          x: this.isPlayer
            ?canvas.width / 6
            :canvas.width * 5/6 - this.drawWidth,
          y: this.isPlayer
            ?canvas.height - this.drawHeight - this.bottom + 8
            :canvas.height / 4
        }
        super.draw();
        this.hp.draw();
      }else {
        this.image.onload = () => {
          this.position = {
            x: this.isPlayer
              ?canvas.width / 6
              :canvas.width * 5/6 - this.drawWidth,
            y: this.isPlayer
              ?canvas.height - this.drawHeight - this.bottom + 8
              :canvas.height / 4
          }
          super.draw();
          this.hp.draw();
        };
      }
    }else {
      super.draw();
      this.hp.draw();
    }
  }
  loseHp(amount) {
    this.data.hp -= amount? amount : 1;
    this.hp.loseHp(amount);
  }
  recoverHp(amount) {
    this.data.hp += amount? amount : 1;
    this.hp.recoverHp(amount);
  }
  updateRecords({won, enemy}) {
    if(isNaN(this.data.encounter)) {
      console.log('this.data.encounter is not number. It possibly does not exist');
      return false;
    }
    if(!this.data.enemy) {
      console.log('this.data.enemy does not exist');
      return false;
    }
    this.data.encounter++;
    this.data.enemy.push(enemy);
    if(won) {
      if(isNaN(this.data.beat)) {
        console.log('this.data.encounter is not number. It possibly does not exist');
        return false;
      }
      this.data.beat++;
    }
    return true;
  }
  run() {
    if(trueWithRatio(this.data.rateRun)) {
      this.succeedRun = true;
      return true;
    }else {
      return false;
    }
  }
  updateData(newData) {
    if(super.updateData(newData)) {
      this.hp.updateCurrentHp(newData.hp);
      return true;
    }
    return false;
  }
}

class Hp {
  constructor({canvasContent, position, thickness=5, width=15, colorBase='rgb(255,255,255)', color='rgb(0,255,0)', currentHp}) {
    this.c = canvasContent;
    this.position = position;
    this.thickness = thickness;
    this.width = width;
    this.colorBase = colorBase;
    this.color = color;
    this.maxHp = currentHp;
    this.currentHp = currentHp;
  }
  draw() {
    const HP_WIDTH = Math.round(this.width * this.currentHp / this.maxHp * 10) / 10;
    this.c.fillStyle = this.colorBase;
    this.c.fillRect(this.position.x, this.position.y, this.width , this.thickness); // fillRect instead of rect
    this.c.fillStyle = this.color;
    this.c.fillRect(this.position.x, this.position.y, HP_WIDTH , this.thickness); // fillRect instead of rect
  }
  loseHp(amount) {
    this.currentHp -= amount? amount : 1;
  }
  recoverHp(amount) {
    this.currentHp += amount? amount : 1;
  }
  updateCurrentHp(currentHp) {
    this.currentHp = currentHp || 0;
  }
}

class GameManager {
  constructor({canvas, canvasContent, fps, offSet, data}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.players = data.player;
    this.enemy = data.enemy;
    this.item = data.item;
    this.player = Player;
  }
}

class MapGameManager extends GameManager {
  static BG_SRC = './img/map/map.png';
  static BG_FRAME = 2;
  static BG_MOVING = true;
  static FG_SRC = './img/map/map--foreground.png';
  static KEYS = {
    up: {
      pressed: false,
      name: 'ArrowUp',
    },
    down: {
      pressed: false,
      name: 'ArrowDown',
    },
    left: {
      pressed: false,
      name: 'ArrowLeft',
    },
    right: {
      pressed: false,
      name: 'ArrowRight',
    },
    pressed: false,
    lastKey: undefined
  }
  constructor({canvas, canvasContent, fps, offSet, data, Player, ctrlBtn: {down, up, left, right}}) {
    super({canvas, canvasContent, fps, offSet, data})
    this.player = Player;
    this.ctrlBtn = ctrlBtn;
    this.listMovable = [];
    this.preTime;
    this.animationID;
    // 衝突検出用マップ
    this.boundaryMap;
    this.pathMap;
    this.forestMap;
    this.itemMap;
    this.waterMap;
    this.napMap;
    // 固定背景
    this.bg;
    this.bgMoving = MapGameManager.BG_MOVING;
    this.fg;
    // コントールキー
    this.key = MapGameManager.KEYS;
  }
  init() {
    // 衝突検出用マップの作成
    this.boundaryMap = makeMap({array: COLLISION, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.pathMap = makeMap({array: PATH, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.forestMap = makeMap({array: FOREST, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.itemMap = makeMap({array: ITEM, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.waterMap = makeMap({array: WATER, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.napMap = makeMap({array: NAP, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});

    // 固定背景の作成
    const IMG_MAP = new Image();
    this.bg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: this.offSet.x,
        y: this.offSet.y,
      },
      image: IMG_MAP,
      frames: {max: MapGameManager.BG_FRAME},
      moving: this.bgMoving,
    });
    IMG_MAP.src = MapGameManager.BG_SRC;
    const IMG_FG_OBJ = new Image();
    this.fg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: this.offSet.x,
        y: this.offSet.y,
      },
      image: IMG_FG_OBJ
    });
    IMG_FG_OBJ.src = MapGameManager.FG_SRC;

    // プレイヤーの動きに合わせて動かす物
    this.listMovable = [this.bg, this.fg, ...this.boundaryMap, ...this.pathMap, ...this.forestMap, ...this.itemMap, ...this.waterMap, ...this.napMap];

    // イベントリスナー
    window.addEventListener('keydown', (e)=> {
      const TARGET_KEY = e.key;
      for(let key in this.keys) {
        if(key !== 'lastKey'&& key !== 'pressed' && this.keys[key].name === TARGET_KEY) {
          this.keys[key].pressed = true;
          this.keys.lastKey = TARGET_KEY;
          this.keys.pressed = true;
        }
      }
    });
    window.addEventListener('keyup', (e)=> {
        const TARGET_KEY = e.key;
        for(let key in this.keys) {
          if(key !== 'lastKey' && key !== 'pressed' && this.keys[key].name === TARGET_KEY) {
            this.keys[key].pressed = false;
            this.keys.pressed = false;
          }
        }
    });
    for(let direction in this.ctrlBtn) {
      this.ctrlBtn[direction].addEventListener('mousedown', (e)=> {
        const START_EVENT = new KeyboardEvent('keydown', {
          key: this.keys[direction].name,
        });
        window.dispatchEvent(START_EVENT);
      });
      this.ctrlBtn[direction].addEventListener('mouseup', (e)=> {
        const END_EVENT = new KeyboardEvent('keyup', {
          key: this.keys[direction].name,
        });
        window.dispatchEvent(END_EVENT);
      });
    }
  }
  animate() {
    this.preTime = new Date().getTime();
    this._animate();
  } 
  _animate() {
    // ゲームループのスピード調整
    // （歩くスピード調節ができるようにするため）
    this.animationID = window.requestAnimationFrame(this._animate);
    const CURR_TIME = new Date().getTime();
    const ELAPSED_TIME = CURR_TIME - this.preTime;
    if(!(this.frameInterval <= ELAPSED)) return;
    this.preTime = CURR_TIME - (ELAPSED % this.frameInterval);

    // アニメーションのアップデート
    let stepped = false;
    // プレイヤーが一歩歩き終わっていない時：
    if(this.player.moving && 0 < this.player.moved && this.player.moved < this.player.stepMove) {
      const NEXT_DIRECTION = this.player.getNextStepDirection();
      let colliding = false;
      for(let i = 0; i < this.boundaryMap.length; i++) {
        const BOUNDARY = this.boundaryMap[i];
        const X = Math.round((BOUNDARY.position.x - NEXT_DIRECTION.x) * 10)/10;
        const Y = Math.round((BOUNDARY.position.y - NEXT_DIRECTION.y) * 10)/10;
        if(this.player.isColliding({...BOUNDARY, position: {x: X, y: Y}})) {
          colliding = true;
          break;
        }
      }
      // 歩ける範囲にいない場合：
      if(colliding) {
        this.player.stop();
      }
      // 歩ける場合：
      else {
        this.listMovable.forEach((movable) => {
          movable.updatePositionBy({x: -NEXT_DIRECTION.x, y: -NEXT_DIRECTION.y});
        })
        this.player.move();
        // 一歩の距離以上を歩いていたら
        if(this.player.stepMove <= this.player.moved) {
          stepped = true;
          PLAYER.step();
        }
      }
    }
    //  歩行を開始する時：
    else if(this.keys.pressed) {
      if(this.keys.down.pressed && this.keys.lastKey == this.keys.down.name) {
        this.player.changeStateTo(CHARACTER_STATE.down);
      }else if(this.keys.up.pressed && this.keys.lastKey == this.keys.up.name) {
        this.player.changeStateTo(CHARACTER_STATE.up);
      }else if(this.keys.left.pressed && this.keys.lastKey == this.keys.left.name) {
        this.player.changeStateTo(CHARACTER_STATE.left);
      }else if(this.keys.right.pressed && this.keys.lastKey == this.keys.right.name) {
        this.player.changeStateTo(CHARACTER_STATE.right);
      };
      let colliding = false;
      const NEXT_MOVE = this.player.getNextStepDirection();
      for(let i = 0; i < this.boundaryMap.length; i++) {
        const BOUNDARY = this.boundaryMap[i];
        const X = Math.round((this.boundaryMap.position.x - NEXT_MOVE.x) * 10)/10;
        const Y = Math.round((this.boundaryMap.position.y - NEXT_MOVE.y) * 10)/10;
        if(this.player.isColliding({...BOUNDARY, position: {x: X, y: Y}})) {
          colliding = true;
          break;
        }
      }
      // 歩ける範囲にいない場合：
      if(colliding) {
        this.player.stop();
      }
      // 歩ける場合：
      else {
        this.listMovable.forEach((movable) => {
          movable.updatePositionBy({x: -NEXT_DIRECTION.x, y: -NEXT_DIRECTION.y});
        })
        this.player.move();
      }
    }
    //  キーボード/ボタンが押されていない場合＝プレイヤー停止
    else {
      this.player.stop();
    }

    let onPath = false;
    let onForest = false;
    //  プレイヤーが道を歩いている場合：1歩 ＝ 4px * 6frames 早歩き
    for(let i = 0; i < this.pathMap.length; i++) {
      const BOUNDARY = this.pathMap[i];
      if(this.player.isColliding(BOUNDARY)) {
        onPath = true;
        this.player.changeVelocity(4);
        break;
      }
    }
    //  プレイヤーが森を歩いている場合：1歩 ＝ 1px * 12frames　ゆっくり
    for(let i = 0; i < this.forestMap.length; i++) {
      const BOUNDARY = this.forestMap[i];
      if(this.player.isColliding(BOUNDARY)) {
        onForest = true;
        this.player.changeVelocity(1);
        break;
      }
    }
    //  プレイヤーが草原を歩いている場合：1歩 ＝ 2.4px * 5frames　デフォルト
    if(!onPath && !onForest) {
      this.player.changeVelocity(2.4);
    }

    if(stepped) {

    }
  }
}

export { Boundary, Sprite, Character, Player, CharacterBattle};