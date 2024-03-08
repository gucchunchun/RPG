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

export { EventBus };