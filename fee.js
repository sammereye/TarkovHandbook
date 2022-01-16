let basePrice = 10000;
let quantity = 1;
let offer = 15000;
let tax1 = 0.09;
let tax2 = 0.05;
let offerValue = basePrice * quantity;

let fee = Math.round(((offerValue) * tax1 * Math.pow(4, Math.pow(Math.log10(offerValue / offer), (offer < offerValue ? 1.08 : 1))) + quantity * offer * Math.pow(4, Math.pow(Math.log10(offer / offerValue), (offerValue <= offer ? 1.08 : 1))) * tax2 * quantity));

console.log(fee)

// 15000 * 0.09 * 1.27 * 1 * 15000 * 4.46 * 1
