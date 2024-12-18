const apiUrl = 'https://character-api.inglorious-dragons.co.uk'
//const apiUrl = 'http://localhost:9000'

Hooks.once('init', () => {
  console.log("This code runs once on initialization");
})

Hooks.once('ready', () => {

  console.log("Connecting to The Goblin's Cauldron...");

  game.settings.register("goblins-cauldron-foundry-module", 'gcCampaignId', {
    name: "Goblin's Cauldron Campaign Id",
    hint: "Enter your Goblin's Cauldron campaign ID",
    scope: 'world',
    config: true,
    type:  String,
    default: '',
    onChange: campaignId => {
      console.log('campaignId ', campaignId)
      const sessionId = game?.socket?.session?.sessionId
      fetch(
          `${apiUrl}/v1/connect-to-gc`,
          {
            method: 'POST',
            mode: "cors",
            headers: {
              "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.parse(JSON.stringify(`{ 
               "campaignId" : "${campaignId}",
               "sessionId" : "${sessionId}",
               "foundryUrl": "${game?.socket?.io?.uri}"
            }`
            ))
          }).then(response => {
        if (response.ok) {
          console.log("The Goblin's Cauldron Successfully Connected!")
          return response.json()
        } else if (response.status === 500) {
          return Promise.reject('Network Error')
        }
      }).catch((error) => {
        console.log("Error Connecting to The Goblin's Cauldron!", error)
      })
    },
  });

  const sessionId = game?.socket?.session?.sessionId
  const campaignId = game.settings.get("goblins-cauldron-foundry-module", 'gcCampaignId')
  const foundryUrl = game?.socket?.io?.uri

  fetch(
      `${apiUrl}/v1/connect-to-gc`,
      {
        method: 'POST',
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.parse(JSON.stringify(`{ 
               "campaignId" : "${campaignId}",
               "sessionId" : "${sessionId}",
               "foundryUrl": "${foundryUrl}"
            }`
        ))
      }).then(response => {
    if (response.ok) {
      console.log("The Goblin's Cauldron Successfully Connected!")
      return response.json()
    } else if (response.status === 500) {
      return Promise.reject('Network Error')
    }
  }).catch((error) => {
    console.log("Error Connecting to The Goblin's Cauldron!", error)
  })

  game?.socket.on('module.goblins-cauldron-foundry-module', handleSocketEvent);
});

Hooks.on('updateActor', function onUpdateActor(actor, data, options, userId) {
  console.log('Character Update Detected')
  console.log('actor ', actor)
  console.log('data ', data)
})

function handleSocketEvent({ eventType, payload }) {
  console.log('eventType ', eventType, ' payload ', payload);


  switch (eventType) {
    case "UPDATE_CHARACTER": {
      handleUpdateCharacterSheet(payload);
      break
    }
    case "SEND_TO_CHAT": {
      handleSendToChat(payload);
      break
    }
    case "CAST_SPELL": {
      handleCastSpell(payload);
      break
    }
    case "ROLL_DICE": {
      handleDiceRoll(payload);
      break
    }
    default:
      //throw new Error('unknown event type');
      console.log('unknown event type')
  }
}

function handleUpdateCharacterSheet(payload) {

  const actor = game.actors.get(payload?.actorId);

  if (!actor) {
    console.log(`Actor with id ${payload?.actorId} does not exist.`);
    return;
  }

  actor?.update(payload.data);

  console.log('Actor ', actor?.name, ' - with ID ', actor?._id, ' successfully updated!');
}

function handleSendToChat(payload) {
  const actor = game.actors.get(payload?.actorId);

  if (!actor) {
    console.log(`Actor with id ${payload?.actorId} does not exist.`);
    return;
  }

  ChatMessage.create({
    user: payload?.actorId,
    speaker: {alias: actor?.name},
    content: payload?.chatMessage
  });
}

function handleDiceRoll(payload) {
  console.log(`Rolling ${payload?.count}d${payload?.diceType}`);

  const formula = payload?.count + "d" + payload?.diceType;
  const roll = new Roll(formula);

  roll?.toMessage({
    user: payload?.actorId
  }, 'publicroll', true)
}

function handleCastSpell(payload) {
  const spellId = payload?.spellId
  const actor = game.actors.get(payload?.actorId);

  if (!actor) {
    console.log(`Actor with id ${payload?.actorId} does not exist.`);
    return;
  }

  castSpell(actor?.items?.get(spellId), actor)
}

//Whisper Chat Message with HTML
// ChatMessage.create({
//     whisper: [game.user.id],
//     content:
//       `<div class="${game.system.id} chat-card item-card">
//           <header class="card-header flexrow">
//           <h3 class="item-name">my test</h3>
//           </header>
//       </div>
//       `,
//   })


function getSpellCasting(actor) {
  return actor?.spellcasting?.regular[0]
}

function escapeHtml (string) {
  const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  }
  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return replacements[s]
  })
}

const castSpell = async (item, actor) => {
  const dataEmbeddedItem = `data-embedded-item="${escapeHtml(JSON.stringify(item.toObject(false)))}"`
  const dataItemId = `data-item-id="${item.id}"`
  const spellCasting = getSpellCasting(actor)
  
  item.system.location.value = spellCasting.id
  item.isFromConsumable = true // to make it embed data

  Object.defineProperty(item, 'spellcasting', {
    value: spellCasting,
    configurable: true,
  })

  const chatMessage = await item.toMessage(null, { create: false})
  chatMessage.content = chatMessage.content.replace(dataItemId, `${dataItemId} ${dataEmbeddedItem}`)
  chatMessage.flags.pf2e.casting.embeddedSpell = item.toObject()
  chatMessage._source.flags.pf2e.casting.embeddedSpell = item.toObject()
  return ChatMessage.create(chatMessage)
}





