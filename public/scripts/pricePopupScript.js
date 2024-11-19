function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

let checkMarkSvg = '<svg xmlns="http://www.w3.org/2000/svg" height="12" width="12" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z"/></svg>';

window.api.on('data', (event, data) => {
  if (data.includes('MOUSE_MOVE')) {
    document.getElementById('price-container').style.display = 'none';
  } else {
    let newItem = JSON.parse(data);
    if (newItem) {
      let slots = newItem.width * newItem.height;
      let highestTrader = newItem.traderPrices.sort((a, b) => b.price - a.price)[0];
      let marketPrice = (newItem.avg24hPrice / slots).toFixed(0);
      let traderPrice = (highestTrader.price / slots).toFixed(0);
      let marketPriceString = '₽' + numberWithCommas(marketPrice);
      let traderPriceString = '₽' + numberWithCommas(traderPrice);
      document.getElementById('price-box').innerHTML = `<div>${newItem.shortName}: <span id="price">${marketPriceString} ${slots && slots > 1 ? "x " + slots : ""}</span></div>`
      document.getElementById('price-box').innerHTML += `<div>${highestTrader.trader.name}: <span id="price">${traderPriceString} ${slots && slots > 1 ? "x " + slots : ""}</span></div>`
      if (newItem.quests) {
        newItem.quests.forEach((quest) => {
          document.getElementById('price-box').innerHTML += `<div class="quest">${checkMarkSvg} ${quest.amount} - ${quest.title}</div>`
        })
      }
      
      document.getElementById('price-container').style.opacity = '0';
      document.getElementById('price-container').style.display = 'block';
      let averagePrice = Math.floor(newItem.historicalPrices.reduce((total, price) => price.price + total, 0) / newItem.historicalPrices.length)
      // document.getElementById('chart').dataset.dailychartValues = newItem.historicalPrices.map(x => x.price).join(',');
      // console.log(averagePrice);
      // document.getElementById('chart').dataset.dailychartClose = averagePrice.toString();
      // document.getElementById('chart').dataset.dailychartLength = newItem.historicalPrices.length;
      // document.getElementById('chart').style.width = document.getElementById('price-box').offsetWidth + 'px';
      // document.getElementById('chart').innerHTML = '';
      // Dailychart.create('#chart', { lineWidth: 2 });
      document.getElementById('price-container').style.removeProperty("opacity");

    }
  }
})

window.api.on('hide', (event, data) => {
  document.getElementById('price-container').style.display = 'none';
})