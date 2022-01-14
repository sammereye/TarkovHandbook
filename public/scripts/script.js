let settingHotkey = {
  'toggle': false
};
let interactingWithApp = false;
let currentKey = '';
let activeTab = 'items';

$(document).ready(() => {
  const {
    ipcRenderer
  } = require('electron');
  $('.search-input').focus()

  function reset(ipc) {
      // if (settingHotkey) {
      //     settingHotkey = false;
      //     ipc.send('settingHotkey', false);
      //     $('.hotkey').text(currentKey);
      // }
      $('.search-results-container').hide();
      $('.search-input').focus()
      $('.search-input').val('');
      ipc.send('close')
  }

  $(document).on('keydown', function(event) {
      if (!(Object.values(settingHotkey).every((v) => v === false))) {
          var currentHotkey = []
          Object.keys(settingHotkey).forEach(function(x) { 
            settingHotkey[x] !== false ? currentHotkey.push(x) : ''
          });

          ipcRenderer.send('changeHotkey', [currentHotkey[0], event.key])
          
          $(`.hotkey[data-id="${currentHotkey[0]}"]`).text(event.key)
          Object.keys(settingHotkey).forEach(k => {
            settingHotkey[k] = false;
          })
      } else {
          if (event.key == "Escape" || event.which == 13) {
              reset(ipcRenderer)
          }
      }
  });

  ipcRenderer.on('reset', (e, j) => {
    if (activeTab == 'items') {
      $('.search-results-container').hide();
      $('.search-input').val('');
    }
  });

  // ipcRenderer.on('setHotkey', (e, hotkey) => {
  //     $('.hotkey').text(hotkey)
  // });

  ipcRenderer.on('itemResults', (e, data) => {
    $('.search-header').remove();
    $('.search-row').remove();
    $('.quest-header').remove();
    $('.quest-row').remove();
    $('.quest-info-container').remove();

    $('.search-results-container').append(
      $('<div/>', {
        class: 'search-header'
      }).append(
        $('<div/>', {
          class: 'name-container',
          text: 'Item Name'
        })
      ).append(
        $('<div/>', {
          class: 'average',
          text: 'Average'
        })
      ).append(
        $('<div/>', {
          class: 'trader',
          text: 'Trader'
        })
      )
    )

    for (let i in data) {
      let nameSecondaryElement = 
        $('<div/>', {class: 'name-secondary'}).append(
          $('<div/>', {class: 'full-name', text: `(${data[i].name})`})
        )

      if ('quests' in data[i]) {
        for (let j in data[i].quests) {
          let quest = data[i].quests[j]
          nameSecondaryElement.append(
            $('<div/>', {class: 'name-quests'}).append(
              $('<div/>', {
                class: 'in-raid-quest',
                text: quest.title
              })
            ).append (
              $('<embed/>', {
                'height': '15',
                'width': '15',
                'class': 'in-raid-icon',
                'src': 'images/check-circle.svg'
              })
            ).append(
              $('<div/>', {
                class: 'in-raid-amount',
                text: quest.amount
              })
            )
          )
        }
      }

      if ('hideout' in data[i]) {
        for (let j in data[i].hideout) {
          let hideout = data[i].hideout[j]
          nameSecondaryElement.append(
            $('<div/>', {class: 'name-hideout'}).append(
              $('<div/>', {
                class: 'hideout-title',
                text: `${hideout.module} L${hideout.level}`
              })
            ).append (
              $('<embed/>', {
                'height': '15',
                'width': '15',
                'class': 'hideout-icon',
                'src': 'images/hashtag.svg'
              })
            ).append(
              $('<div/>', {
                class: 'hideout-amount',
                text: hideout.quantity
              })
            )
          )
        }
      }

      let nameElement = 
        $('<div/>', {class: 'name-container'}).append(
          $('<div/>', {class: 'short-name', text: data[i].shortName})
        ).append(
          nameSecondaryElement
        )

      let traderPrice = -1;

      for (let j in data[i].traderPrices) {
        if (data[i].traderPrices[j].price > traderPrice) {
          traderPrice = data[i].traderPrices[j].price
        }
      }

      $('.search-results-container').append(
        $('<div/>', {
          class: 'search-row'
        }).append(
          nameElement
        ).append(
          $('<div/>', {
            class: 'average',
            text: `₽${data[i].avg24hPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
          })
        ).append(
          $('<div/>', {
            class: 'trader',
            text: `₽${traderPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
          })
        )
      )
    }

    $('.search-results-container').css('display', 'flex');
  });

  $('.tab').on('click', (e) => {
    let tab = $(e.target).data().id;
    activeTab = tab;
    // Universal
    $('.search-results-container').empty();
    $('.active-tab').removeClass('active-tab');
    $(e.target).addClass('active-tab');
    $('.search-input').attr('placeholder', $(e.target).data().placeholder)
    $('.search-input').val('')
    $('.search-input').focus()
    $('.active-subtab').removeClass('active-subtab')

    // Tab-Specific
    if (tab == 'hideout') {
      $('.search-input').prop('disabled', 'disabled')
      ipcRenderer.send('getHideout')
    } else {
      $('.search-input').removeAttr('disabled')
    }

    if (tab == 'quests') {
      $('.quest-subtab-container').css('display', 'flex')
    } else {
      $('.quest-subtab-container').css('display', 'none')
    }
  });

  $('.subtab').on('click', (e) => {
    let traderId = $(e.target).data().id;
    $('.active-subtab').removeClass('active-subtab')
    $(e.target).addClass('active-subtab')
    ipcRenderer.send('getQuests', {trader: traderId})
  });

  ipcRenderer.on('questResults', (e, data) => {
    $('.search-header').remove();
    $('.search-row').remove();
    $('.quest-header').remove();
    $('.quest-row').remove();
    $('.quest-info-container').remove();

    $('.search-results-container').append(
      $('<div/>', {
        class: 'quest-header'
      }).append(
        $('<div/>', {class: 'quest-trader', text: 'Trader'})
      ).append(
        $('<div/>', {class: 'quest-name', text: 'Quest Name'})
      ).append(
        $('<div/>', {class: 'quest-tasks', text: 'Tasks'})
      ).append(
        $('<div/>', {class: 'quest-expand'})
      )
    )


    let traders = ['Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaegar', 'Fence']
    let locations = ['Factory', 'Customs', 'Woods', 'Shoreline', 'Interchange', 'Labs', 'Reserve' , 'Lighthouse']

    let quests = data[0];
    let itemDictionary = data[1];

    for (let i in quests) {
      let objectives = [];
      for (let j in quests[i].objectives) {
        let task = '<div class="task-line-container"><div class="task-dash">-</div>';
        let type = quests[i].objectives[j].type;
        let number = quests[i].objectives[j].number;
        let target = quests[i].objectives[j].target;
        let location = quests[i].objectives[j].location;

        if (type == 'reputation') {
          type = 'reach level';
          target = 'on ' + traders[target]
        }

        if (type == 'skill') {
          type = 'achieve level';
        }

        if (type == 'key') {
          type = 'requires';
        }

        if (type == 'find') {
          type = 'find in raid';
        }

        if (['kill', 'collect', 'find in raid', 'pickup', 'place', 'mark', 'reach level', 'requires', 'locate', 'build', 'achieve level'].includes(type)) {
          task += `${capitalizeFirstLetter(type)}`;
        }

        if (!(['mark', 'pickup', 'warning', 'locate', 'build'].includes(type))) {
          if (['place', 'requires'].includes(type)) {
            if (number > 1) {
              task += ` ${number}`
            } 
          } else {
            task += ` ${number}`
          }
        }

        if (Array.isArray(target)) {
          for (let k in target) {
            if (target[k] in itemDictionary) {
              target[k] = itemDictionary[target[k]].name
            }
          }
          target = target.join(', ')
        } else {
          if (target in itemDictionary) {
            target = itemDictionary[target].name
          }
        }
        
        task += ` ${target}`

        if (location > -1 && type != 'requires') {
          task += ` on ${locations[location]}`
        }

        if ('with' in quests[i].objectives[j] && quests[i].objectives[j].type != 'build') {
          task += ` (${quests[i].objectives[j].with.join(', ')})`
        }

        task += '</div>'
        objectives.push(task)
      }


      $('.search-results-container').append(
        $('<div/>', {
          class: 'quest-row',
          'data-wiki': quests[i].wiki
        }).append(
          $('<div/>', {class: 'quest-trader', text: traders[quests[i].giver]})
        ).append(
          $('<div/>', {class: 'quest-name', text: quests[i].locales.en})
        ).append(
          $('<div/>', {class: 'quest-tasks', html: objectives.join('')})
        ).append(
          $('<div/>', {class: 'quest-expand'}).append(
            $('<div/>', {class: 'quest-expand-box'}).append(
              $('<svg/>', {xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 320 512", height: '20', width: '20'}).append(
                $('<path/>', {fill: "#b9b8bd", d: "M151.5 347.8L3.5 201c-4.7-4.7-4.7-12.3 0-17l19.8-19.8c4.7-4.7 12.3-4.7 17 0L160 282.7l119.7-118.5c4.7-4.7 12.3-4.7 17 0l19.8 19.8c4.7 4.7 4.7 12.3 0 17l-148 146.8c-4.7 4.7-12.3 4.7-17 0z"})
              )
            )
          )
        )
      )

      $('.search-results-container').append(
        $('<div/>', {
          class: 'quest-info-container'
        })
      )
    }

    $('.search-results-container').css('display', 'flex');
    $('.search-results-container').html($('.search-results-container').html());
  });


  ipcRenderer.on('hideoutResults', (e, data) => {
    $('.search-header').remove();
    $('.search-row').remove();
    $('.quest-header').remove();
    $('.quest-row').remove();
    $('.quest-info-container').remove();

    $('.search-results-container').append(
      $('<div/>', {
        class: 'hideout-header'
      }).append(
        $('<div/>', {class: 'hideout-name', text: 'Station'})
      ).append(
        $('<div/>', {class: 'hideout-requirements', text: 'Requirements'})
      ).append(
        $('<div/>', {class: 'hideout-expand'})
      )
    )

    let stations = data[0].stations;
    let modules = data[0].modules;
    let itemDictionary = data[1];

    for (let i in stations) {
      $('.search-results-container').append(
        $('<div/>', {
          class: 'hideout-row',
          id: `hideout-${stations[i].id}`
        }).append(
          $('<div/>', {class: 'hideout-name', text: `${stations[i].locales.en}`})
        ).append(
          $('<div/>', {class: 'hideout-requirements'})
        ).append(
          $('<div/>', {class: 'hideout-expand'}).append(
            $('<div/>', {class: 'hideout-expand-box'}).append(
              $('<svg/>', {xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 320 512", height: '20', width: '20'}).append(
                $('<path/>', {fill: "#b9b8bd", d: "M151.5 347.8L3.5 201c-4.7-4.7-4.7-12.3 0-17l19.8-19.8c4.7-4.7 12.3-4.7 17 0L160 282.7l119.7-118.5c4.7-4.7 12.3-4.7 17 0l19.8 19.8c4.7 4.7 4.7 12.3 0 17l-148 146.8c-4.7 4.7-12.3 4.7-17 0z"})
              )
            )
          )
        )
      )
    }

    let traders = ['Prapor', 'Therapist', 'Skier', 'Peacekeeper', 'Mechanic', 'Ragman', 'Jaegar', 'Fence']
    modules = modules.reverse()
    for (let i in modules) {
      let requirementItems = [];
      let requirements = modules[i].require;
      let level = modules[i].level;
      let station = modules[i].stationId;

      for (let j in requirements) {
        let row = requirements[j];

        if (row.type == 'item') {
          if (row.name in itemDictionary) {
            row.name = itemDictionary[row.name].name
          }
          requirementItems.push(`<div><span class="module-dash">-</span>${row.quantity} x ${row.name}</div>`)
        }

        if (row.type == 'skill' || row.type == 'module') {
          requirementItems.push(`<div><span class="module-dash">-</span>Level ${row.quantity} ${row.name}</div>`)
        }

        if (row.type == 'trader') {
          requirementItems.push(`<div><span class="module-dash">-</span>Level ${row.quantity} ${traders[row.name]}</div>`)
        }
      }



      (
        $('<div/>', {
          class: `hideout-row hideout-station-${station} module-row hidden`,
          id: `module-${modules[i].id}`
        }).append(
          $('<div/>', {class: 'hideout-name', html: `<span class="hideout-dash">–</span> Level ${level}`})
        ).append(
          $('<div/>', {class: 'hideout-requirements', html: requirementItems.join('')})
        ).append(
          $('<div/>', {class: 'hideout-expand'})
        )
      ).insertAfter(`#hideout-${station}`)
    }

    $('.search-results-container').css('display', 'flex');
    $('.search-results-container').html($('.search-results-container').html());
  });

  $(document).on('click', '.quest-expand-box', (e) => {
    ipcRenderer.send('getWiki', $(e.target).closest('.quest-row').data().wiki)
  });

  $(document).on('click', '.hideout-expand-box', (e) => {
    let row = $(e.target).closest('.hideout-row');
    let stationId = row.attr('id').split('-')[1]
    $(`.hideout-station-${stationId}`).toggleClass('hidden');
  });

  ipcRenderer.on('wikiResults', (e, data) => {
    $(`[data-wiki="${data[0]}"]`).next().html(data[1])
    $(`[data-wiki="${data[0]}"]`).next().toggle()
  });

  $('.settings-button-container').on('click', (e) => {
    ipcRenderer.send('getSettings')
  })

  ipcRenderer.on('settingsResults', (e, conf) => {
    Object.keys(conf).forEach(function(i) { 
      $(`.hotkey[data-id="${i}"]`).text(conf[i])
    });

    $('.tab-container').toggle();
    $('.settings-container').toggle();
    $('.search-container embed').toggleClass('invisible');
    $('.search-container input').toggleClass('invisible');
  });


  // $('.search-input').on('blur', () => {
  //   if (!interactingWithApp) {
  //     reset(ipcRenderer);
  //   }
  // })

  $('.hotkey').on('click', (e) => {
    settingHotkey[$(e.target).data().id] = !settingHotkey[$(e.target).data().id]
    if (settingHotkey[$(e.target).data().id]) {
      $(e.target).text("|")
      let blinking = setInterval(() => {
        if (!settingHotkey[$(e.target).data().id]) {
          clearInterval(blinking)
        } else {
          if ($(e.target).text() == "|") {
            $(e.target).text("")
          } else {
            $(e.target).text("|")
          }
        }
      }, 550)
    }
  })

  $('.search-box').on('mouseover', () => {
      if (!interactingWithApp) {
        interactingWithApp = true
      }
  })

  $('.search-box').on('mouseleave', () => {
      if (interactingWithApp) {
        interactingWithApp = false
      }
  })

  // $('.hotkey').on('mouseover', () => {
  //     if (!thinkingAboutSettingHotkey) {
  //         thinkingAboutSettingHotkey = true
  //     }
  // })

  // $('.hotkey').on('mouseleave', () => {
  //     if (thinkingAboutSettingHotkey) {
  //         thinkingAboutSettingHotkey = false
  //     }
  // })


  //setup before functions
  let typingTimer; //timer identifier
  let doneTypingInterval = 250; //time in ms, 5 second for example
  let $input = $('.search-input');

  //on keyup, start the countdown
  $input.on('keyup', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
  });

  //on keydown, clear the countdown 
  $input.on('keydown', function () {
    clearTimeout(typingTimer);
  });

  //user is "finished typing," do something
  function doneTyping() {
    let val = $('.search-input').val();

    if (val.trim() != '') {
      if (activeTab == 'items') {
        ipcRenderer.send('itemSearch', val);
      } else if (activeTab == 'quests') {
        ipcRenderer.send('questSearch', val);
      }
      
    } else {
      $('.search-results-container').hide();
    }
  }
})

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}