
const request = require('request');
const cheerio = require('cheerio');

let url = 'https://escapefromtarkov.fandom.com/wiki/Gunsmith_-_Part_1';

request({
    method: 'GET',
    url: url
}, (err, res, body) => {

  if (err) return console.error(err);

  let $ = cheerio.load(body);

  let guide = $('#Guide').parent().nextUntil('.va-navbox-border');

  let paragraph = '<div>';

  for (let i in guide) {
    let tagName = guide[i].tagName;
    if (tagName != undefined) {
      if (tagName == 'p') {
        paragraph += "<p>"
        paragraph += $(guide[i]).text()
        paragraph += "</p>"
      } else if (tagName == 'ul') {
        paragraph += "<ul>"
        paragraph += $(guide[i]).html().replaceAll('<a', '<div').replaceAll('</a>', '</div>').replaceAll('<li>', '<li><div class="list-container">').replaceAll('</li>', '</div></li>')
        paragraph += "</ul>"
      } else if (tagName == 'li') {
        paragraph += "<div>"
        let images = []
        // let imageLink = $(guide[i]).children().first().children().first().children().first().children().first().children().first().children().first().attr('href');
        for (let j in $(guide[i]).find('a')) {
          if ($(guide[i]).find('a')[j].name == 'a') {
            images.push($(guide[i]).find('a')[j].attribs.href.replace('latest', 'latest/scale-to-width-down/300'))
          }
        }

        for (let j in images) {
          paragraph += `<img src="${images[j]}" />\n`
        }

        paragraph += "</div>"
      } else if (tagName == 'div') {
        if ($(guide[i]).attr('style') == 'display:table' && url.includes('Gunsmith')) {
          let cells = $(guide[i]).find('tr');

          paragraph += '<table><thead><tr><th>Part Name</th><th>Sold by</th><th>Loyalty Level</th></tr></thead><tbody>'
          for (let j in cells) {
            let textContent = $(cells[j]).text();
            if (textContent.includes('Gunsmith')) { break; }

            let textCleaned = textContent.trim().replaceAll('\n', ',');
            if (textCleaned.includes('Icon')) { continue; }

            let row = textCleaned.split(',').filter(n => n);
            if (row.length == 0) { continue; }

            paragraph += '<tr>'

            // LL2 LL1 (Barter)
            // ['LL2', 'LL1', '(Barter)']
            for (let k in row) {
              if (k == 1) {
                row[k] = row[k].replace(/\s+/g, " ").replaceAll(' ', '<br>')
              }

              if (k == 2) {
                let levels = [];
                row[k] = row[k].replace(/\s+/g, " ");
                let levelsSplit = row[k].split(' ');
                
                let text = '';
                for (let l in levelsSplit) {
                  if (text == '') {
                    text = levelsSplit[l]
                  } else if (levelsSplit[l].includes('LL')) {
                    levels.push(text);
                    text = levelsSplit[l]
                  } else {
                    text += ` ${levelsSplit[l]}`
                  }
                }
                levels.push(text);
                row[k] = levels.join('<br>')
              }
              paragraph += `<td>${row[k]}</td>`
            }
            paragraph += '</tr>'
          }

          paragraph += '</tbody></table>'
        }
      }
    }
  }

  paragraph += '</div>';
  console.log(paragraph)
});

let basePrice = 10000;
let quantity = 1;
let offer = 15000;
let tax1 = 0.09;
let tax2 = 0.05;
let offerValue = basePrice * quanity

let fee = ((offerValue) * (tax1) * Math.pow(4, Math.log10(offerValue / offer)) * quantity * offer * Math.pow(4, 1.08) * quantity)