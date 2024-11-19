let prices = []

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

window.api.on('data', (event, data) => {
  if (!data.includes('MOUSE_MOVE')) {
    let priceListEle = document.getElementById("price-list");
    let newItem = JSON.parse(data);
    if (newItem) {
      let highestTrader = newItem.traderPrices.sort((a, b) => b.price - a.price)[0];
      if (highestTrader) {
        if (newItem.avg24hPrice === 0) {
          newItem.avg24hPrice = highestTrader.price;
        }
      }
      if (prices.filter(x => x.id === newItem.id).length === 0) {
        prices.push(newItem);
      }

      let items = prices.sort((a, b) => (b.avg24hPrice / (b.width * b.height)) - (a.avg24hPrice / (a.width * a.height)));
      priceListEle.innerHTML = ''
      let totalPrice = items.reduce((total, a) => a.avg24hPrice + total, 0);
      let totalEle = document.createElement("p");
      totalEle.className = 'price total'
      totalEle.innerHTML = `Total: ${'₽' + numberWithCommas(totalPrice)}`
      priceListEle.append(totalEle)
      items.forEach((item, i) => {
        let itemEle = document.createElement("p");
        let className = 'price';

        if (newItem.id === item.id) {
          className += ' recentlyAdded';
        }

        if (i === items.length - 1 && items.length > 1) {
          className += ' cheapestItem'
        }

        let slots = item.width * item.height;

        itemEle.className = className;
        let marketPrice = (item.avg24hPrice / slots).toFixed(0);
        itemEle.innerHTML = `<div>${item.shortName}: ${'₽' + numberWithCommas(marketPrice)} ${slots && slots > 1 ? "x " + slots : ""}</div>`
        itemEle.onclick = (eve) => {
          prices = prices.filter(x => x.id !== item.id);
          eve.currentTarget.remove();
          window.api.send('blur-price-window')
        }
        priceListEle.append(itemEle)
      })

      priceListEle.scrollLeft = priceListEle.scrollWidth;
    }
  }
})

window.api.on('wipe', (event, data) => {
  document.getElementById("price-list").innerHTML = '';
  prices = [];
})

window.api.on('remove-last', (event, data) => {
  let itemToBeRemoved = document.getElementById("price-list").lastChild;

  if (itemToBeRemoved ) {
    const itemName = itemToBeRemoved.textContent.split(':')[0];
    prices = prices.filter(x => x.shortName !== itemName);
    itemToBeRemoved.remove();
  }
})

// window.api.on('hide', (event, data) => {
//   document.getElementById('price-box').style.display = 'none';
// })