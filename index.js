const CANVAS = document.getElementById('canvas');
const C = CANVAS.getContext('2d');

CANVAS.width = 1024;
CANVAS.height = 576;

C.fillStyle = '#FFFFFF';
C.fillRect(0, 0, canvas.width, canvas.height);

const IMAGE_MAP = new Image();
IMAGE_MAP.src = './img/map/map.png';
IMAGE_MAP.onload = () => {
  C.drawImage(IMAGE_MAP, -2300, -1300);
}