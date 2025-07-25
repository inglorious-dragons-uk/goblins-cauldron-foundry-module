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
        type: String,
        default: ''
    });

    game.settings.register("goblins-cauldron-foundry-module", 'developerMode', {
        name: "Developer Mode",
        hint: "Use this for development only",
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    const sessionId = game?.socket?.session?.sessionId
    const campaignId = game.settings.get("goblins-cauldron-foundry-module", 'gcCampaignId')
    const isDevMode = game.settings.get("goblins-cauldron-foundry-module", 'developerMode')
    const foundryUrl = isDevMode ? game.data.addresses['local'] : game.data.addresses['remote']//game?.socket?.io?.uri

    fetch(
        `${isDevMode ? 'http://localhost:9000' : 'https://character-api.inglorious-dragons.co.uk'}/v1/connect-to-gc`,
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

// TODO - Move these helper functions to a new file and export
function isObject(x) {
    return Object.prototype.toString.call(x) === '[object Object]';
}

function getPath(obj, prefix) {
    const keys = Object.keys(obj);
    prefix = prefix ? prefix + '.' : '';
    return keys.reduce(function (result, key) {
        if (isObject(obj[key])) {
            result = result.concat(getPath(obj[key], prefix + key));
        } else {
            result.push(prefix + key);
        }
        return result;
    }, []);
}

function deepFind(obj, path) {
    let paths = path.split('.')
        , current = obj
        , i;

    for (i = 0; i < paths.length; ++i) {
        if (current[paths[i]] !== undefined) {
            current = current[paths[i]];
        } else {
            return undefined;
        }
    }
    return current;
}

Hooks.on('updateActor', function onUpdateActor(actor, data, options, userId) {
    console.log('Updating Actor ', actor, ' data ', data)

    const path = getPath(data)

    game?.socket.emit('module.goblins-cauldron-foundry-module', {
        eventType: "UPDATE_GC_CHARACTER",
        payload: {actor: actor, path: path[0], value: deepFind(data, path[0])}
    });
})

Hooks.on('createChatMessage', function onCreateChatMessage(actor, data, userId) {
  console.log('New Chat Message Created ', actor, ' options ', data, ' userId ', userId)
})

Hooks.on('updateItem', function onUpdateItem(actor, data, userId) {
  console.log('Item Updated ', actor, ' options ', data, ' userId ', userId)
})

// Hooks.on('createActor', function onCreateActor(actor, options, userId) {
//   console.log('Created a new Actor ', actor, ' options ', options, ' userId ', userId)
//
//   if (userID != game.user.id) { return;}
//
//   game?.socket.emit('module.goblins-cauldron-foundry-module', {
//     eventType: "CREATE_NEW_GC_CHARACTER",
//     payload: {actor: actor}
//   });
// })

function handleSocketEvent({eventType, payload}) {
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
        case "EXPEND_SPELL_SLOT": {
            handleExpendSpellSlot(payload);
            break
        }
        case "ADD_REMOVE_SPELL_FROM_SLOT": {
            handleAddRemoveSpellSlot(payload);
            break
        }
        case 'ADJUST_FOCUS_POOL': {
            handleSpellFocusPool(payload);
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

// ---------- Cast Spell ------------
async function handleCastSpell(payload){
    const spellId = payload?.spellId
    const actor = game.actors.get(payload?.actorId);

    if (!actor) {
        console.log(`Actor with id ${payload?.actorId} does not exist.`);
        return;
    }

    const item = actor?.items?.get(spellId)
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

// ---------- Expend Spell ------------
async function handleExpendSpellSlot(payload) {
    const actor = game.actors.get(payload?.actorId);
    if (!actor) {
        console.log(`Actor with id ${payload?.actorId} does not exist.`);
        return;
    }
    const spellCasting = getSpellCasting(actor)
    const slotId = payload?.slotId
    const slotLevel = payload?.slotLevel
    const isExpend = payload?.isExpend

    // Expend a spell slot
    const preparedPath = `system.slots.slot${slotLevel}.prepared`;
    const prepared = foundry.utils.getProperty(spellCasting, preparedPath) || {};
    prepared[slotId] = {...prepared[slotId], expended: isExpend};

    if (spellCasting && spellCasting?.system?.slots && slotLevel > 0) {
        await spellCasting.update({
            [preparedPath]: prepared
        })
    } else {
        console.log('No spell slots available to expend.');
    }
}

// ---------- Remove Spell ------------
async function handleAddRemoveSpellSlot(payload){
    const actor = game.actors.get(payload?.actorId);
    if (!actor) {
        console.log(`Actor with id ${payload?.actorId} does not exist.`);
        return;
    }
    const spellCasting = getSpellCasting(actor)
    const slotId = payload?.slotId
    const spellId = payload?.spellId
    const slotLevel = payload?.slotLevel

    const preparedPath = `system.slots.slot${slotLevel}.prepared`;
    const prepared = foundry.utils.getProperty(spellCasting, preparedPath) || {};
    prepared[slotId] = {...prepared[slotId], id: spellId};

    if (spellCasting && spellCasting?.system?.slots) {
        await spellCasting.update({
            [preparedPath]: prepared
        })
    } else {
        console.log('No spell slots available to expend.');
    }
}

// ---------- Adjust Spell Focus Pool ------------
async function handleSpellFocusPool(payload){
    const actor = game.actors.get(payload?.actorId);
    const poolValue = payload?.poolValue ?? -1; // Default to 1 if not provided
    if (!actor) {
        console.log(`Actor with id ${payload?.actorId} does not exist.`);
        return;
    }
    const currentPool = actor.system.resources.focus?.value ?? 0
    const newPool = Math.max(0, Math.min(currentPool + poolValue, actor.system.resources.focus?.max ?? 0));

    await actor.update({"system.resources.focus.value": newPool})
}

function getSpellCasting(actor) {
    return actor?.spellcasting?.regular[0]
}

function escapeHtml(string) {
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