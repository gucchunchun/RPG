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
  skill: {
      costStep: 0,
      detail: [],
      rateSuccess: 0,
      dialog: ''
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
  rank: 0
}

const EVENT = {
  // game start
  playerSelect: 'playerSelect',
  // map
  mapStart: 'mapStart',
  mapEnd: 'mapEnd',
  down: 'down',
  up: 'up',
  left: 'left',
  right: 'right',
  step: 'step',
  encounter: 'encounter',
  beat: 'beat',
  levelUp: 'levelUp',
  getItem: 'itemGet',
  drinkWater: 'drinkWater',
  takeNap: 'takeNap',
  // 
  loseHp: 'loseHp',
  recoverHp: 'recoverHp',
  // battle
  battleStart: 'battleStart',
  battleEnd: 'battleEnd',
  battleDialog: 'battleDialog',
  battleReady: 'battleReady',
  run: 'run',
  failToRun: 'failToRun',
}

export { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT };