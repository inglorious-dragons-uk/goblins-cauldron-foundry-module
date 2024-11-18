Hooks.once('init', () => {
  console.log("This code runs once on initialization");
})

Hooks.once('ready', () => {
  // This code runs once when Foundry is ready
  console.log("This code runs once core initialization is ready and game data is available");
  game?.socket.on('module.goblins-cauldron-foundry-module', handleSocketEvent);
});


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

// Listen for 'updateActor' events from the server
function handleUpdateCharacterSheet(payload) {
  
  // Get the actor
  const actor = game.actors.get(payload?.actorId);

  if (!actor) {
    console.log(`Actor with id ${payload?.actorId} does not exist.`);
    return;
  }

  // Update the actor data
  actor.update(payload.data);

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
    content: payload.chatMessage
  });
}

function handleDiceRoll(payload) {
  console.log(`Rolling ${payload.count}d${payload.diceType}`);

  const formula = payload.count + "d" + payload.diceType;
  const roll = new Roll(formula);

  roll.toMessage({
    user: payload?.actorId
  }, 'publicroll', true)
}

function handleCastSpell(payload) {
  const spellId = payload.body.spellId
  const actor = game.actors.get(payload?.actorId);

  if (!actor) {
    console.log(`Actor with id ${payload?.actorId} does not exist.`);
    return;
  }

  castSpell(actor.items.get(spellId), actor)
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


//Cast Spell
function getSpellcasting(actor) {
  return actor.spellcasting.regular[0]
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

//Example - castSpell(actor.items.get("pWJOdDbcfXQw2Y7W"), actor)
const castSpell = async (item, actor) => {
  const dataEmbeddedItem = `data-embedded-item="${escapeHtml(JSON.stringify(item.toObject(false)))}"`
  const dataItemId = `data-item-id="${item.id}"`
  const spellcasting = getSpellcasting(actor)
  
  item.system.location.value = spellcasting.id
  item.isFromConsumable = true // to make it embed data

  Object.defineProperty(item, 'spellcasting', {
    value: spellcasting,
    configurable: true,
  })

  const chatMessage = await item.toMessage(null, { create: false})
  chatMessage.content = chatMessage.content.replace(dataItemId, `${dataItemId} ${dataEmbeddedItem}`)
  chatMessage.flags.pf2e.casting.embeddedSpell = item.toObject()
  chatMessage._source.flags.pf2e.casting.embeddedSpell = item.toObject()
  return ChatMessage.create(chatMessage)
}





