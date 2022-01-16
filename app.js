// require Electron
const { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray } = require('electron');
const fs = require('fs');
const MiniSearch = require('minisearch');
const path = require('path');
const request = require('request');
const cheerio = require('cheerio');

// PRODUCTION
// let confFileName = path.join(path.dirname(__dirname), 'app','public/db/config.json');
// DEVELOPMENT
let confFileName = path.join(path.dirname(__dirname), 'TarkovHandbook','public/db/config.json');
let confFile = fs.readFileSync(confFileName)
let conf = JSON.parse(confFile)
let toggle = conf.toggle;

app.disableHardwareAcceleration();

let items = '';
let itemsDictionary = {};
let db = '';
let questItems = {};
let traders = ['Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaegar', 'Fence']

let options = {
  'method': 'POST',
  'url': 'https://tarkov-tools.com/graphql',
  'headers': {
    'authority': 'tarkov-tools.com',
    'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"',
    'accept': 'application/json',
    'dnt': '1',
    'content-type': 'application/json',
    'sec-ch-ua-mobile': '?0',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'sec-ch-ua-platform': '"Windows"',
    'origin': 'https://tarkov-tools.com',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': 'https://tarkov-tools.com/item/golden-rooster',
    'accept-language': 'en-US,en;q=0.9'
  },
  body: JSON.stringify({
    "query": "{\n            itemsByType(type:any){\n                id\n                name\n                shortName\n                basePrice\n                normalizedName\n                types\n                width\n                height\n                avg24hPrice\n                wikiLink\n                changeLast48h\n                low24hPrice\n                high24hPrice\n                lastLowPrice\n                gridImageLink\n                iconLink\n                traderPrices {\n                    price\n                    trader {\n                        name\n                    }\n                }\n                sellFor {\n                    source\n                    price\n                    requirements {\n                        type\n                        value\n                    }\n                    currency\n                }\n                buyFor {\n                    source\n                    price\n                    currency\n                    requirements {\n                        type\n                        value\n                    }\n                }\n                containsItems {\n                    count\n                    item {\n                        id\n                    }\n                }\n            }\n        }"
  })
};

function getItemsPromise() {
  return new Promise((resolve, reject) => {
    request(options, function (error, response) {
      if (error) {
        reject(error);
      } else {
        let itemData = JSON.parse(response.body).data.itemsByType;
        resolve(itemData)
      }
    });
  })
}

async function makeSynchronousRequestForItems(request) {
	try {
		let http_promise = getItemsPromise();
		let response_body = await http_promise;

    items = response_body
	}
	catch(error) {
		console.log(error);
	}
}

let quests = '';
let questDB = '';

let questOptions = {
  url: 'https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/quests.json',
  json: true
};

function getQuestsPromise() {
  return new Promise((resolve, reject) => {
    request(questOptions, function (error, response) {
      if (error) {
        reject(error);
      } else {
        // let itemData = JSON.parse(response.body).data.itemsByType;
        // resolve(itemData)
        resolve(response.body)
      }
    });
  })
}

async function makeSynchronousRequestForQuests(request) {
	try {
		let http_promise = getQuestsPromise();
		let response_body = await http_promise;

    quests = response_body
	}
	catch(error) {
		console.log(error);
	}
}

let hideout = '';
let hideoutItems = {};

let hideoutOptions = {
  url: 'https://raw.githubusercontent.com/TarkovTracker/tarkovdata/master/hideout.json',
  json: true
};

function getHideoutPromise() {
  return new Promise((resolve, reject) => {
    request(hideoutOptions, function (error, response) {
      if (error) {
        reject(error);
      } else {
        resolve(response.body)
      }
    });
  })
}

async function makeSynchronousRequestForHideout(request) {
	try {
		let http_promise = getHideoutPromise();
		let response_body = await http_promise;

    hideout = response_body
	}
	catch(error) {
		console.log(error);
	}
}

(async function () {
	await makeSynchronousRequestForQuests();
  await makeSynchronousRequestForItems();
  await makeSynchronousRequestForHideout();

  db = new MiniSearch({
    fields: ['name', 'shortName'], // fields to index for full-text search
    storeFields: ['name', 'shortName', 'avg24hPrice', 'traderPrices', 'basePrice'], // fields to return with search results
    searchOptions: {
      fuzzy: 0.2, 
      prefix: true,
      boost: {
        'shortName': 1.5
      }
    }
  })

  db.addAll(items);

  for (let i in items) {
    itemsDictionary[items[i].id] = items[i]
  }

  questDB = new MiniSearch({
    fields: ['title'], // fields to index for full-text search
    storeFields: ['giver', 'title', 'locales', 'objectives', 'require', 'wiki'], // fields to return with search results
    searchOptions: {
      fuzzy: 0.2,
      prefix: true
    }
  })
  
  questDB.addAll(quests);

  for (let i in quests) {
    let objectives = quests[i].objectives;
    for (let j in objectives) {
      let objective = objectives[j];
      
      if (objective.type == 'find') {
        let title = quests[i].title;
        let item = objective.target;
        let amount = objective.number;

        if (!(item in questItems)) {
          questItems[item] = []
        }

        questItems[item].push({
          'title': title,
          'amount': amount
        })
      }
    }
  }

  for (let i in hideout.modules) {
    let requires = hideout.modules[i].require;
    for (let j in requires) {
      let item = requires[j];
      
      if (item.type == 'item') {
        let module = hideout.modules[i].module;
        let level = hideout.modules[i].level;
        let itemName = item.name
        let quantity = item.quantity;

        if (!(itemName in hideoutItems)) {
          hideoutItems[itemName] = []
        }

        hideoutItems[itemName].push({
          'module': module,
          'level': level,
          'quantity': quantity,
        })
      }
    }
  }
})();




let tray = null;

function createWindow () {
  // Create the browser window.
  let win = new BrowserWindow({
    frame: false,
    kiosk: true,
    fullscreen: true,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.minimize();

  app.window = win

  app.window.loadFile('public/index.html')
}

function showWindow () {
  if (app.window.isMinimized()) {
    app.window.webContents.send('setHotkey', toggle)
    app.window.restore();
  } else {
    app.window.minimize();
    app.window.webContents.send('reset')
  }
}

app.on('ready', () => {
    createWindow();
    globalShortcut.register(toggle, showWindow)
    // PRODUCTION
    // tray = new Tray(path.join(path.dirname(__dirname), 'app','public/images/icon.ico'))
    // DEVELOPMENT
    tray = new Tray('public/images/icon.ico')
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Show', click:  function() {
          app.window.restore();
        }
      },
      { 
        label: 'Quit', click:  function() {
          app.isQuiting = true;
          app.quit();
        }
      }
    ])
    tray.setToolTip('Tarkov Search')
    tray.setContextMenu(contextMenu)
})

ipcMain.on('close', (e) => {
  app.window.minimize();
});

ipcMain.on('getQuests', (e, options) => {
  let filteredQuests = []
  
  if ('trader' in options) {
    for (let i in quests) {
      if (quests[i].giver == options.trader) {
        filteredQuests.push(quests[i])
      }
    }
  }

  sortQuests(filteredQuests)

  app.window.webContents.send('questResults', [filteredQuests, itemsDictionary]) 
});

ipcMain.on('getHideout', (e) => {
  app.window.webContents.send('hideoutResults', [hideout, itemsDictionary]) 
});

ipcMain.on('getSettings', (e) => {
  app.window.webContents.send('settingsResults', conf) 
});

// ipcMain.on('settingHotkey', (e, state) => {
//   if (state) {
//     globalShortcut.unregister(shortcut);
//   } else {
//     globalShortcut.register(shortcut, showWindow);
//   }
// });

ipcMain.on('logger', (e, log) => {
  console.log(log)
});

ipcMain.on('changeHotkey', (e, data) => {
  switch (data[0]) {
    case 'toggle':
      globalShortcut.unregister(toggle)
      let shortcutTest = globalShortcut.register(data[1], showWindow);

      if (shortcutTest) {
        conf.toggle = data[1];
        fs.writeFile(confFileName, JSON.stringify(conf), function writeJSON(err) {
          if (err) return console.log(err);
          console.log('changed hotkey')
        });
        toggle = data[1];
      } else {
        console.log('failed to change hotkey to ' + key)
      }
      break;
  }
});

ipcMain.on('itemSearch', (e, val) => {
  let results = db.search(val)
  condensedResults = results.slice(0, 4);
  for (let i in condensedResults) {
    if (condensedResults[i].id in questItems) {
      condensedResults[i]['quests'] = questItems[condensedResults[i].id]
    }

    if (condensedResults[i].id in hideoutItems) {
      condensedResults[i]['hideout'] = hideoutItems[condensedResults[i].id]
    }
  }

  app.window.webContents.send('itemResults', condensedResults)  
});

ipcMain.on('questSearch', (e, val) => {
  let results = questDB.search(val)
  condensedResults = results.slice(0, 4)
  sortQuests(condensedResults)
  app.window.webContents.send('questResults', [condensedResults, itemsDictionary])  
});


ipcMain.on('getWiki', (e, url) => {
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
        } else if (tagName == 'h3') {
          paragraph += "<h3>"
          paragraph += $(guide[i]).text()
          paragraph += "</h3>"
        } else if (tagName == 'ul') {
          if (!$(guide[i]).html().includes('img')) {
            paragraph += "<ul>"
            paragraph += $(guide[i]).html().replaceAll('<a', '<div').replaceAll('</a>', '</div>').replaceAll('<li>', '<li><div class="list-container">').replaceAll('</li>', '</div></li>')
            paragraph += "</ul>"
          }
          
        } else if (tagName == 'li') {
          paragraph += "<div>"
          let images = []
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
              while (row.length > 3) {
                row[0] += `<br>${row[1]}`
                row.splice(1, 1)
              }
              for (let k in row) {
                if (k == 1) {
                  row[k] = row[k].replace(/\s+/g, " ").replaceAll(' ', '<br>')
                }

                // if (k == 2) {
                //   let levels = [];
                //   row[k] = row[k].replace(/\s+/g, " ");
                //   let levelsSplit = row[k].split(' ');
                  
                //   let text = '';
                //   for (let l in levelsSplit) {
                //     if (text == '') {
                //       text = levelsSplit[l]
                //     } else if (levelsSplit[l].includes('LL')) {
                //       levels.push(text);
                //       text = levelsSplit[l]
                //     } else {
                //       text += ` ${levelsSplit[l]}`
                //     }
                //   }
                //   levels.push(text);
                //   row[k] = levels.join('<br>')
                // }

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
    app.window.webContents.send('wikiResults', [url, paragraph])  
  });
});


const sortQuests = (arr = []) => {
  const assignValue = val => {
     if(val === null){
        return Infinity;
     }
     else{
        return val;
     };
  };
  const sorter = (a, b) => {
     return assignValue(a.require.level) - assignValue(b.require.level);
  };
  arr.sort(sorter);
}