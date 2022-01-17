var request = require('request');
var options = {
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
request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});
