var { ActionButton } = require("sdk/ui/button/action");
var data = require("sdk/self").data;
var Request = require("sdk/request").Request;
var setInterval = require("sdk/timers").setInterval;
var clearInterval = require("sdk/timers").clearInterval;
var prefs = require("sdk/simple-prefs").prefs;
var panel = require("sdk/panel").Panel({
  contentURL: data.url("panel.html"),
  contentScriptFile: [data.url("jquery-1.11.2.min.js"),data.url("jquery-ui-1.11.4/jquery-ui.min.js"),data.url("panel-script.js")],
  width: prefs.panel_width,
  height: prefs.panel_height
});
var button = ActionButton({
    id: "bitcoin",
    label: "localbitcoins.com",
    icon: "./localbitcoins.png",
    onClick: function (state){onButtonClick(state)},
    badge: 0,
    badgeColor: "#00AAAA"
  });

var onButtonClick = function(state){
    panel.show({position: button });
}
var updatePrice = function(buy_advs, sell_advs){
    panel.port.emit('updatePrice', {'buy':buy_advs, 'sell':sell_advs})
    if (prefs.operation == 'buy')
        var adv = buy_advs[0]
    else
        var adv = sell_advs[0]

    button.badge = Math.round(adv['price'])
    button.label = adv['price'].toPrecision(5)+" "+adv['name']+' '+adv['bank_name']
    button.icon = "./localbitcoins.png"
}
var sort_buy = function(a, b){
    if (a['price']>b['price'])
        return 1
    if (a['price']<b['price'])
        return -1
    return 0
}
var sort_sell = function(a, b){
    if (a['price']>b['price'])
        return -1
    if (a['price']<b['price'])
        return 1
    return 0
}
var get_best_advs = function(data, operation){
    var good_ads = []
    for (ad in data.json['data']['ad_list'])
    {
        adv = data.json['data']['ad_list'][ad]
        //console.log(adv)
        var currency = adv['data']['currency']
        var name = adv['data']['profile']['name']
        var trade_count = parseInt(adv['data']['profile']['trade_count'])
        var user_score = adv['data']['profile']['feedback_score']
        var price = parseFloat(adv['data']['temp_price'])
        var pub_url = adv['actions']['public_view']
        var min_amount = parseInt(adv['data']['min_amount']) 
        if (isNaN(min_amount))
            min_amount = 0;
        var max_amount = parseInt(adv['data']['max_amount_available'])
        var bank_name = adv['data']['bank_name']
        if(bank_name.length == 0)
            bank_name = adv['data']['online_provider']
        var last_online_time = Math.round((Date.now() - Date.parse(adv['data']['profile']['last_online']))/(1000*60))
        var last_online = last_online_time + '&nbsp;min'
        if (last_online_time >= 60)  var last_online = Math.round(last_online_time/60) + '&nbsp;hours';
        if (last_online_time >= 60*24)  var last_online = Math.round(last_online_time/(60*24)) + '&nbsp;days';
        var min_user_score = prefs.min_user_score
        if (trade_count == 0 && prefs.trade_count == 0)
            min_user_score = 0 // user score is N/A==0 when he has no trades 
        if (user_score >= min_user_score && trade_count >= prefs.trade_count)
            var in_black_list = false
            var black_list = prefs['black_list'].split(',')
            var tbank = bank_name.toLowerCase()
            //console.log('tbank: |'+tbank+'|')
            //console.log(black_list)
            for (var i in black_list){
                var word = black_list[i]
                var tword = String.trim(word).toLowerCase()
                var pos = tbank.indexOf(tword)
                if (pos >= 0){
                    in_black_list = true
                    //console.log('In black list: '+bank_name)
                }
            }
            //console.log('=========================================')
            //console.log('bank_name: '+adv['data']['bank_name'])
            //console.log('online_provider: '+adv['data']['online_provider'])
            //console.log('System: '+bank_name)
            if (!in_black_list)
                good_ads.push({'price': price, 'name': name, 'url': pub_url, 'bank_name': bank_name, 'min': min_amount, 'max':max_amount, 'currency':currency, 'last_online': last_online})
     
        //console.log('price: '+ price+' name:'+name)
        //console.log('price: '+ price+' name:'+name+' score: '+user_score+'/'+min_user_score+' trade_count: '+trade_count+'/'+prefs.trade_count)
    }
    var best_ads = []
    var count = 0
    if (operation == 'buy'){
        var max_count = prefs.buy_positions_count
        good_ads = good_ads.sort(sort_buy)
    }else{
        var max_count = prefs.sell_positions_count
        good_ads = good_ads.sort(sort_sell)
    }
    for (var i in good_ads){
        if (i >= max_count)
            break;
        best_ads.push(good_ads[i])
    }

    return best_ads
} 
var update = function () {
    button.icon = "./loading.gif"
    console.log("Do update");
    console.log(prefs.currenciesncy);
    try {
    (new Request({
        url: "https://localbitcoins.com/buy-bitcoins-online/"+prefs.currency+"/.json",
        onComplete: function (data) {
            var best_buy_ad = get_best_advs(data, 'buy')
            try {
            (new Request({
                url: "https://localbitcoins.com/sell-bitcoins-online/"+prefs.currency+"/.json",
                onComplete: function (data) {
                    var best_sell_ad = get_best_advs(data, 'sell')
                    updatePrice(best_buy_ad, best_sell_ad);
                }
            })).get();
            } catch(err){}
        }
    })).get();
    } catch(err){}
};

var allcurrs = []
var onChangeCurrencies = function(){
    allcurrs = prefs.currencies.replace(new RegExp('[^A-Z,]','g'),'').split(',');
    if (allcurrs.indexOf(prefs.currency) == -1)
        prefs.currency = allcurrs[0];
    panel.port.emit('changeCurrencies', {'cur_currency':prefs.currency, 'allcurrs': allcurrs})
    update();
}
onChangeCurrencies()
require("sdk/simple-prefs").on("currencies", onChangeCurrencies);
require("sdk/simple-prefs").on("operation", update);
var interval_id = setInterval(update, prefs.update_interval * 1000 * 60);
var onPrefChange = function() {
    clearInterval(interval_id);
    interval_id = setInterval(update, prefs.update_interval * 1000 * 60);
}
require("sdk/simple-prefs").on("update_interval", onPrefChange);

var onPanelSizeChange = function() {panel.width = prefs.panel_width; panel.height = prefs.panel_height;}
require("sdk/simple-prefs").on("panel_width", onPanelSizeChange);
require("sdk/simple-prefs").on("panel_height", onPanelSizeChange);

panel.port.on('changeCurrency', function(currency) {
  prefs.currency = currency;
  update();
  console.log('get cur:' +currency)
});

//var onPanelHeightChange = function(height) {panel.height = height;}

