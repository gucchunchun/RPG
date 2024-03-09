const CHARACTER_STATE = {
  down: 'down',
  up: 'up',
  left: 'left',
  right: 'right',
}

const PLAYER_DATA_TYPE = {
  key: 0,
  name: 0,
  image: {
      down: '',
      up: '',
      right: '',
      left: ''
  },
  item: [],
  step: 0,
  beat: 0,
  enemy: [],
  lv: 1,
  lvUpCondition: {
      beat: 0,
      step: 0
  },
  rateEncounter: 0,
  rateRun: 0,
  hp: 0,
  maxHp: 10
}

const ENEMY_DATA_TYPE = {
  key: 0,
  name: '',
  image: {
      down: ''
  },
  cocktail: {
      name: '',
      ingredient: []
  },
  hp: 1,
  lv: 0
}

const UI_MGR_INTERFACE = {
  game: {
    ctrId: '',
  },
  title: {
    ctrId: '',
    titlePageCtrId: '', 
    titlePageBtnCtrId: '',
    startNewGameBtnId: '',
    playerSelectCtrId: '', 
    playerSexOptCtrId: '', 
    playerNameId: '',
    nameErrMsgId: '',
    playerSetBtnId: '',
    prevData: null, 
  },
  map: {
    ctrId: '',
    sideCtrId: '', 
    lvId: '', 
    hpId: '', 
    stepId: '', 
    beatId: '', 
    avgEncId: '', 
    encLogCtrId: ''
  },
  battle: {
    ctrId: '', 
    fightOptId: '', 
    runOptId: '', 
    dialogCtrId: '',
    itemWinId: '', 
    cocktailId: '', 
    itemCtrId: '', 
    itemSetBtnId: '', 
  }
}


const EVENT = {
  gameStart: 'gameStart',
  newGame: 'newGame',
  characterSelect: 'characterSelect',
  playerSelect: 'playerSelect',
  step: 'step',
  encounter: 'encounter',
  beat: 'beat',
  levelUp: 'levelUp',
  getItem: 'itemGet',
  recoverHp: 'recoverHp',
  setItem: 'setItem',
  attackFail: 'attackFail',
  attackSuccess: 'attackSuccess',
  run: 'run',
  runFail: 'runFail',
  runSuccess: 'runSuccess',
  gameOver: 'gameOver'
}
const KEYS_INTERFACE = {
  downKeyId: '', 
  upKeyId: '', 
  leftKeyId: '', 
  rightKeyId: ''
}

export {  KEYS_INTERFACE, UI_MGR_INTERFACE, CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT };