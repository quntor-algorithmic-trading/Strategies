var log = require('../core/log.js');

var config = require('../core/util').getConfig();

var Zone = {
    in_top: 1,
    in_bottom: 2,
    above: 3,
    below: 4
}
Object.freeze(Zone);

var Transition = {
    in_from_below: 1,
    in_from_above: 2,
    out_to_above: 3,
    out_to_below: 4,
    none: 5
}
Object.freeze(Transition);

var balance = 0;
var previous_zone = null;
var curret_zone = null;
var sltp = null;


var method = {
   add_sltp: function(position_volume, sl_price, tp_price) {
      sltp = {
          position_volume: position_volume,
          sl_price: sl_price,
          tp_price: tp_price
      }
      log.debug('add_sltp', sltp);
  },

  check_sltp: function() {
      if(sltp == null) {
          return;
      }
      let s = Math.sign(sltp.position_volume);
      let stoploss = false;
      let takeprofit = false;
      if(this.price * s < sltp.sl_price * s) {
          stoploss = true;
          log.debug('stoploss');
      }
      if((this.previous_price * s > sltp.tp_price * s) &&
              (this.price * s < this.previous_price * s)) {
          takeprofit = true;
          log.debug('takeprofit');
      }
      if(stoploss || takeprofit) {
          this.advice(s > 0? this.sell(): this.buy());
          sltp = null;
      }
  },

  high_level_update: function(candle) {
      result = this.talibIndicators.bbs.result;
      upper = result.outRealUpperBand;
      middle = result.outRealMiddleBand;
      lower = result.outRealLowerBand;
      gap = middle-lower;

      if ((this.transition == Transition.in_from_below) &&
           (balance == 0)) {
          this.buy();
          this.add_sltp(position_volume=1,
               sl_price=middle-4*gap,
               tp_price=upper);
      }
      if ((this.transition == Transition.in_from_above) &&
           (balance == 0)) {
          this.sell();
          this.add_sltp(position_volume=-1,
               sl_price=middle+4*gap,
               tp_price=lower);
      }
  },

  sell: function() {
      this.advice('short');
      balance -= 1;
  },
  buy: function() {
      this.advice('long');
      balance += 1;
  },

  get_zone: function() {
      result = this.talibIndicators.bbs.result;
      upper = result.outRealUpperBand;
      middle = result.outRealMiddleBand;
      lower = result.outRealLowerBand;
      if (this.price < lower) {
          return Zone.below;
      } else if ((lower <= this.price) && (this.price <= middle)) {
          return Zone.in_bottom;
      } else if ((middle < this.price) && (this.prive <= upper)) {
          return Zone.in_above;
      } else {
          return Zone.above;
      }
  },

  get_transition: function() {
      if ((curret_zone == Zone.in_top) ||
          (curret_zone == Zone.in_bottom)) {

          if (previous_zone == Zone.above) {
              return Transition.in_from_above;
          } else if (previous_zone == Zone.below) {
              return Transition.in_from_below;
          } else {
              return Transition.none;
          }
      }

      if ((previous_zone == Zone.in_top) ||
          (previous_zone == Zone.in_bottom)) {


      if (curret_zone == Zone.above) {
                  return Transition.out_to_above;
              } else if (curret_zone == Zone.below) {
                  return Transition.out_to_below;
              } else {
                  return Transition.none;
              }
          }
          return Transition.none;
    }

};

method.init = function() {
    default_settings = {
        time_window: 20,
        dev_up: 2,
        dev_dn: 2
    }
    this.settings = Object.assign({}, default_settings, this.settings);
    var customBBandsSettings = {
        optInTimePeriod: this.settings.time_window,
        optInNbDevUp: this.settings.dev_up,
        optInNbDevDn: this.settings.dev_dn,
        optInMAType: 0
    }
    this.addTalibIndicator('bbs', 'bbands', customBBandsSettings);
};

method.update = function(candle) {
    this.price = candle.close;
    curret_zone = this.get_zone();
    this.transition = this.get_transition();

    this.check_sltp();
    this.high_level_update(candle);

    previous_zone = this.get_zone();
    this.previous_price = candle.close;
};

method.log = function(candle) {};

method.check = function() {};

module.exports = method;
