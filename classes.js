import { KEYS_INTERFACE, UI_MGR_INTERFACE, CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT } from "./types.js";
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
  updateImage() {
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
      this.updateImage();
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
      console.log(this.state)
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
    return true;
  }
  addItem(item) {
    if(!this.data.item) {
      console.log('Player.data.item is not found');
      return false;
    }
    console.log('player has' + this.data.item)
    if(this.data.item.includes(item)) return false;
    console.log(item)
    this.data.item.push(item);
    return true;
  }
}

class CharacterBattle extends Character {
  // キャンバスに対するキャラクターサイズの比率
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
  updateImage() {
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
    if(!this.data.enemy) {
      console.log('this.data.enemy does not exist');
      return false;
    }
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

// UI
class UI {
  constructor({elemId}) {
    this.elemId = elemId;
    this.elem = document.getElementById(elemId);
  }
}
class Keys {
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
  constructor({downKeyId, upKeyId, leftKeyId, rightKeyId}) {
    this.keys = Keys.KEYS;
    this.lastKey;
    this.ctrlBtn =  {
      down: new UI({elemId: downKeyId}),
      up: new UI({elemId: upKeyId}),
      left: new UI({elemId: leftKeyId}),
      right: new UI({elemId: rightKeyId})
    }
    this.init();
  }
  init() {
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

    for(let direction in this.ctrlBtn) {
      this.ctrlBtn[direction].elem.addEventListener('mousedown', (e)=> {
        const START_EVENT = new KeyboardEvent('keydown', {
          key: this.keys[direction].name,
        });
        window.dispatchEvent(START_EVENT);
      });
      this.ctrlBtn[direction].elem.addEventListener('mouseup', (e)=> {
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
class UICount extends UI {
  constructor({elemId, countUpEvent, countDownEvent, num}) {
    super({elemId});
    this.num = num? num: 0;
    if(countUpEvent) {
      EVENT_BUS.subscribe(countUpEvent, this.countUp.bind(this));
    }
    if(countDownEvent) {
      EVENT_BUS.subscribe(countDownEvent, this.countUp.bind(this));
    }
    EVENT_BUS.subscribe(EVENT.playerSelect, this.setNum.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.setNum.bind(this));
    this.elem.innerHTML = this.num;
  }
  _showNum() {
    this.elem.innerHTML = this.num;
  }
  countUp({amount}) {
    if(amount) {
      this.num += amount;
    }else {
      this.num++;
    }
    this._showNum();
  }
  countDown({amount}) {
    if(amount) {
      this.num -= amount;
    }else {
      this.num--;
    }
    this._showNum();
  }
  setNum({playerData}) {
    if(!Object.keys(playerData).includes(this.elemId)) {
      console.log(`check ID name ${this.elemId}`);
      return false;
    }
    this.num = playerData[this.elemId];
    console.log()
    this._showNum();
    return true;
  }
}
class Log extends UI {
  constructor({elemId, className, event, dataKey, showKey, clearEvent}) {
    super({elemId});
    this.className = className;
    this.event = event;
    this.dataKey = dataKey;
    this.showKey = showKey;
    this.logList = [];
    if(event) {
      EVENT_BUS.subscribe(this.event, this.addLog.bind(this));
    }
    if(dataKey) {
      EVENT_BUS.subscribe(EVENT.playerSelect, this.setLog.bind(this));
      EVENT_BUS.subscribe(EVENT.battleEnd, this.setLog.bind(this));
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
    this.logList.push(log);
    scrollToBottom(this.elem);
  }
  setLog({playerData}) {
    const NEW_LOGS = playerData[this.dataKey].filter((log, i )=>(this.logList.length - 1) < i);
    for(let log of NEW_LOGS) {
      for(let key of this.showKey) {
        log = log[key]
      }
      this.addLog({log: log});
    }
    scrollToBottom(this.elem);
  }
  clearLog() {
    this.elem.innerHTML = '';
  }
}
class AverageEncounter extends UI {
  constructor({elemId, step, encounter}) {
    super({elemId});
    this.step = step || 0;
    this.encounter = encounter || 0;
    EVENT_BUS.subscribe(EVENT.step, this.stepped.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.setNum.bind(this));
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
    this.step = playerData.step;
    this.encounter = playerData.enemy.length;
    this._show();
  }
}
class ItemCtr {
  constructor({elemId, itemDatabase}) {
    this.itemCtr = new UI({elemId: elemId});
    this.itemDatabase = itemDatabase ;
    this.itemList = [];

    EVENT_BUS.subscribe(EVENT.playerSelect, this.makeItemList.bind(this));
    EVENT_BUS.subscribe(EVENT.getItem, this.addItem.bind(this));
  }
  makeItemList({playerData}) {
    this.itemList = addOption({parent: this.itemCtr.elem, childList: playerData.item, 
      multiAnswer: true, name: 'battleItem',
      classList: ['item'], itemsData: this.itemDatabase })
  }
  addItem({itemKey}) {
    this.itemList.push(addOption({parent: this.itemCtr.elem, childList: [itemKey], 
      multiAnswer: true, name: 'battleItem', classList: ['item'], itemsData : this.itemDatabase })[0]);
  }
  getCheckedItemName() {
    const SELECTED = this.itemList.filter(item=>item.checked).map(item=>item.value);
    return SELECTED;
  }
  resetChecked() {
    for(let item of this.itemList) {
      if(item.checked) item.checked = false;
    }
  }
}

class Overlap {
  static OVERLAP_CLASS = 'overlap';
  static OVERLAP_MSG_CLASS = 'overlap-msg';
  constructor({gameCtrUI, transTime}) {
    this.gameCtrUI = gameCtrUI;
    this.transTime = transTime; //millisecond
    this.overlap;
    this.overlapMsg;
    this.init();
  }

  init() {
    const OVERLAP = document.createElement('div');
    OVERLAP.className = Overlap.OVERLAP_CLASS;
    const OVERLAP_MSG = document.createElement('p');
    OVERLAP_MSG.className = Overlap.OVERLAP_MSG_CLASS;
    OVERLAP.appendChild(OVERLAP_MSG);
    this.gameCtrUI.elem.appendChild(OVERLAP);
    this.overlap = OVERLAP;
    this.overlapMsg = OVERLAP_MSG;
  }
  circle() {
    if(!gsap) {
      console.log('Install GSAP'); 
      return;
    }
    gsap.timeline()
    .fromTo(this.overlap, 
      {
        scale: 0, 
        opacity: 0, 
      },
      {
        scale: 1, 
        opacity: 1, 
        duration: this.transTime / 1000, 
      }
    )
    .to(this.overlap, 
      {
        scale: 1, 
        opacity: 0, 
        duration: this.transTime / 1000, 
      }
    )
  }
  down() {
    if(!gsap) {
      console.log('Install GSAP'); 
      return;
    }
    gsap.timeline()
    .fromTo(this.overlap, 
    {
      borderRadius: 0,
      scale: 1, 
      opacity: 1, 
      top: `${this.overlap.height / 2}px`,
    },
    {
      scale: 1, 
      opacity: 1, 
      top: '50%',
      duration: this.transTime / 2 / 1000, 
    })
    .to(this.overlap, 
    {
      borderRadius: '50%',
      scale: 1, 
      opacity: 0, 
      duration: this.transTime / 1000, 
    }, 
    `>${this.transTime / 2 / 1000}`
    );
  }
  addMsg(msg) {
    this.overlapMsg.innerHTML = msg;

  }
  showMsg(msg) {
    this.addMsg(msg);
    gsap.timeline()
    .fromTo(this.overlap, 
      {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        scale: 1, 
        opacity: 0, 
      },
      {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        scale: 1, 
        opacity: 1, 
        duration: this.transTime / 2 / 1000, 
      }
    )
    .to(this.overlap, 
      {
        backgroundColor: 'rgba(0, 0, 0, 1)',
        scale: 1, 
        opacity: 0, 
        duration: this.transTime / 1000, 
      }, 
      `>${this.transTime / 2 / 1000}`
    );
    setTimeout(() => {
      this.addMsg('');
    }, this.transTime * 2)
  }
}

// タイトル画面UI
class TitleUIManager {
  static BTN_CLASS = 'titlePage__btn';
  static PLAYER_SELECT_CTR = 'player-select-ctr';
  static PLAYER_SEX_OPT_CTR = 'player-sex-opt__ctr';
  static PLAYER_SEX_OPT = 'player-sex-opt';
  static PLAYER_NAME_CTR = 'player-name-ctr';
  static PLAYER_NAME = 'player-name';
  static PLAYER_NAME_LABEL = 'player-name__label';
  static ERR_CLASS = 'err';
  static PLAYER_SET_BTN = 'player-set-btn';
  constructor({ctrId, titlePageCtrId, titlePageBtnCtrId, startNewGameBtnId, prevData, playerDatabase, transTime}) {
    this.ctrId = ctrId;
    this.ctrUI = new UI({elemId: ctrId});
    this.titlePageCtrUI = new UI({elemId: titlePageCtrId});
    this.titlePageBtnCtrUI = new UI({elemId: titlePageBtnCtrId});
    this.startNewGameBtnUI = new UI({elemId: startNewGameBtnId});
    this.prevData = prevData;
    this.playerDatabase = playerDatabase;
    this.transTime = transTime;
    this.playerSelectPage;
    this.name;
    this.nameError;
    this.playerSetBtn;
    this.init();
    EVENT_BUS.subscribe(EVENT.playerSelect, this.closePlayerSelectScreen.bind(this));
  }
  init() {
    // タイトル画面
    this.startNewGameBtnUI.elem.addEventListener('click', this.handleStartBtnClick.bind(this));
    
    if(this.prevData) {
      const CONTINUE_BTN = document.createElement('button');
      CONTINUE_BTN.className = TitleUIManager.BTN_CLASS;
      CONTINUE_BTN.innerHTML = `${this.prevData.name}としてゲームを始める`;
      this.titlePageBtnCtrUI.elem.append(CONTINUE_BTN);
      CONTINUE_BTN.addEventListener('click', this.handleContinueBtnClick.bind(this));
    }

    // プレイヤー選択画面
    const PLAYER_SELECT_CTR = document.createElement('div');
    PLAYER_SELECT_CTR.className = TitleUIManager.PLAYER_SELECT_CTR;

    const PLAYER_SEX_OPT_CTR = document.createElement('div');
    PLAYER_SEX_OPT_CTR.className = TitleUIManager.PLAYER_SEX_OPT_CTR;
    const PLAYER_SEX_OPT = addOption({parent: PLAYER_SEX_OPT_CTR, childList: Object.keys(this.playerDatabase),
      multiAnswer: false, name: 'playerSelect', classList: [TitleUIManager.PLAYER_SEX_OPT], 
      itemsData: this.playerDatabase});
    PLAYER_SELECT_CTR.appendChild(PLAYER_SEX_OPT_CTR);
    for(let opt of PLAYER_SEX_OPT) {
      opt.addEventListener('click', this.handleSexSelect);
    }

    const PLAYER_NAME_CTR = document.createElement('div');
    PLAYER_NAME_CTR.className = TitleUIManager.PLAYER_NAME_CTR;
    const PLAYER_NAME_LABEL = document.createElement('label');
    PLAYER_NAME_LABEL.for = 'playerName';
    PLAYER_NAME_LABEL.className = TitleUIManager.PLAYER_NAME_LABEL;
    PLAYER_NAME_LABEL.innerHTML = '名前?';
    const PLAYER_NAME = document.createElement('input');
    PLAYER_NAME.type = 'text';
    PLAYER_NAME.id = 'playerName';
    PLAYER_NAME.className = TitleUIManager.PLAYER_NAME;
    PLAYER_NAME.min = 1;
    PLAYER_NAME.max = 10;
    PLAYER_NAME.addEventListener('blur', this.handleInputName.bind(this));
    const ERR_MSG = document.createElement('p');
    ERR_MSG.className = TitleUIManager.ERR_CLASS;
    this.nameError = ERR_MSG;
    PLAYER_NAME_CTR.appendChild(PLAYER_NAME_LABEL);
    PLAYER_NAME_CTR.appendChild(PLAYER_NAME);
    PLAYER_NAME_CTR.appendChild(ERR_MSG);
    PLAYER_SELECT_CTR.appendChild(PLAYER_NAME_CTR);

    const SET_BTN = document.createElement('button');
    SET_BTN.className = TitleUIManager.PLAYER_SET_BTN;
    SET_BTN.innerHTML = 'ゲームスタート';
    SET_BTN.addEventListener('click', this.handlePlayerSetBtnClick.bind(this));
    this.playerSetBtn = SET_BTN;
    this.disablePlayerSetBtn();
    PLAYER_SELECT_CTR.appendChild(SET_BTN);

    PLAYER_SELECT_CTR.style.display = 'none';
    this.ctrUI.elem.appendChild(PLAYER_SELECT_CTR);
    this.playerSelectPage = PLAYER_SELECT_CTR;
  }
  handleStartBtnClick() {
    EVENT_BUS.publish(EVENT.newGameStart);
    this.closeTittleScreen();
    this.openPlayerSelectScreen();
  }
  closeTittleScreen() {
    gsap.timeline()
    .to(this.titlePageCtrUI.elem, 
      {
        display: 'flex',
        opacity: 1,
      }
    )
    .to(this.titlePageCtrUI.elem, 
      {
        display: 'flex',
        opacity: 0,
        duration: this.transTime / 1000
      }
    , 0)
    .set(this.titlePageCtrUI.elem, 
      {
        display: 'none',
        opacity: 0,
      }
    , `+=${this.transTime / 1000}`)
  }
  closePlayerSelectScreen() {
    gsap.timeline()
    .to(this.playerSelectPage, 
      {
        display: 'flex',
        opacity: 1,
      }
    )
    .to(this.playerSelectPage, 
      {
        display: 'flex',
        opacity: 0,
        duration: this.transTime / 1000
      }
    , 0)
    .set(this.playerSelectPage, 
      {
        display: 'none',
        opacity: 0,
      }
    , `+=${this.transTime / 1000}`)
  }
  openPlayerSelectScreen() {
    gsap.timeline()
    .set(this.playerSelectPage, 
      {
        display: 'flex',
        opacity: 0,
      }
    )
    .to(this.playerSelectPage, 
      {
        display: 'flex',
        opacity: 1,
        duration: this.transTime / 1000
      }
    , `+=${this.transTime / 1000}`)
  }
  ablePlayerSetBtn() {
    this.playerSetBtn.disabled = false;
  }
  disablePlayerSetBtn() {
    this.playerSetBtn.disabled = true;
  }
  handleSexSelect(e) {
    const SELECTED_KEY =  e.target.value;
    EVENT_BUS.publish(EVENT.playerSetCharacter, {key: SELECTED_KEY})
  }
  handleInputName(e) {
    const VALUE = e.target.value;
    const VALUE_LEN = VALUE.length;
    if(VALUE_LEN === 0 || 10 < VALUE_LEN) {
      this.nameError.innerHTML = '１〜１０字にしてください';
      this.disablePlayerSetBtn();
      return
    }
    if(/\s/.test(VALUE)) {
      this.nameError.innerHTML = 'スペースは使用できません';
      this.disablePlayerSetBtn();
      return
    }
    this.nameError.innerHTML = '';
    this.name = VALUE;
    this.ablePlayerSetBtn();
  }
  handlePlayerSetBtnClick() {
    EVENT_BUS.publish(EVENT.playerSetName, {name: this.name});
  }
  handleContinueBtnClick() {
    this.closeTittleScreen();
    EVENT_BUS.publish(EVENT.playerSelect, {playerData: this.prevData});
  }
}
// マップ画面UI
class MapUIManager {
  static ENC_LOG_CLASS = 'playerInfo--log';
  constructor({ctrId, sideCtrId, lvId, hpId, stepId, beatId, avgEncId, encLogCtrId, transTime}) {
    this.ctrUI = new UI({elemId: ctrId});
    this.sideCtrUI = new UI({elemId: sideCtrId});
    this.lvMgr = new UICount({elemId: lvId, countUpEvent: EVENT.levelUp, num: 1});
    this.hpMgr = new UICount({elemId: hpId, countUpEvent: EVENT.recoverHp, countDownEvent: EVENT.loseHp});
    this.stepMgr = new UICount({elemId: stepId, countUpEvent: EVENT.step});
    this.beatMgr = new UICount({elemId: beatId});
    this.avgEncMgr = new AverageEncounter({elemId: avgEncId});
    this.encLogMgr = new Log({elemId: encLogCtrId, className: MapUIManager.ENC_LOG_CLASS, dataKey: 'enemy', showKey: ['data', 'name']});
    this.transTime = transTime;
  }
  mapStart() {
    this.ctrUI.elem.style.display = 'flex';
    if(!gsap) throw new Error('Install GSAP');
    gsap.to(this.sideCtrUI.elem, 
      {
        right: 0,
        opacity: 1,
        duration: this.transTime / 1000
      }
    );
  }
  mapEnd() {
    if(!gsap) throw new Error('Install GSAP');
    gsap.to(this.sideCtrUI.elem, 
      {
        right: `-${this.sideCtrUI.elem.clientWidth}px`,
        opacity: 0, 
        duration: this.transTime / 1000
      }
    );
    setTimeout(()=>{
      this.ctrUI.elem.style.display = 'flex';
    }, this.transTime)
  }
}
// バトル画面UI
class BattleUIManager {
  constructor({ctrId, bottomCtrId, fightOptId, runOptId, itemWinId, cocktailId, itemCtrId, itemSetBtnId, itemsData, transTime, styleSpace}) {
    this.ctrUI = new UI({elemId: ctrId});
    this.bottomCtrUI = new UI({elemId: bottomCtrId});
    this.fightOptUI = new UI({elemId: fightOptId});
    this.runOptUI = new UI({elemId: runOptId});
    this.itemWinUI = new UI({elemId: itemWinId});
    this.cocktailUI = new UI({elemId: cocktailId});
    this.itemCtr = new ItemCtr({elemId: itemCtrId, itemsData: itemsData});
    this.itemSetBtnUI = new UI({elemId: itemSetBtnId});
    this.transTime = transTime;
    this.styleSpace = styleSpace;

    this.openItemWindowFunc = this.openItemWindow.bind(this); 
    this.closeItemWindowFunc = this.closeItemWindow.bind(this); 
    this.runFunc = this.run.bind(this);

    this.fightOptUI.elem.addEventListener('click', this.openItemWindowFunc);
    this.runOptUI.elem.addEventListener('click', this.runFunc);
    this.itemSetBtnUI.elem.addEventListener('click', this.handleItemSetBtnClick.bind(this));

    EVENT_BUS.subscribe(EVENT.failToRun, this.disableRun.bind(this));
    EVENT_BUS.subscribe(EVENT.battleReady, this.handleBattleReady.bind(this));
  }
  handleBattleReady({cocktail}) {
    this.cocktailUI.elem.innerHTML = cocktail;
  }
  openItemWindow(e) {
    if(e) {
      // イベントのバブリングを防ぐ
      e.stopPropagation();
      if(e.target !== this.fightOptUI.elem) return;
    }
    gsap.fromTo(`#${this.itemWinUI.elemId}`, 
    {
      display: 'flex',
      scale: 0
    },
    {
      display: 'flex',
      scale: 1
    })
    window.addEventListener('click', this.closeItemWindowFunc);
    this.fightOptUI.elem.removeEventListener('click', this.openItemWindowFunc);
  }
  closeItemWindow(e) {
    if(e) {
      e.stopPropagation();
      if(this.itemWinUI.elem.contains(e.target)
      || this.fightOptUI.elem.closest('label').contains(e.target)) return;
    }
    gsap.to(`#${this.itemWinUI.elemId}`, 
    {
      display: 'flex',
      scale: 0
    })
    this.fightOptUI.elem.checked = false;
    window.removeEventListener('click', this.closeItemWindowFunc);
    this.fightOptUI.elem.addEventListener('click', this.openItemWindowFunc);
    this.itemCtr.resetChecked();
  }
  handleItemSetBtnClick() {
    const CHECKED_LIST = this.itemCtr.getCheckedItemName();
    this.closeItemWindow();
    EVENT_BUS.publish(EVENT.setItem, {itemList: CHECKED_LIST});
  }
  run() {
    EVENT_BUS.publish(EVENT.run, {});
  }
  disableRun() {
    this.runOptUI.elem.disabled = true;
  }
  reset() {
    this.fightOptUI.elem.checked = false;
    this.runOptUI.elem.checked = false;
    this.runOptUI.elem.disabled = false;
  }
  battleStart() {
    this.ctrUI.elem.style.display = 'flex';
    if(!gsap) throw new Error('Install GSAP');
    gsap.to(this.bottomCtrUI.elem,
      {
        bottom: `${this.styleSpace}px`,
        duration: this.transTime / 1000
      }
    )
  }
  battleEnd() {
    if(!gsap) throw new Error('Install GSAP');
    gsap.to(this.bottomCtrUI.elem,
      {
        bottom: `-${this.bottomCtrUI.elem.clientHeight}px`,
        duration: this.transTime / 1000
      }
    )
    setTimeout(()=> {
      this.ctrUI.elem.style.display = 'none';
      this.reset();
    }, this.transTime)
  }
}
// 全体
class UIManager {
  constructor({
    UIDatabase = UI_MGR_INTERFACE,
    gameDatabase = null,
    transTime = 0,
    styleSpace = 0
  }) {
    this.gameCtrUI = new UI({elemId: UIDatabase.game.ctrId});
    this.titleMgr = new TitleUIManager({...UIDatabase.title, playerDatabase: gameDatabase.player, transTime: transTime});
    this.mapMgr = new MapUIManager({...UIDatabase.map, transTime: transTime});
    this.battleMgr = new BattleUIManager({...UIDatabase.battle, itemsData: gameDatabase.item, transTime: transTime, styleSpace: styleSpace});
    this.overlap = new Overlap({gameCtrUI: this.gameCtrUI, transTime: transTime});
    this.gameDatabase = gameDatabase;
    this.transTime = transTime;
    this.styleSpace = styleSpace;
    this.init();
  }

  init() {
    // コンテナ
    EVENT_BUS.subscribe(EVENT.mapStart, this.mapStart.bind(this));
    EVENT_BUS.subscribe(EVENT.mapEnd, this.mapEnd.bind(this));
    EVENT_BUS.subscribe(EVENT.battleStart, this.battleStart.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.battleEnd.bind(this));

    // オーバーラップメッセージ
    EVENT_BUS.subscribe(EVENT.getItem, this.getItem.bind(this));
    EVENT_BUS.subscribe(EVENT.recoverHp, this.recoverHp.bind(this));
    EVENT_BUS.subscribe(EVENT.loseHp, this.loseHp.bind(this));
    EVENT_BUS.subscribe(EVENT.levelUp, this.levelUp.bind(this));
  }

  mapStart() {
    this.mapMgr.mapStart();
  }
  mapEnd() {
    this.overlap.circle();
    this.mapMgr.mapEnd();
  }
  battleStart() {
    this.battleMgr.battleStart();
  }
  battleEnd() {
    this.overlap.circle();
    this.battleMgr.battleEnd();
  }
  getItem({itemKey}) {
    if(!itemKey) {
      console.log('Error at getItem Event: itemKey is not found');
      return;
    }
    const MSG = `${this.gameDatabase.item[itemKey].name}をゲットした`;
    this.overlap.showMsg(MSG);
  }
  recoverHp({amount, reason}) {
    if(!amount || !reason) {
      console.log('Error at recoverHp Event: amount or reason is not found');
      return;
    }
    const MSG = `${reason}HPを${amount}回復した`;
    this.overlap.showMsg(MSG);
  }
  loseHp({amount, reason}) {
    if(!amount || !reason) {
      console.log('Error at loseHp Event: amount or reason is not found');
      return;
    }
    const MSG = `${reason}HPを${amount}失った`;
    this.overlap.showMsg(MSG);
  }
  levelUp({lv}) {
    if(!lv) {
      console.log('Error at levelUp Event: lv is not found');
      return;
    }
    const MSG = `レベル${lv}になった`;
    this.overlap.showMsg(MSG);
  }
}

// アニメーションマネージャー
class GameManager {
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, transTime, pathToImg, keysId = KEYS_INTERFACE}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.gameDatabase = gameDatabase;
    this.transTime = transTime;
    this.pathToImg = pathToImg;
    this.keys = new Keys({...keysId});
    this.player;
    this.titleAnimation = new TittleAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, offSet: this.offSet, gameDatabase: this.gameDatabase, keys: this.keys, pathToImg: this.pathToImg, transTime: this.transTime});
    this.battleAnimation = new BattleAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, gameDatabase: this.gameDatabase, keys: this.keys, pathToImg: this.pathToImg, transTime: this.transTime});
    this.mapAnimation;

    EVENT_BUS.subscribe(EVENT.playerSelect, this.handlePlayerSelect.bind(this));

    EVENT_BUS.subscribe(EVENT.getItem, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.recoverHp, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.loseHp, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.drinkWater, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.takeNap, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.handleEncounter.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.handleEndBattle.bind(this));
  }
  handlePlayerSelect({playerData}) {
    const PLAYER_SPRITES = {};
    for(let key of Object.keys(playerData.image)) {
      const IMAGE = new Image();
      IMAGE.src = this.pathToImg + playerData.image[key];
      PLAYER_SPRITES[key] = IMAGE;
    } 
    this.player = new Player({canvas:this.canvas, canvasContent: this.c, position: {x:0,y:0}, image:PLAYER_SPRITES.down , data: playerData, pathToImg: this.pathToImg, sprite:PLAYER_SPRITES});
    this.mapAnimation = new MapAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, offSet: this.offSet, gameDatabase: this.gameDatabase, player: this.player, keyEvent: this.keys, keys: this.keys, pathToImg: this.pathToImg, transTime: this.transTime});
    this.endTitleAnimation();
    this.startMapAnimation();
  }
  startTitleAnimation() {
    this.titleAnimation.animate();
  }
  endTitleAnimation() {
    this.titleAnimation.stopCurrAnimation();
  }
  startMapAnimation() {
    this.mapAnimation.animate();
    EVENT_BUS.publish(EVENT.mapStart, {});
    if(this.player.levelUp()) {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.levelUp, {lv: this.player.data.lv});
      }, this.transTime)
    }
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
    setTimeout(this.startBattleAnimation.bind(this), this.transTime)
  }
  handleEndBattle({playerData}) {
    if(!this.player.updateData(playerData)) {
      console.log('error at handleEndBattle in GameManager');
      return;
    };
    this.stopBattleAnimation();
    setTimeout(this.startMapAnimation.bind(this), this.transTime)
  }
  showFullMsg() {
    this.mapAnimation.stopCurrAnimation();
    setTimeout(this.startMapAnimation.bind(this), this.transTime);
  }
}

// 各アニメーション
class Animation {
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keys, pathToImg, transTime}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.gameDatabase = gameDatabase;
    this.keys = keys;
    this.pathToImg = pathToImg;
    this.transTime = transTime;
    
    this.animationId;
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
    this.animationId = window.requestAnimationFrame(this._animate.bind(this));
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
    window.cancelAnimationFrame(this.animationId);
  }
}
class TittleAnimation extends Animation {
  static BG_SRC = './img/map/map.png';
  static BG_FRAME = 2;
  static BG_MOVING = true;
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime}) {
    super({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime});
    this.playerSelectPage = false;
    this.drawWidthDiff;
    this.drawHeightDiff;
    const IMG_BG = new Image();
    this.bg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: 0,
        y: 0
      },
      image: IMG_BG,
      frames: {max: TittleAnimation.BG_FRAME},
      moving: TittleAnimation.BG_MOVING,
    });
    IMG_BG.src = TittleAnimation.BG_SRC;
    this.positionXDiff = this.offSet.x - this.bg.position.x;
    this.positionYDiff = this.offSet.y - this.bg.position.y;
    const PLAYER_IMG = new Image();
    this.player = new Player({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x:0,
        y:0,
      },
      image: PLAYER_IMG,
      moving: true,
      movementDelay: 10,
      data: {...PLAYER_DATA_TYPE},
      pathToImg: this.pathToImg,
    })
    PLAYER_IMG.src = this.pathToImg + this.gameDatabase.player.male.image.down;

    EVENT_BUS.subscribe(EVENT.newGameStart, ()=>{
      this.playerSelectPage = true
    })
    EVENT_BUS.subscribe(EVENT.playerSetCharacter, this.handleSetCharacter.bind(this));
    EVENT_BUS.subscribe(EVENT.playerSetName, this.setName.bind(this));
    this.init();
  }
  init() {
    this.bg.updateDrawSize({width: this.canvas.width, height: this.canvas.height});
    this.bg.updatePosition({x: 0, y: 0});
  }
  handleSetCharacter({key}) {
    const NEW_PLAYER_DATA = {...this.gameDatabase.player[key]};
    if(this.player.data.image.down === NEW_PLAYER_DATA.image.down) return;
    this.player.updateData(NEW_PLAYER_DATA);
  }
  setName({name}) {
    if(!this.player.editData({key: 'name', newValue: name})) {
      throw new Error('Error at editData in Character class');
    }
    EVENT_BUS.publish(EVENT.playerSelect, {playerData: this.player.data})
  }
  handlePlayerSelect() {
    this.stopCurrAnimation();
  }
  _update() {
    while(!this.drawWidthDiff || !this.drawHeightDiff) {
      this.drawWidthDiff = this.bg.width  - this.canvas.width;
      this.drawHeightDiff = this.bg.height - this.canvas.height;
    }
    const FRAME = Math.round(this.transTime / this.frameInterval * 10) / 10;

    let drawWidth = this.bg.drawWidth;
    let drawHeight = this.bg.drawHeight;
    let positionX = this.bg.position.x;
    let positionY = this.bg.position.y;

    if(this.playerSelectPage) {
      if(drawWidth !== this.bg.width) {
        drawWidth = Math.round(drawWidth +  Math.round(this.drawWidthDiff / FRAME * 10) / 10);
        if(this.bg.width < drawWidth) drawWidth = this.bg.width;
        drawHeight = Math.round( this.bg.height * drawWidth / this.bg.width * 10) / 10;
        if(this.bg.height < drawHeight) drawHeight = this.bg.height;
        this.bg.updateDrawSize({width: drawWidth, height: drawHeight});
      }
      if(positionX !== this.offSet.x) {
        positionX = Math.round( (drawWidth - this.canvas.width) * this.offSet.x  / (this.bg.width - this.canvas.width) * 10) / 10;
        if(positionX < this.offSet.x) positionX = this.offSet.x;
        positionY = Math.round( (drawHeight - this.canvas.height) * this.offSet.y  / (this.bg.height - this.canvas.height) * 10) / 10;
        if(positionY < this.offSet.y) positionY = this.offSet.y;
        this.bg.updatePosition({x: positionX, y: positionY});
      }
    }
  }
  _render() {
    this.bg.draw();
    if(!this.playerSelectPage || this.bg.drawWidth !== this.bg.width || this.bg.position.x !== this.offSet.x) return;
    this.player.draw();
  } 
  
}
class MapAnimation extends Animation {
  static BG_SRC = './img/map/map.png';
  static BG_FRAME = 2;
  static BG_MOVING = true;
  static FG_SRC = './img/map/map--foreground.png';
  static MAP_EVENT_INTERVAL = 3000;
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime, player}) {
    super({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime});
    this.player = player;
    this.enemyList = [];
    this.itemList = [];
    this.action = {
      lastTime: 0,
      interval: MapAnimation.MAP_EVENT_INTERVAL
    }
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

    EVENT_BUS.subscribe(EVENT.playerSelect, this.handlePlayerSelect.bind(this));
    EVENT_BUS.subscribe(EVENT.levelUp, this.handleLevelUp.bind(this));
    EVENT_BUS.subscribe(EVENT.mapStart, this.handleMapStart.bind(this));
  }
  init() {
    // reset
    this.enemyList = [];
    this.itemList = [];
    this.action.lastTime = 0;
    this.item.lastTime = 0;
    this.water.lastTime = 0;
    this.nap.lastTime = 0;
  }
  handlePlayerSelect(playerData) {
    this._makeEnemyList(playerData.lv);
    this._makeItemList(playerData.lv);
  } 
  handleMapStart() {
    super.animate();
  }
  handleLevelUp(lv) {
    this._makeEnemyList(lv);
    this._makeItemList(lv);
  }
  _makeEnemyList(lv) {
      const ENEMY_DATABASE = this.gameDatabase.enemy;
      for(let key in ENEMY_DATABASE) {
        if(!this.enemyList) {
          // ゲームスタート時
          if(ENEMY_DATABASE[key].lv <= lv) {
            this.enemyList.push(key);
          }
        }else {
          if(ENEMY_DATABASE[key].lv === lv) {
            this.enemyList.push(key);
          }
        }
      }
  }
  _makeItemList(lv) {
      const ITEM_DATABASE = this.gameDatabase.item;
      for(let key in ITEM_DATABASE) {
        if(ITEM_DATABASE[key].lv === lv) {
          this.itemList.push(key);
        }
      }
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
    else if(this.keys.lastKey) {
      switch(this.keys.lastKey) {
        case Keys.KEYS.down.name:
          this.player.changeStateTo(CHARACTER_STATE.down);
          break;
        case Keys.KEYS.up.name:
          this.player.changeStateTo(CHARACTER_STATE.up);
          break;
        case Keys.KEYS.left.name:
          this.player.changeStateTo(CHARACTER_STATE.left);
          break;
        case Keys.KEYS.right.name:
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

          const ITEM_KEY = choiceRandom(this.itemList);
          if(this.player.addItem(ITEM_KEY)) {
            this.item.lastTime = this.currTime;
            this.action.lastTime = this.currTime;
            this.item.lastIndex = i;
            EVENT_BUS.publish(EVENT.getItem, { itemKey: ITEM_KEY });
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
              this.action.lastTime = this.currTime;
              this.water.lastIndex = i;
              EVENT_BUS.publish(EVENT.recoverHp, { amount: RESULT.amount, reason: '水を飲んで' });
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
              console.log(RESULT.amount)
              EVENT_BUS.publish(EVENT.recoverHp, { amount: RESULT.amount, reason: 'お昼寝をして' });
              return;
            };
          }
        }
      }
    }

    if(stepped) {
      EVENT_BUS.publish(EVENT.step, {});
      if(this.player.levelUp()) {
        setTimeout(()=>{
          EVENT_BUS.publish(EVENT.levelUp, {lv: this.player.data.lv});
        }, this.transTime)
        return;
      }
      if(onPath) return;
      if(this.action.lastTime !== 0 && (this.currTime - this.item.lastTime) < this.item.interval) return;
      const RATIO = onForest? this.player.data.rateEncounter*2: this.player.data.rateEncounter;
      if(trueWithRatio(RATIO)) {
        console.log('battle');
        this.player.stop();
        this.keys.lastKey = undefined;
        this.action.lastTime = new Date().getTime();
        const ENEMY_KEY = choiceRandom(this.enemyList);
        EVENT_BUS.publish(EVENT.encounter, {playerData: this.playerData, enemyKey: ENEMY_KEY});
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
  static ENEMY_IMG_SRC = 'skeletonFront.png';
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime}) {
    super({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime});
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
    const IMG_PLAYER = new Image();
    this.player = new CharacterBattle({
      canvas: this.canvas,
      canvasContent: this.c,
      image: IMG_PLAYER,
      data: {...PLAYER_DATA_TYPE},
      pathToImg: this.pathToImg,
      bottom: Math.round(this.canvas.height * 0.3 * 10) / 10
    });
    IMG_PLAYER.src = this.pathToImg + BattleAnimation.PLAYER_IMG_SRC;
    const IMG_ENEMY = new Image();
    this.enemy = new CharacterBattle({
      canvas: this.canvas,
      canvasContent: this.c,
      image: IMG_ENEMY,
      data: {...ENEMY_DATA_TYPE},
      isPlayer: false,
      pathToImg: this.pathToImg,
    });
    IMG_ENEMY.src = this.pathToImg + BattleAnimation.ENEMY_IMG_SRC;

    EVENT_BUS.subscribe(EVENT.encounter, this.handleEncounter.bind(this));
    EVENT_BUS.subscribe(EVENT.run, this.run.bind(this));
    EVENT_BUS.subscribe(EVENT.setItem, this.setItem.bind(this))
    this.init();
  }
  init() {

  }
  handleEncounter({playerData, enemyData}) {
    if(!this.player.updateData(playerData)) throw new Error('Fail to Update Player Data at BattleAnimation.animate');
    if(!this.enemy.updateData(enemyData)) throw new Error('Fail to Update Enemy Data at BattleAnimation.animate');
  
    setTimeout(() => {
      super.animate();
    })
  }
  _update() {
    // console.log('update')
  }
  _render() {
    this.bg.draw();
    this.enemy.draw();
    this.player.draw();
  }
  dotsDialog() {
    EVENT_BUS.publish(EVENT.battleDialog, {log: '・・・'});
  }
  run() {
    this.dotsDialog();
    if(this.player.run()) {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, {log: '逃げ切ることができた！'});
        this.player.updateRecords({won: false, enemy: this.enemy})
        setTimeout(() => {
          EVENT_BUS.publish(EVENT.battleEnd, {playerData: this.player.data, enemy: this.enemy, log: this.enemy.data.name, beat: false});
        }, this.transTime)
      }, this.transTime)
    }else {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, {log: '逃げ切れなかった...'});
        EVENT_BUS.publish(EVENT.failToRun, {});
      }, this.transTime)
    }
  }
  setItem({itemList}) {
    this.dotsDialog();
    EVENT_BUS.publish(EVENT.battleDialog, {log: `${itemList.map(item=>this.gameDatabase.item[item].name).join('、')}を混ぜた`});
    if(containsSame({list1: itemList, list2: this.enemy.data.cocktail.ingredient})) {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, {log: `${this.enemy.data.name}>こっこれは${this.enemy.data.cocktail.name}!美味しそう`});
        this.enemy.loseHp();
        this.player.updateRecords({won: true, enemy: this.enemy})
        setTimeout(()=> {
          EVENT_BUS.publish(EVENT.battleEnd, {playerData: this.player.data, enemy: this.enemy, log: this.enemy.data.name, beat: true});
        }, this.transTime)
      }, this.transTime)
    }else {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, 
          {log: `${this.enemy.data.name}>こんなマズイもん飲めない！<br>攻撃を受けHPが1減った`});
        if(this.player.loseHp().hp === 0) {
          // game over
          console.log('game over');
        }
      }, this.transTime)
    }

  }
}

export {UIManager, MapUIManager, TitleUIManager, BattleUIManager, Log, AverageEncounter, UICount,Boundary, Sprite, Character, Player, CharacterBattle, GameManager, MapAnimation, Keys, UI};