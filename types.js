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
  encounter: 0,
  enemy: [],
  lv: 1,
  lvUpCondition: {
      beat: 0,
      step: 0
  },
  rateEncounter: 0,
  rateRun: 0,
  hp: 0
}

const ENEMY_DATA_TYPE = {
  key: 0,
  name: '',
  image: {
      front: 'salaryFront.png'
  },
  cocktail: {
      name: '',
      ingredient: []
  },
  rank: 1
}

export { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE };