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
    console.log(newData)
    console.log(typeof newData)
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
    const RETURN = { ok: true, amount: amount, hp: this.data.hp}
    return RETURN;    
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
    this.bottom = bottom || 0;
    this.succeedRun = false;
    this.drawWidth = Math.round(this.canvas.width * 10 * (this.isPlayer?CharacterBattle.PLAYER_WIDTH_RATIO:CharacterBattle.ENEMY_WIDTH_RATIO))/ 10;
    this.drawHeight = Math.round(this.canvas.width * 10 * (this.isPlayer?CharacterBattle.PLAYER_WIDTH_RATIO:CharacterBattle.ENEMY_WIDTH_RATIO)) / 10;
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
        ?Math.round(canvas.width / 6 * 10) / 10
        :Math.round((canvas.width * 5/6 - this.drawWidth) * 10) / 10,
      y: this.isPlayer
        ?Math.round((canvas.height - this.drawHeight - this.bottom + 8) * 10) / 10
        :Math.round(canvas.height / 4 * 10) / 10
    }
  }
  _handleImageOnLoad() {
    this._setPositionToDefault();
    super._handleImageOnLoad();
    this.hp.updatePosition(this.position);
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
    amount = amount? amount : 1;
    const RESULT = super.loseHp(amount);
    if(!RESULT) return false;
    if(!this.hp.loseHp(amount)) return false;
    return RESULT;
  }
  recoverHp(amount) {
    amount = amount? amount : 1;
    const RESULT = super.recoverHp(amount);
    if(!RESULT) return false;
    if(!this.hp.recoverHp(amount)) return false;
    return RESULT;
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
      this.hp.updateCurrentHp({currHp: newData.hp, maxHp: newData.maxHp || newData.hp});
      return true;
    }
    return false;
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
class UICount extends UI {
  constructor({elemID, countUpEvent, countDownEvent, num}) {
    super({elemID});
    this.num = num? num: 0;
    if(countUpEvent) {
      EVENT_BUS.subscribe(countUpEvent, this.countUp.bind(this));
    }
    if(countDownEvent) {
      EVENT_BUS.subscribe(countUpEvent, this.countUp.bind(this));
    }
    EVENT_BUS.subscribe(EVENT.playerSelect, this.setNum.bind(this));
    this.elem.innerHTML = this.num;
  }
  _showNum() {
    this.elem.innerHTML = this.num;
  }
  countUp() {
    this.num++;
    this._showNum();
  }
  countDown() {
    this.num--;
    this._showNum();
  }
  setNum({playerData}) {
    if(!Object.keys(playerData).includes(this.elemID)) {
      console.log(`check ID name ${this.elemID}`);
      return false;
    }
    this.num = playerData[this.elemID];
    this._showNum();
    return true;
  }
}
class Log extends UI {
  constructor({elemID, className, event, dataKey, clearEvent}) {
    super({elemID});
    this.className = className;
    this.event = event;
    this.dataKey = dataKey;
    EVENT_BUS.subscribe(this.event, this.addLog.bind(this));
    if(dataKey) {
      EVENT_BUS.subscribe(EVENT.playerSelect, this.setLog.bind(this));
    }
    if(clearEvent) {
      EVENT_BUS.subscribe(clearEvent, this.clearLog.bind(this));
    }
  }
  addLog({log, delay}) {
    if(!log) return;
    const P = document.createElement('p');
    P.className = this.className;
    P.innerHTML = log;
    if(delay) {
      setTimeout(()=>{
        this.elem.append(P);
        scrollToBottom(this.elem);
      }, delay)
      return;
    }
    this.elem.append(P);
        scrollToBottom(this.elem);
  }
  setLog({playerData}) {
    for(let log of playerData[this.dataKey]) {
      this.addLog({log: log});
    }
  }
  clearLog() {
    this.elem.innerHTML = '';
  }
}
class AverageEncounter extends UI {
  constructor({elemID, step, encounter}) {
    super({elemID});
    this.step = step || 0;
    this.encounter = encounter || 0;
    EVENT_BUS.subscribe(EVENT.step, this.stepped.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.encountered.bind(this));
    EVENT_BUS.subscribe(EVENT.playerSelect, this.setNum.bind(this));
  }
  _show() {
    if(this.encounter === 0) {
      this.elem.innerHTML = '???';
      return;
    }
    const AVERAGE = Math.round(this.step / this.encounter * 10)/10;
    this.elem.innerHTML = AVERAGE;
  }
  stepped() {
    this.step++;
    this._show();
  }
  encountered() {
    this.encounter++;
    this._show();
  }
  setNum({playerData}) {
    this.num = playerData.step;
    this.total = playerData.enemy.length;
    this._show();
  }
}
class FullMsg extends UI{
  constructor({ elemID, elemCtrID, transitionTime}) {
    super({elemID})
    this.elemCtrID = elemCtrID? elemCtrID: elemID;
    this.transitionTime = Math.round(transitionTime / 1000);
    EVENT_BUS.subscribe(EVENT.getItem, this.getItem.bind(this));
    EVENT_BUS.subscribe(EVENT.drinkWater, this.drinkWater.bind(this));
    EVENT_BUS.subscribe(EVENT.takeNap, this.takeNap.bind(this));
  }
  showMsg() {
    if(!gsap) throw new Error('Install GSAP');
    gsap.timeline()
    .to(`#${this.elemCtrID}`, {
      opacity: 1,
      duration: 0.25,
      }
    )
    .to(`#${this.elemCtrID}`, {
      opacity: 0,
      duration: 0.25,
      },
      `+=${this.transitionTime - 0.5}`
    )
  }
  getItem({item}) {
    if(!item) throw new Error('this event argument does not provide item');
    this.elem.innerHTML = `${item.name}をゲットした`;
    this.showMsg();
  }
  drinkWater({recover}) {
    if(!recover) throw new Error('this event argument does not provide recover');
    this.elem.innerHTML = `水を飲んでHPを${recover}回復した`;
    this.showMsg();
  }
  takeNap({recover}) {
    if(!recover) throw new Error('this event argument does not provide recover');
    this.elem.innerHTML = `お昼寝してHPを${recover}回復した`;
    this.showMsg();
  }
}
class UICtrManager {
  constructor({overlapID, mapCtrID, battleCtrID, transitionTime, space}) {
    this.overlapID = overlapID;
    this.mapCtrID = mapCtrID;
    this.battleCtrID = battleCtrID;
    this.transitionTime = transitionTime / 1000;
    this.space = space
    EVENT_BUS.subscribe(EVENT.mapStart, this.mapStart.bind(this));
    EVENT_BUS.subscribe(EVENT.mapEnd, this.mapEnd.bind(this));
    EVENT_BUS.subscribe(EVENT.battleStart, this.battleStart.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.battleEnd.bind(this));
  }
  mapStart() {
    if(!gsap) throw new Error('Install GSAP');
    gsap.to(`#${this.mapCtrID}`, 
    {
      right: 0,
      opacity: 1, 
      duration: this.transitionTime
    });
  }
  mapEnd() {
    if(!gsap) throw new Error('Install GSAP');
    gsap.timeline()
    .to(`#${this.mapCtrID}`, 
    {
      right: '-20%',
      opacity: 0, 
      duration: this.transitionTime
    })
    .to(`#${this.overlapID}`, 
    {
      scale:4, 
      opacity: 1, 
      duration: this.transitionTime, 
    }, 0)
    .to(`#${this.overlapID}`, 
    {
      scale:8, 
      opacity: 0, 
      duration: this.transitionTime, 
    })
  }
  battleStart() {
    if(!gsap) throw new Error('Install GSAP');
    gsap.to(`#${this.battleCtrID}`, 
    {
      display: 'block',
      top: 0,
      duration: this.transitionTime
    });
  }
  battleEnd() {
    if(!gsap) throw new Error('Install GSAP');
    gsap.timeline()
    .to(`#${this.battleCtrID}`, 
    {
      display: 'block',
      top: '100%',
      duration: this.transitionTime
    })
    .to(`#${this.overlapID}`, 
    {
      scale:4, 
      opacity: 1, 
      duration: this.transitionTime, 
    }, 0)
    .to(`#${this.overlapID}`, 
    {
      scale:8, 
      opacity: 0, 
      duration: this.transitionTime, 
    })
  }
}
class UIBattleManager {
  constructor({fightOptId, runOptId, itemWinId, cocktailId, itemCtrId, itemSetBtnId, itemData, transitionTime}) {
    console.log(fightOptId)
    this.fightOptUI = new UI({elemID: fightOptId});
    this.runOptUI = new UI({elemID: runOptId});
    this.itemWinUI = new UI({elemID: itemWinId});
    this.cocktailUI = new UI({elemID: cocktailId});
    this.itemCtr = new ItemCtr({elemID: itemCtrId, itemData: itemData});
    this.itemSetBtnUI = new UI({elemID: itemSetBtnId});
    this.transitionTime = transitionTime;

    this.openIngOptCtrFunc = this.openIngOptCtr.bind(this); 
    this.closeIngOptCtrFunc = this.closeIngOptCtr.bind(this); 
    this.runFunc = this.run.bind(this);

    this.fightOptUI.elem.addEventListener('click', this.openIngOptCtrFunc);
    this.runOptUI.elem.addEventListener('click', this.runFunc);

    EVENT_BUS.subscribe(EVENT.failToRun, this.disableRun.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.reset.bind(this));
  }
  openIngOptCtr(e) {
    // イベントのバブリングを防ぐ
    e.stopPropagation();
    if(e.target !== this.fightOptUI.elem) return;
    gsap.fromTo(`#${this.itemWinUI.elemID}`, 
    {
      display: 'flex',
      scale: 0
    },
    {
      display: 'flex',
      scale: 1
    })
    window.addEventListener('click', this.closeIngOptCtrFunc);
    this.fightOptUI.elem.removeEventListener('click', this.openIngOptCtrFunc);
  }
  closeIngOptCtr(e) {
    e.stopPropagation();
    if(this.itemWinUI.elem.contains(e.target)
    || this.fightOptUI.elem.closest('label').contains(e.target)) return;
    gsap.to(`#${this.itemWinUI.elemID}`, 
    {
      display: 'flex',
      scale: 0
    })
    this.fightOptUI.checked = false;
    window.removeEventListener('click', this.closeIngOptCtrFunc);
    this.fightOptUI.elem.addEventListener('click', this.openIngOptCtrFunc);
  }
  run() {
    EVENT_BUS.publish(EVENT.run, {});
  }
  disableRun() {
    this.runOptUI.elem.disabled = true;
  }
  reset() {

  }
}
class ItemCtr {
  constructor({elemID, itemData}) {
    this.itemCtr = new UI({elemID: elemID});
    this.itemData = itemData;

    EVENT_BUS.subscribe(EVENT.playerSelect, this.makeItemList.bind(this));
    EVENT_BUS.subscribe(EVENT.getItem, this.addItem.bind(this));
  }
  makeItemList({playerData}) {
    console.log(this.itemCtr.elem)
    addOption({parent: this.itemCtr.elem, childList: playerData.item, 
      multiAnswer: true, name: 'battleItem',
      classList: ['item'], itemData: this.itemData})
  }
  addItem({item}) {
    addOption({parent: this.itemCtr.elem, childList: [item.name], 
      multiAnswer: true, name: 'battleItem', classList: ['item']})
  }
}

class GameManager {
  constructor({canvas, canvasContent, fps, offSet, data, transitionTime, keyEvent, pathToImg}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.data = data;
    this.transitionTime = transitionTime;
    this.keyEvent = keyEvent;
    this.pathToImg = pathToImg;
    this.playerData = this.data.player.male;
    EVENT_BUS.publish(EVENT.playerSelect, {playerData: this.playerData});
    const PLAYER_SPRITES = {};
    for(let key of Object.keys(this.playerData.image)) {
      const IMAGE = new Image();
      IMAGE.src = this.pathToImg + this.playerData.image[key];
      PLAYER_SPRITES[key] = IMAGE;
    } 
    this.player = new Player({canvas:this.canvas, canvasContent: this.c, position: {x:0,y:0}, image:PLAYER_SPRITES.down , data: this.playerData, pathToImg: this.pathToImg, sprite:PLAYER_SPRITES});
    this.mapAnimation = new MapAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, offSet: this.offSet, data: this.data, player: this.player, keyEvent: this.keyEvent, pathToImg: this.pathToImg, transitionTime: this.transitionTime});
    this.battleAnimation = new BattleAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, data: this.data, pathToImg: this.pathToImg, transitionTime: this.transitionTime});
    EVENT_BUS.subscribe(EVENT.getItem, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.drinkWater, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.takeNap, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.handleEncounter.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.handleEndBattle.bind(this));

  }
  startMapAnimation() {
    this.mapAnimation.animate();
    EVENT_BUS.publish(EVENT.mapStart, {});
  }
  stopMapAnimation() {
    this.mapAnimation.stopCurrAnimation();
    EVENT_BUS.publish(EVENT.mapEnd, {});
  }
  startBattleAnimation() {
    this.battleAnimation.animate(this.player.data);
    EVENT_BUS.publish(EVENT.battleStart, {});
  }
  stopBattleAnimation() {
    this.battleAnimation.stopCurrAnimation();
  }
  handleEncounter() {
    this.stopMapAnimation();
    setTimeout(this.startBattleAnimation.bind(this), this.transitionTime)
  }
  handleEndBattle({playerData}) {
    console.log(playerData)
    if(!this.player.updateData(playerData)) {
      console.log('error at handleEndBattle in GameManager');
      return;
    };
    this.stopBattleAnimation();
    setTimeout(this.startMapAnimation.bind(this), this.transitionTime)
  }
  showFullMsg() {
    this.stopMapAnimation();
    setTimeout(this.startMapAnimation.bind(this), this.transitionTime);
  }
}

class Animation {
  constructor({canvas, canvasContent, fps, offSet, data, player, keyEvent, pathToImg, transitionTime}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.enemiesData = data.enemy;
    this.itemsData = data.item;
    this.player = player;
    this.keyEvent = keyEvent;
    this.pathToImg = pathToImg;
    this.transitionTime = transitionTime;
    
    this.animationID;
    this.preTime = 0;
    this.currTime = 0;
    this.lag = 0;
  } 
  getLagTime() {
    // ゲームループのスピード調整
    // 前回の処理にによって生まれたラグを計算する。
    this.currTime = new Date().getTime();
    const ELAPSED_TIME = this.currTime - this.preTime;
    this.preTime = this.currTime;
    this.lag += ELAPSED_TIME;
  }
  animate() {
    this.preTime = new Date().getTime();
    this._animate();
  } 
  _animate() {
    this.animationID = window.requestAnimationFrame(this._animate.bind(this));
    this.getLagTime();
    while(this.frameInterval <= this.lag) {
      this._update();
      this.lag -= this.frameInterval;
    }

    this._render();
  }
  _update() {

  }
  _render() {

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
  static MAP_EVENT_INTERVAL = 3000;
  constructor({canvas, canvasContent, fps, offSet, data, player, keyEvent, pathToImg, transitionTime}) {
    super({canvas, canvasContent, fps, offSet, data, player, keyEvent, pathToImg, transitionTime});
    this.listMovable = [];
    this.item = {
      lastIndex: undefined,
      lastTime: 0,
      interval: MapAnimation.MAP_EVENT_INTERVAL
    }
    this.water = {
      lastIndex: undefined,
      lastTime: 0,
      interval: MapAnimation.MAP_EVENT_INTERVAL
    }
    this.nap = {
      lastIndex: undefined,
      lastTime: 0,
      interval: MapAnimation.MAP_EVENT_INTERVAL
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
    const IMG_BG = new Image();
    this.bg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: this.offSet.x,
        y: this.offSet.y,
      },
      image: IMG_BG,
      frames: {max: MapAnimation.BG_FRAME},
      moving: this.bgMoving,
    });
    IMG_BG.src = MapAnimation.BG_SRC;
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
    if(!onPath) {
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
    if(!onForest) {
      this.player.changeVelocity(2.4);
    }
    }

    // アイテムゲット
    if(this.item.lastTime === 0 || this.item.interval <= (this.currTime - this.item.lastTime)) {
      for(let i = 0; i < this.itemMap.length; i++) {
        const BOUNDARY = this.itemMap[i];
        if(this.player.isColliding(BOUNDARY)) {
          // 連続したアイテムゲットを防ぐ
          if(this.item.lastIndex - 2 <= i && i < this.item.lastIndex + 2) {
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
            this.item.lastTime = this.currTime;
            this.item.lastIndex = i;
            EVENT_BUS.publish(EVENT.getItem, { item: this.itemsData[ITEM] });
            return;
          };
        }
      }
    }
    // HP回復イベント（HPがmaxじゃない時）
    if(this.player.data.hp !== this.player.data.maxHp) {
      // 水
      if(this.water.lastTime === 0 || this.water.interval <= (this.currTime - this.water.lastTime)) {
        for(let i = 0; i < this.waterMap.length; i++) {
          const BOUNDARY = this.waterMap[i];
          if(this.player.isColliding(BOUNDARY)) {
            // 連続をを防ぐ
            if(this.water.lastIndex - 1 <= i && i < this.water.lastIndex + 1) {
              break;
            }
            const RESULT = this.player.recoverHp();
            if(RESULT) {
              this.water.lastTime = this.currTime;
              this.water.lastIndex = i;
              EVENT_BUS.publish(EVENT.drinkWater, { recover: RESULT.amount });
              return;
            };
          }
        }
      }
      // お昼寝
      if(this.nap.lastTime === 0 || this.nap.interval <= (this.currTime - this.nap.lastTime)) {
        for(let i = 0; i < this.napMap.length; i++) {
          const BOUNDARY = this.napMap[i];
          if(this.player.isColliding(BOUNDARY)) {
            // 連続をを防ぐ
            if(this.nap.lastIndex - 1 <= i && i < this.nap.lastIndex + 1) {
              break;
            }
            const RESULT = this.player.recoverHp(2);
            if(RESULT) {
              this.nap.lastTime = this.currTime;
              this.nap.lastIndex = i;
              EVENT_BUS.publish(EVENT.takeNap, { recover: RESULT.amount });
              return;
            };
          }
        }
      }
    }

    if(stepped) {
      EVENT_BUS.publish(EVENT.step, {});
      if(this.player.levelUp()) {
        this.player.stop();
        return;
      }
      if(onPath) return;
      const RATIO = onForest? this.player.data.rateEncounter*2: this.player.data.rateEncounter;
      if(trueWithRatio(RATIO)) {
        console.log('battle');
        this.player.stop();
        this.keyEvent.lastKey = undefined;
        // 通常アニメーション停止
        // this.stopCurrAnimation();
        EVENT_BUS.publish(EVENT.encounter, {});
      }
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
    this.waterMap.forEach(boundary=>{
      boundary.draw();
    })
    this.napMap.forEach(boundary=>{
      boundary.draw();
    })
    this.player.draw();
    this.fg.draw();
  }
}
class BattleAnimation extends Animation {
  static BG_SRC = './img/battle/bg_battle.png';
  static BG_FRAME = 1;
  static BG_MOVING = false;
  static PLAYER_IMG_SRC = 'mainMBack.png';
  constructor({canvas, canvasContent, fps, offSet, data, keyEvent, pathToImg, transitionTime}) {
    super({canvas, canvasContent, fps, offSet, data, keyEvent, pathToImg, transitionTime});
    this.bg;
    this.player;
    this.enemy;
    this.enemyList = [];
    this.init();
    EVENT_BUS.subscribe(EVENT.levelUp, this.addEnemyList.bind(this));
    EVENT_BUS.subscribe(EVENT.run, this.run.bind(this));
  }
  addEnemyList() {
    const LV = this.player.data.lv;
    for(let enemy of this.enemiesData[LV]) {
      this.enemyList.push(enemy);
    }
  }
  init() {
    // 固定背景
    const IMG_BG = new Image();
    this.bg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: 0,
        y: 0,
      },
      image: IMG_BG,
      frames: {max: BattleAnimation.BG_FRAME},
      moving: BattleAnimation.BG_MOVING
    });
    IMG_BG.src = BattleAnimation.BG_SRC;

    // プレイヤー
    const IMG_PLAYER = new Image();
    this.player = new CharacterBattle({
      canvas: this.canvas,
      canvasContent: this.c,
      image: IMG_PLAYER,
      data: PLAYER_DATA_TYPE,
      pathToImg: this.pathToImg,
      bottom: Math.round(this.canvas.height * 0.3 * 10) / 10
    });
    IMG_PLAYER.src = this.pathToImg + BattleAnimation.PLAYER_IMG_SRC;
    this.addEnemyList();
  }
  animate(playerData) {
    this.player.updateData(playerData);

    const ENEMY_DATA = choiceRandom(this.enemyList);
    // 敵
    const IMG_ENEMY = new Image();
    this.enemy = new CharacterBattle({
      canvas: this.canvas,
      canvasContent: this.c,
      image: IMG_ENEMY,
      data: ENEMY_DATA,
      isPlayer: false,
      pathToImg: this.pathToImg,
    });
    IMG_ENEMY.src = this.pathToImg + ENEMY_DATA.image.down;
    const COCKTAIL = ENEMY_DATA.cocktail.name;
    EVENT_BUS.publish(EVENT.battleReady, {cocktail: COCKTAIL})
    EVENT_BUS.publish(EVENT.battleDialog, {log: `${ENEMY_DATA.name}が現れた`, delay: 1000});
    EVENT_BUS.publish(EVENT.battleDialog, {log: `${COCKTAIL}を飲みたそうにしている`, delay: 1500});
    super.animate();
  }
  _update() {
    // console.log('update')
  }
  _render() {
    this.bg.draw();
    this.enemy.draw();
    this.player.draw();
  }
  run() {
    console.log(this.transitionTime)
    EVENT_BUS.publish(EVENT.battleDialog, {log: '・・・'});
    if(this.player.run()) {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, {log: '逃げ切ることができた！'});
        setTimeout(() => {
          EVENT_BUS.publish(EVENT.battleEnd, {playerData: this.player.data, enemy: this.enemy, beat: false});
        }, this.transitionTime)
      }, this.transitionTime)
    }else {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, {log: '逃げ切れなかった...'});
        EVENT_BUS.publish(EVENT.failToRun, {});
      }, this.transitionTime)
    }
  }
}

export {UIBattleManager, Log, UICtrManager, AverageEncounter, UICount,Boundary, Sprite, Character, Player, CharacterBattle, GameManager, MapAnimation, KeysEvent, FullMsg, UI};