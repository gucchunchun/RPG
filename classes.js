import { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT } from "./types.js";
import { COLLISION, PATH, FOREST, ITEM, WATER, NAP} from './data/boundaries.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom } from './utils.js';
import { gsap } from './node_modules/gsap/index.js';


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
// コンポーネント間でイベント発火共有
class EventBus {
  constructor() {
      this.events = {};
  }

  subscribe(event, callback) {
      if (!this.events[event]) {
          this.events[event] = [];
      }
      this.events[event].push(callback);
  }

  publish(event, data) {
      if (this.events[event]) {
          this.events[event].forEach(callback => {
              callback(data);
          });
      }
  }
}
const EVENT_BUS = new EventBus();

class KeysEvent {
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
    }
  }
  constructor({ctrlBtn= {down, up, left, right}}) {
    this.keys = KeysEvent.KEYS;
    this.lastKey;
    this.ctrlBtn = ctrlBtn;
    window.addEventListener('keydown', (e) => {
      const TARGET_KEY = e.key;
      for(let direction in this.keys) {
        const KEY = this.keys[direction];
        if(KEY.name === TARGET_KEY) {
          KEY.pressed = true;
          this.lastKey = TARGET_KEY;
        }
      }
    })
    window.addEventListener('keyup', (e)=> {
      const TARGET_KEY = e.key;
      for(let direction in this.keys) {
        const KEY = this.keys[direction];
        if(KEY.name === TARGET_KEY) {
          KEY.pressed = false;
          if(this.lastKey === TARGET_KEY) {
            this.lastKey = undefined;
          }
        }
      }
    });
    for(let direction in ctrlBtn) {
      ctrlBtn[direction].addEventListener('mousedown', (e)=> {
        const START_EVENT = new KeyboardEvent('keydown', {
          key: this.keys[direction].name,
        });
        window.dispatchEvent(START_EVENT);
      });
      ctrlBtn[direction].addEventListener('mouseup', (e)=> {
        const END_EVENT = new KeyboardEvent('keyup', {
          key: this.keys[direction].name,
        });
        window.dispatchEvent(END_EVENT);
      });
    }
  }
  setKeys({down, up, left, right}) {
    this.keys[down].name = down? down: this.keys[down].name;
    this.keys[up].name = up? up: this.keys[up].name;
    this.keys[left].name = left? left: this.keys[left].name;
    this.keys[right].name = right? right: this.keys[right].name;
  }
}

// UI
class UI {
  constructor({elemID}) {
    this.elemID = elemID;
    this.elem = document.getElementById(elemID);
  }
}
class UICountUp extends UI {
  constructor({elemID, event, num}) {
    super({elemID});
    this.num = num? num: 0;
    if(event) {
      EVENT_BUS.subscribe(event, this.countUp.bind(this));
    }
    this.elem.innerHTML = this.num;
  }
  countUp() {
    this.num++;
    this.elem.innerHTML = this.num;
  }
}
class EncounterLog extends UI {
  static CLASS = 'playerInfo--log';
  constructor({elemID}) {
    super({elemID});
    EVENT_BUS.subscribe(EVENT.encounter, this.addLog.bind(this));
  }
  addLog({enemyData}) {
    if(!enemyData) return;
    const P = document.createElement('p');
    P.className = EncounterLog.CLASS;
    P.innerHTML = enemyData.name;
    this.elem.append(P);
    scrollToBottom(this.elem);
  }
}
class AverageEncounter extends UICountUp {
  constructor({elemID, num, num2}) {
    super({elemID, num});
    this.num2 = num2? num2: 0;
    EVENT_BUS.subscribe(EVENT.step, this.stepped.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.encountered.bind(this));
  }
  show() {
    if(this.num2 === 0) {
      this.elem.innerHTML = '???';
      return;
    }
    const AVERAGE = Math.round(this.num / this.num2 * 10)/10;
    this.elem.innerHTML = AVERAGE;
  }
  stepped() {
    this.num++;
    this.show();
  }
  encountered() {
    this.num2++;
    this.show();
  }
}
class FullMsg extends UI{
  constructor({ elemID, elemCtrID, msgTime}) {
    super({elemID})
    this.elemCtrID = elemCtrID? elemCtrID: elemID;
    this.msgTime = Math.round(msgTime / 1000);
    EVENT_BUS.subscribe(EVENT.itemGet, this.getItem.bind(this));
  }
  showMsg() {
    if(!gsap) throw new Error('Install GSAP');
    gsap.timeline()
    .to(`#${this.elemCtrID}`, {
      opacity: 1
      }
    )
    .to(`#${this.elemCtrID}`, {
      opacity: 0,
      },
      `+=${this.msgTime}`
    )
  }
  getItem({item}) {
    if(!item) throw new Error('this event argument does not provide item');
    this.elem.innerHTML = `${item}をゲットした`;
    this.showMsg();
  }
}

class GameManager {
  constructor({canvas, canvasContent, fps, offSet, data, msgTime, keyEvent}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.data = data;
    this.msgTime = msgTime;
    this.keyEvent = keyEvent;
    const PLAYER_DATA = this.data.player.male;
    const PLAYER_SPRITES = {};
    for(let key of Object.keys(PLAYER_DATA.image)) {
      const IMAGE = new Image();
      IMAGE.src = './img/character/' + PLAYER_DATA.image[key];
      PLAYER_SPRITES[key] = IMAGE;
    } 
    this.player = new Player({canvas:this.canvas, canvasContent: this.c, position: {x:0,y:0}, image:PLAYER_SPRITES.down , data: PLAYER_DATA, pathToImg: './img/character/', sprite:PLAYER_SPRITES});
    this.mapAnimation = new MapAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, offSet: this.offSet, data: this.data, player: this.player, keyEvent: this.keyEvent});
    EVENT_BUS.subscribe(EVENT.itemGet, this.handleItemGet.bind(this));
  }
  startMapAnimation() {
    this.mapAnimation.animate();
  }
  stopMapAnimation() {
    this.mapAnimation.stopCurrAnimation();
  }
  handleItemGet() {
    this.stopMapAnimation();
    setTimeout(this.startMapAnimation.bind(this), this.msgTime);
  }
}

class Animation {
  constructor({canvas, canvasContent, fps, offSet, data, player, keyEvent}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.playersData = data.player;
    this.enemiesData = data.enemy;
    this.itemsData = data.item;
    this.player = player;
    this.keyEvent = keyEvent;
    
    this.animationID;
    this.preTime = 0;
    this.currTime = 0;
    this.lag = 0;
  } 
  animate() {
    this.preTime = new Date().getTime();
    this._animate();
  } 
  _animate() {
    
  }
  getLagTime() {
    // ゲームループのスピード調整
    // 前回の処理にによって生まれたラグを計算する。
    this.currTime = new Date().getTime();
    const ELAPSED_TIME = this.currTime - this.preTime;
    this.preTime = this.currTime;
    this.lag += ELAPSED_TIME;
  }
  stopCurrAnimation() {
    window.cancelAnimationFrame(this.animationID);
  }
}

class MapAnimation extends Animation {
  static BG_SRC = './img/map/map.png';
  static BG_FRAME = 2;
  static BG_MOVING = true;
  static FG_SRC = './img/map/map--foreground.png';
  static ITEM_INTERVAL = 3000;
  constructor({canvas, canvasContent, fps, offSet, data, player, keyEvent}) {
    super({canvas, canvasContent, fps, offSet, data, player, keyEvent});
    this.listMovable = [];
    this.item = {
      lastItemIndex: undefined,
      lastItemTime: 0,
      interval: MapAnimation.ITEM_INTERVAL
    }
    // 衝突検出用マップ
    this.boundaryMap;
    this.pathMap;
    this.forestMap;
    this.itemMap;
    this.waterMap;
    this.napMap;
    // 固定背景
    this.bg;
    this.bgMoving = MapAnimation.BG_MOVING;
    this.fg;
    this.init();
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
      frames: {max: MapAnimation.BG_FRAME},
      moving: this.bgMoving,
    });
    IMG_MAP.src = MapAnimation.BG_SRC;
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
    IMG_FG_OBJ.src = MapAnimation.FG_SRC;

    // プレイヤーの動きに合わせて動かす物
    this.listMovable = [this.bg, this.fg, ...this.boundaryMap, ...this.pathMap, ...this.forestMap, ...this.itemMap, ...this.waterMap, ...this.napMap];

    // EVENT_BUS.publish(EVENT.levelUp, {});
    // EVENT_BUS.publish(EVENT.beat, {});
    // EVENT_BUS.publish(EVENT.encounter, {});
    // EVENT_BUS.publish(EVENT.step, {});
  }
  _animate() {
    this.animationID = window.requestAnimationFrame(this._animate.bind(this));
    super.getLagTime();
    while(this.frameInterval <= this.lag) {
      this._update();
      this.lag -= this.frameInterval;
    }

    this._render();
  }
  _update() {
    // アニメーションのアップデート
    let stepped = false;
    // プレイヤーが一歩歩き終わっていない時：
    if(this.player.moving && 0 < this.player.moved && this.player.moved < this.player.stepMove) {
      const NEXT_MOVE = this.player.getNextStepDirection();
      let colliding = false;
      for(let i = 0; i < this.boundaryMap.length; i++) {
        const BOUNDARY = this.boundaryMap[i];
        const X = Math.round((BOUNDARY.position.x - NEXT_MOVE.x) * 10)/10;
        const Y = Math.round((BOUNDARY.position.y - NEXT_MOVE.y) * 10)/10;
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
          movable.updatePositionBy({x: -NEXT_MOVE.x, y: -NEXT_MOVE.y});
        })
        this.player.move();
        // 一歩の距離以上を歩いていたら
        if(this.player.stepMove <= this.player.moved) {
          stepped = true;
          this.player.step();
        }
      }
    }
    //  歩行を開始する時：
    else if(this.keyEvent.lastKey) {
      switch(this.keyEvent.lastKey) {
        case KeysEvent.KEYS.down.name:
          this.player.changeStateTo(CHARACTER_STATE.down);
          break;
        case KeysEvent.KEYS.up.name:
          this.player.changeStateTo(CHARACTER_STATE.up);
          break;
        case KeysEvent.KEYS.left.name:
          this.player.changeStateTo(CHARACTER_STATE.left);
          break;
        case KeysEvent.KEYS.right.name:
          this.player.changeStateTo(CHARACTER_STATE.right);
          break;
      }
      let colliding = false;
      const NEXT_MOVE = this.player.getNextStepDirection();
      for(let i = 0; i < this.boundaryMap.length; i++) {
        const BOUNDARY = this.boundaryMap[i];
        const X = Math.round((BOUNDARY.position.x - NEXT_MOVE.x) * 10)/10;
        const Y = Math.round((BOUNDARY.position.y - NEXT_MOVE.y) * 10)/10;
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
          movable.updatePositionBy({x: -NEXT_MOVE.x, y: -NEXT_MOVE.y});
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

    // アイテムゲット
    if(this.item.lastItemTime === 0 || this.item.interval <= (this.currTime - this.item.lastItemTime)) {
      for(let i = 0; i < this.itemMap.length; i++) {
        const BOUNDARY = this.itemMap[i];
        if(this.player.isColliding(BOUNDARY)) {
          // 連続したアイテムゲットを防ぐ
          if(this.item.lastItemIndex - 2 <= i && i < this.item.lastItemIndex + 2) {
            break;
          }
          const LIST_ITEM = [];
          for(let key in this.itemsData) {
            if(this.itemsData[key].lv !== 0 &&  this.itemsData[key].lv <= this.player.data.lv) {
              LIST_ITEM.push(key);
            }
          }
          const ITEM = choiceRandom(LIST_ITEM);
          if(this.player.addItem(ITEM)) {
            this.item.lastItemTime = this.currTime;
            this.item.lastItemIndex = i;
            EVENT_BUS.publish(EVENT.itemGet, { item: this.itemsData[ITEM].name });
            // showMsg(`${ITEM}をゲットした`);
            return;
          };
        }
      }
    }

    if(stepped) {
      EVENT_BUS.publish(EVENT.step, {});
    }
  }
  _render() {
    this.bg.draw();
    this.boundaryMap.forEach(boundary=>{
      boundary.draw();
    })
    this.pathMap.forEach(boundary=>{
      boundary.draw();
    })
    this.forestMap.forEach(boundary=>{
      boundary.draw();
    })
    this.itemMap.forEach(boundary=>{
      boundary.draw();
    })
    // this.waterMap.forEach(boundary=>{
    //   boundary.draw();
    // })
    // this.napMap.forEach(boundary=>{
    //   boundary.draw();
    // })
    this.player.draw();
    this.fg.draw();
  }
}

export {AverageEncounter, UICountUp,EncounterLog, Boundary, Sprite, Character, Player, CharacterBattle, GameManager, MapAnimation, KeysEvent, FullMsg, UI};