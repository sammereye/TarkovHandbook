// #region PACKAGES
const version = 101;
const { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray, shell, dialog } = require('electron');
const fs = require('fs');
const MiniSearch = require('minisearch');
const path = require('path');
const cheerio = require('cheerio');
const request = require('request');
const extract = require('extract-zip');
const { spawn } = require('child_process');
app.disableHardwareAcceleration();
// #endregion

// #region DATABASES
// PRODUCTION
let confFileName = path.join(path.dirname(__dirname), 'app','public/db/config.json');
// DEVELOPMENT
// let confFileName = path.join(path.dirname(__dirname), 'TarkovHandbook','public/db/config.json');
let confFile = fs.readFileSync(confFileName);
let conf = JSON.parse(confFile);
let toggle = conf.toggle;

// PRODUCTION
let progressFileName = path.join(path.dirname(__dirname), 'app','public/db/progress.json');
// DEVELOPMENT
// let progressFileName = path.join(path.dirname(__dirname), 'TarkovHandbook','public/db/progress.json');
let progressFile = fs.readFileSync(progressFileName);
let progress = JSON.parse(progressFile);
let tray = null;
// #endregion

// #region DATA INITIALIZATION
let items = '';
let itemsDictionary = {};
let db = '';
let questItems = {};
let traders = ['Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaegar', 'Fence']
let questPathList = []

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
let questPath = {};

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

// HIDEOUT //
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

// CRAFTS //
let crafts = '';
let craftItems = [];

let craftOptions = {
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
    'referer': 'https://tarkov-tools.com/hideout-profit/',
    'accept-language': 'en-US,en;q=0.9'
  },
  body: JSON.stringify({
    "query": "{\n        crafts {\n          rewardItems {\n            item {\n              id\n              basePrice\n              name\n              normalizedName\n              iconLink\n              imageLink\n              wikiLink\n              avg24hPrice\n              lastLowPrice\n              traderPrices {\n                  price\n                  trader {\n                      name\n                  }\n              }\n              buyFor {\n                source\n                price\n                currency\n              }\n              sellFor {\n                source\n                price\n                currency\n              }\n            }\n            count\n          }\n          requiredItems {\n            item {\n              id\n              basePrice\n              name\n              normalizedName\n              iconLink\n              imageLink\n              wikiLink\n              avg24hPrice\n              lastLowPrice\n              traderPrices {\n                price\n                trader {\n                    name\n                }\n              }\n              buyFor {\n                source\n                price\n                currency\n              }\n              sellFor {\n                source\n                price\n                currency\n              }\n            }\n            count\n          }\n          source\n          duration\n        }\n    }"
  })

};

function getCraftsPromise() {
  return new Promise((resolve, reject) => {
    request(craftOptions, function (error, response) {
      if (error) {
        reject(error);
      } else {
        resolve(response.body)
      }
    });
  })
}

async function makeSynchronousRequestForCrafts(request) {
	try {
		let http_promise = getCraftsPromise();
		let response_body = await http_promise;

    crafts = JSON.parse(response_body)
	}
	catch(error) {
		console.log(error);
	}
}

updateData()
setInterval(updateData, 1000 * 60 * 30)

async function updateData() { 
  items = '', itemsDictionary = {}, db = '', questItems = {}, quests = '', questDB = '', hideout = '', hideoutItems = {}, crafts = '', craftItems = [];
	await makeSynchronousRequestForQuests();
  await makeSynchronousRequestForItems();
  await makeSynchronousRequestForHideout();
  await makeSynchronousRequestForCrafts();

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

  for (let i in quests) {
    let questArr = quests[i].require.quests
    questPath[quests[i].id] = [].concat.apply([], questArr);
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

        if (!(progress.quests.includes(quests[i].id))) {
          if (!(item in questItems)) {
            questItems[item] = []
          }
  
          questItems[item].push({
            'quest_id': quests[i].id,
            'title': title,
            'amount': amount,
            'completed': false
          })
        }
      }
    }
  }

  let hideoutTranslations = {}
  for (let i in hideout.stations) {
    let name = hideout.stations[i].locales.en;
    switch (name) {
      case 'Intelligence center':
        name = 'Intelligence Center'
        break;
      case 'Nutrition Unit':
        name = 'Nutrition unit'
        break;
    }

    hideoutTranslations[name] = hideout.stations[i].id
  }

  for (let i in hideout.modules) {
    let stationId = hideout.modules[i].stationId;
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

        let completed = false;

        let currentStationLevel = parseInt(progress.hideout[stationId]);
        if (currentStationLevel >= level) {
          completed = true;
        }

        hideoutItems[itemName].push({
          'module': module,
          'stationId': stationId,
          'level': level,
          'quantity': quantity,
          'completed': completed
        })
      }
    }
  }

  crafts = crafts.data.crafts
  for (let i in crafts) {
    let rewardItems = crafts[i].rewardItems;
    let requiredItems = crafts[i].requiredItems;
    let stationId = hideoutTranslations[crafts[i].source.split(' level ')[0]]
    let craftLevel = parseInt(crafts[i].source.split(' level ')[1])
    let available = false;

    let currentStationLevel = parseInt(progress.hideout[stationId]);
    if (currentStationLevel >= craftLevel) {
      available = true;
    }

    let craftItem = {};
    craftItem.stationId = stationId;
    craftItem.level = craftLevel;
    craftItem.available = available;
    craftItem.output = {
      name: itemsDictionary[rewardItems[0].item.id].name,
      amount: rewardItems[0].count,
      price: itemsDictionary[rewardItems[0].item.id].avg24hPrice,
      duration: crafts[i].duration
    }

    craftItem.input = [];
    for (let j in requiredItems) {
      craftItem.input.push({
        name: itemsDictionary[requiredItems[j].item.id].name,
        amount: requiredItems[j].count,
        price: itemsDictionary[requiredItems[j].item.id].avg24hPrice
      })
    }

    craftItems.push(craftItem)
  }
};
// #endregion

// #region ELECTRON
app.on('ready', () => {
  createWindow();
  globalShortcut.register(toggle, showWindow)

  // PRODUCTION
  tray = new Tray(path.join(path.dirname(__dirname), 'app','public/images/icon.ico'))
  // DEVELOPMENT
  // tray = new Tray('public/images/icon.ico')

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

  if (conf.updated) {
    dialog.showMessageBox(app.window, { title: 'TarkovHandbook', message: `TarkovHandbook has been updated! Your new folder is named "${path.join(__dirname, '/../..').replaceAll('\\', '/').split('/').pop()}", you can delete the old folder named "${conf.pastFolder.split('/').pop()}"` })
  
    delete conf.updated;
    delete conf.pastFolder;
  
    fs.writeFileSync(confFileName, JSON.stringify(conf));
  }

  request('https://github.com/sammereye/TarkovHandbook/releases/tag/Latest', (e, r, body) => {
    let $ = cheerio.load(body);

    let githubVersion = parseInt($('.d-inline.mr-3').text().replaceAll('.', '').replaceAll('v', ''))

    if (githubVersion > version) {
      dialog.showMessageBox(app.window, {title: 'TarkovHandbook', message: `New update available, go to Settings to update to version ${githubVersion.toString().split('').join('.')}!`, type: 'info'})
    }
  })
})

app.on('browser-window-blur', () => {
  app.window.webContents.send('reset')
  app.window.minimize();
});

ipcMain.on('close', (e) => {
  app.window.minimize();
});

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

  // win.minimize();

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
// #endregion

// #region UPDATE
ipcMain.on('autoUpdate', (e) => {
  request('https://github.com/sammereye/TarkovHandbook/releases/tag/Latest', (e, r, body) => {
    let $ = cheerio.load(body);

    let githubVersion = parseInt($('.d-inline.mr-3').text().replaceAll('.', '').replaceAll('v', ''));

    if (githubVersion > version) {
      app.window.webContents.send('startingUpdate')
      request('https://github.com/sammereye/TarkovHandbook/releases/download/Latest/TarkovHandbook-latest.zip')
      .pipe(fs.createWriteStream('update.zip'))
      .on('close', async function () {
        // PRODUCTION
        let currentFolderName = path.join(__dirname, '/../..').split('\\').pop().split('-')[0];
        // DEVELOPMENT
        // let currentFolderName = __dirname.split('\\').pop().split('-')[0];

        // PRODUCTION
        await extract('update.zip', {dir: path.join(path.join(__dirname, '/../../..'), `${currentFolderName}-${$('.d-inline.mr-3').text().replaceAll('v', '')}`)});
        // DEVELOPMENT
        // await extract('update.zip', {dir: path.join(path.dirname(__dirname), `${currentFolderName}-${$('.d-inline.mr-3').text().replaceAll('v', '')}`)})
        fs.unlinkSync('update.zip');
        
        // Write current progess to new folder
        // PRODUCTION
        let newProgressFilePath = path.join(path.join(__dirname, '/../../..'), `${currentFolderName}-${$('.d-inline.mr-3').text().replaceAll('v', '')}`, 'resources', 'app', 'public', 'db', 'progress.json');
        // DEVELOPMENT
        // let newProgressFilePath = path.join(path.join(__dirname, '/../../..'), `${currentFolderName}-${$('.d-inline.mr-3').text().replaceAll('v', '')}`, 'TarkovHandbook-win32-ia32', 'resources', 'app', 'public', 'db', 'progress.json')
        fs.writeFileSync(newProgressFilePath, JSON.stringify(progress));
        
        conf.updated = true;

        // PRODUCTION
        conf.pastFolder = path.join(__dirname, '/../..').replaceAll('\\', '/');
        // DEVELOPMENT
        // conf.pastFolder = __dirname.replaceAll('\\', '/');

        // Write current config to new folder
        // PRODUCTION
        let newConfigFilePath = path.join(path.join(__dirname, '/../../..'), `${currentFolderName}-${$('.d-inline.mr-3').text().replaceAll('v', '')}`, 'resources', 'app', 'public', 'db', 'config.json');
        // DEVELOPMENT
        // let newConfigFilePath = path.join(path.dirname(__dirname), `${currentFolderName}-${$('.d-inline.mr-3').text().replaceAll('v', '')}`, 'TarkovHandbook-win32-ia32', 'resources', 'app', 'public', 'db', 'config.json')
        fs.writeFileSync(newConfigFilePath, JSON.stringify(conf));

        // Start new process
        // PRODUCTION
        let exeFilePath = path.join(path.join(__dirname, '/../../..'), `${currentFolderName}-${$('.d-inline.mr-3').text().replaceAll('v', '')}`, 'TarkovHandbook.exe');
        // DEVELOPMENT
        // let exeFilePath = path.join(path.dirname(__dirname), `${currentFolderName}-${$('.d-inline.mr-3').text().replaceAll('v', '')}`, 'TarkovHandbook-win32-ia32', 'TarkovHandbook.exe')
        spawn(exeFilePath, [], {detached: true});
        app.quit();
      });
    } else {
      dialog.showMessageBox(app.window, {title: 'TarkovHandbook', message: `You are already up-to-date!`, type: 'info'});
    }
  });
});

ipcMain.on('manualUpdate', (e) => {
  shell.openExternal("https://github.com/sammereye/TarkovHandbook/releases");
});
// #endregion

// #region HIDEOUT
ipcMain.on('getHideout', (e, data) => {
  if (data.id == 'crafts') {
    app.window.webContents.send('craftResults', craftItems) 
  } else if (data.id == 'stations')  {
    app.window.webContents.send('stationResults', [hideout, itemsDictionary, progress.hideout]) 
  }
});

ipcMain.on('changeStationLevel', (e, options) => {
  let stationId = options[0];
  let newLevel = options[1];

  progress.hideout[stationId] = newLevel;
  fs.writeFile(progressFileName, JSON.stringify(progress), function writeJSON(err) {
    if (err) return console.log(err);
  });

  for (let i in hideoutItems) {
    for (let j in hideoutItems[i]) {
      if (hideoutItems[i][j].stationId == stationId  && hideoutItems[i][j].level <= newLevel) {
        hideoutItems[i][j].completed = true
      } else if (hideoutItems[i][j].stationId == stationId  && hideoutItems[i][j].level > newLevel) {
        hideoutItems[i][j].completed = false
      }
    }
  }

  for (let i in craftItems) {
    if (craftItems[i].stationId == stationId  && craftItems[i].level <= newLevel) {
      craftItems[i].available = true
    } else if (craftItems[i].stationId == stationId  && craftItems[i].level > newLevel) {
      craftItems[i].available = false
    }
  }

  app.window.webContents.send('stationLevelResults', [itemsDictionary, newLevel, stationId])
});
// #endregion

// #region SETTINGS
ipcMain.on('getLevel', (e) => {
  app.window.webContents.send('levelResults', progress.level) 
});

ipcMain.on('updateLevel', (e, level) => {
  progress.level = level;
  fs.writeFile(progressFileName, JSON.stringify(progress), function writeJSON(err) {
    if (err) return console.log(err);
  });
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

ipcMain.on('getSettings', (e) => {
  app.window.webContents.send('settingsResults', conf) 
});

ipcMain.on('resetData', (e, id) => {
  switch(id)  {
    case 'quests':
      resetQuestItems();
      progress.quests = [];
      break;
    case 'level':
      progress.level = 1;
      break;
    case 'hideout':
      resetHideoutItems();
      progress.hideout = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0, "11": 0, "12": 0, "13": 0, "14": 0, "15": 1, "16": 0, "17": 0, "18": 0, "19": 0, "20": 0 }
      break;
    case 'all':
      resetQuestItems();
      progress.quests = [];
      progress.level = 1;
      resetHideoutItems();
      progress.hideout = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0, "11": 0, "12": 0, "13": 0, "14": 0, "15": 1, "16": 0, "17": 0, "18": 0, "19": 0, "20": 0 }
      break;
  }

  fs.writeFile(progressFileName, JSON.stringify(progress), function writeJSON(err) {
    if (err) return console.log(err);
    console.log('reset data')
  });
});

ipcMain.on('changeConfig', (e, data) => {
  conf[data.id] = data.value;
  fs.writeFile(confFileName, JSON.stringify(conf), function writeJSON(err) {
    if (err) return console.log(err);
    console.log('changed hotkey')
  });
});

function resetQuestItems() {
  for (let i in questItems) {
    for (let j in questItems[i]) {
      questItems[i][j].completed = false;
    }
  }
}

function resetHideoutItems() {
  for (let i in hideoutItems) {
    for (let j in hideoutItems[i]) {
      hideoutItems[i][j].completed = false
    }
  }

  for (let i in craftItems) {
    craftItems[i].available = false
  }
}
// #endregion

// #region ITEMS
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
// #endregion

// #region QUESTS
ipcMain.on('getQuests', (e, options) => {
  getQuests(quests, options)
});

ipcMain.on('forwardQuest', (e, options) => {
  let questId = options.id;
  let traderId = options.traderId;

  iterateThroughQuest(questId);
  questPathList.shift();
  
  for (let i in questPathList) {
    progress.quests.push(questPathList[i])

    for (let i in questItems) {
      for (let j in questItems[i]) {
        if (questPathList[i] == questItems[i][j].quest_id) {
          questItems[i][j].completed = true;
        }
      }
    }
  }

  fs.writeFile(progressFileName, JSON.stringify(progress), function writeJSON(err) {
    if (err) return console.log(err);
  });

  if ('traderId' in options) {
    getQuests(quests, {'trader': options.traderId})
  } else {
    app.window.webContents.send('updateIndividualQuest', {id: options.id, type: 'forwarded'}) 
  }

  questPathList = [];
});

ipcMain.on('questSearch', (e, val) => {
  let results = questDB.search(val)
  condensedResults = results.slice(0, 4)

  getQuests(condensedResults, {})
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
              images.push($(guide[i]).find('a')[j].attribs.href.replace('latest', 'latest/scale-to-width-down/700'))
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

ipcMain.on('toggleQuest', (e, options) => {
  let type = '';
  if (progress.quests.includes(options.id)) {
    progress.quests.splice(progress.quests.indexOf(options.id), 1)

    for (let i in questItems) {
      for (let j in questItems[i]) {
        if (options.id == questItems[i][j].quest_id) {
          questItems[i][j].completed = false;
          type = 'removed'
        }
      }
    }
  } else {
    progress.quests.push(options.id)

    for (let i in questItems) {
      for (let j in questItems[i]) {
        if (options.id == questItems[i][j].quest_id) {
          questItems[i][j].completed = true;
          type = 'completed'
        }
      }
    }
  }

  if ('traderId' in options) {
    getQuests(quests, {'trader': options.traderId})
  } else {
    app.window.webContents.send('updateIndividualQuest', {id: options.id, type: type}) 
  }

  fs.writeFile(progressFileName, JSON.stringify(progress), function writeJSON(err) {
    if (err) return console.log(err);
  });
});

function getQuests(quests, options) {
  let completedQuests = [];
  let uncompletedQuests = [];
  let unavailableQuests = [];
  
  for (let i in quests) {
    if (progress.level >= quests[i].require.level || conf.showAllQuests) {
      let meetsRequirements = true;

      for (let j in quests[i].require.quests) {
        if (!(progress.quests.includes(quests[i].require.quests[j]))) {
          meetsRequirements = false;
        }
      }

      let traderValid = true;
      if ('trader' in options) {
        if (quests[i].giver != options.trader) {
          traderValid = false
        }
      }

      if (meetsRequirements) {
        if (progress.quests.includes(quests[i].id)) {
          quests[i].completed = true;
          quests[i].unlocked = true;

          if (traderValid) {
            completedQuests.push(quests[i])
          }
          
        } else {
          quests[i].completed = false;
          quests[i].unlocked = true;

          if (traderValid) {
            uncompletedQuests.push(quests[i])
          }
        }
      } else {
        quests[i].completed = false;
        quests[i].unlocked = false;

        if (traderValid) {
          unavailableQuests.push(quests[i])
        }
      }
    }
  }
  
  sortQuests(completedQuests)
  sortQuests(uncompletedQuests)
  sortQuests(unavailableQuests)

  let filteredQuests = uncompletedQuests.concat(completedQuests).concat(unavailableQuests)

  app.window.webContents.send('questResults', [filteredQuests, itemsDictionary]) 
}

function iterateThroughQuest(id) {
  questPathList.push(id);

  if (id in questPath) {
    if (questPath[id].length > 0) {
      for (let i in questPath[id]) {
        iterateThroughQuest(questPath[id][i])
      }
    }
  }
}
// #endregion

// #region FUNCTIONS
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
// #endregion