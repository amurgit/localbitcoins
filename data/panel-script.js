var currency = ''
var getTr = function(adv){
    var tr = $('<tr class="buy_adv"><td class="name"></td> <td class="bank_name"> </td> <td class="price"></td> <td class="limits"></td></tr>')
    tr.find('.name').html('<a target="_blank" href="'+adv['url']+'">'+adv['name']+'</a> '+'<span class="last_online">('+adv['last_online']+')</span>')
    tr.find('.bank_name').text(adv['bank_name'])
    tr.find('.price').text(adv['price'])
    tr.find('.limits').text(adv['min']+' - '+adv['max']+' '+adv['currency'])
    currency = adv['currency'];
    return tr
}

self.port.on("updatePrice", function(prices) {
  var tittle_tr = $('#hidden_table tr').html()
  $('#buy_prices').html('<tr><th>Seller</th><th>Bank name</th><th>Price</th><th>Limits</th><tr>')
  $('#sell_prices').html('<tr><th>Buyer</th><th>Bank name</th><th>Price</th><th>Limits</th><tr>')
  for (var i in prices['buy']) {
    var adv = prices['buy'][i];
    var tr = getTr(adv)
    $( "#buy_prices" ).append(tr);
  };
  for (var i in prices['sell']) {
    var adv = prices['sell'][i];
    var tr = getTr(adv)
    $( "#sell_prices" ).append(tr);
  };
    $('#all_curs .active').removeClass('active')
    $('#'+currency).parent().addClass('active')
});

var currencies = ['USD','CNY','RUB']
var currency = 'USD'
self.port.on("changeCurrencies", function(data) {
    currencies = data['allcurrs']
    currency = data['cur_currency']
    $('#all_curs .active').removeClass('active')
    $('#'+currency).parent().addClass('active')
    $('#all_curs').html('')
    for (var i in currencies)
    	$('#all_curs').append('<div class="cur_wrapper"><a href="#" id="'+currencies[i]+'" class="currency">'+currencies[i]+'</a></div>')
    $( "a.currency" ).button().click(function( event ) {
        var cur = $(this).attr('id')
        event.preventDefault();
        self.port.emit("changeCurrency", cur);
    });
});



$(function() {
    $( "#tabs" ).tabs();
 });