/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


// List of people making tea
let teaMakers = [
    '@juma',
    '@adam',
    '@tahlia',
    '@ruth',
    '@lewis',
    '@rachel'
];

// Rota'd tea makers
let rotaTeaMakers = [];

// Next tea maker is first person in the array
let nextTeaMaker = 0;

let nextMakerResponses = [
    'The next person to make a tea is {name}!',
    'It looks like {name}\'s turn next!',
    '{name}! You\'re up!',
]

/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears('hello', 'direct_message', function (bot, message) {
    bot.reply(message, 'Hello!');
});

controller.hears(
    ['hello', 'hi', 'greetings', 'hey'],
    ['direct_mention', 'mention', 'direct_message'],
    function(bot,message) {
        bot.reply(message,'Hello Slackers!');
    }
);

controller.hears(
    ['generate', 'rota', 'new'],
    ['direct_mention', 'mention', 'direct_message'],
    function(bot, message) {

        /**
        * Creates a function to shuffle the array randomly
        */
        function shuffleMakers() {

            // Defines input as the teaMakers array
            const input = teaMakers;

            // Loop starts at the end of the array and works backwards
            for (let i = input.length - 1; i >= 0; i--) {

                // Chooses a random number between the start of
                // the array and the current loop position
                let randomIndex = Math.floor(Math.random()*(i+1));

                // Assigns itemAtIndex the value of
                // the chosen index
                let itemAtIndex = input[randomIndex];

                // Replaces the chosen index value with the
                // current index value in the loop
                input[randomIndex] = input[i];

                // Replaces the current index value in the loop
                // with the random index value we chose
                input[i] = itemAtIndex;
            }

            // Returns the randomised array
            return input;
        }

        // Assigns the shuffleMakers function to rota
        rotaTeaMakers = shuffleMakers();

        nextTeaMaker = 0;

        let msg = {
            'link_names': 1,
            'parse': 'full',
            'attachments': [{
                'pretext': 'Okay, gang! Let\'s get this kettle on the road :raised_hands:\n Today\'s tea rota is...\n\n',
                'color': "#36a64f",
                'text': rotaTeaMakers.join("\n"),
            }]
        };

        bot.reply({
            channel: message.channel
        }, msg, () => {

            msg = {
                'link_names': 1,
                'parse': 'full',
                'text': '\n\n You\'re up first, ' + rotaTeaMakers[0] + '!',
                'attachments': []
            };

            bot.reply({
                channel: message.channel
            }, msg);
        });
    }
)

controller.hears(
    ['next', 'want', 'who', 'tea'],
    ['direct_mention', 'mention', 'direct_message'],
    function(bot,message) {

        nextTeaMaker++;

        let randomIndex = Math.floor(Math.random() * nextMakerResponses.length);

        const msg = {
            'link_names': 1,
            'parse': 'full',
            'text': nextMakerResponses[randomIndex].replace('{name}', rotaTeaMakers[nextTeaMaker]),
            'attachments': []
        };

        bot.reply({
            channel: message.channel
        }, msg);

        if (nextTeaMaker >= rotaTeaMakers.length) {
            nextTeaMaker = 0;
        }
    }
);

/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});
