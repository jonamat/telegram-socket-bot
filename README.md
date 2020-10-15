# telegram-socket-bot

This is a Telegram bot server to establish full duplex connections between clients and Telegram accounts through WebSocket protocol.<br>
This bot is been created to interact with react-telegram-chatbox, but can also be used with custom applications (see [socket integration] (# with-socket.io)).

## Usage

### ⚠⚠ WIP ⚠⚠
This bot is currently under development. Although it can already establish encrypted duplex communication with clients and hides user personal info, it does not prevent from spoofing, nor does it provide a reliable authentication system for clients (makes a shallow comparison of user-defined hostnames with client referrers). So **do not use this service to send sensitive data**.<br>

To use this bot you need to sign up by opening a new chat with **TgSocketBot** from your Telegram account. Follow [this link](http://t.me/TgSocketBot) and type `/start` to sign up. It will give you a personal access token, to be used in your client application.<br>
Also, in production, you need to add the domain that you want to allow use of the token with the command `/whitelist your.domain.com`. To remove an hostname from the whitelist, use the same command.<br>
By default, `localhost` will be added to your whitelist to allow you to test the bot in your application.

### With socket.io
To use this bot with socket.io library, you need to create a socket.io connection passing your token and a `referer` header.

```js
import socketIO from 'socket.io-client';

const connection = socketIO.connect(`http://telegram-socket-bot.tk`, {
    path: '/socket',
    transportOptions: {
        polling: {
            extraHeaders: {
                referer: location.host,
            },
        },
    },
    auth: {
        token: "Your_token",
    },
});

connection.on('connect', (socket) => {
    console.log(`Connection established. Assigned id: ${socket.id}`)

    socket.on('message', (message) => {
        console.log('New message incoming from your Telegram account', message)
    })

    socket.send('This message will be sent to your Telegram account')
});

connection.on('connect_error', (error) => {
    console.error(`Connection rejected with error: ${error}`)
});

```

### With react-telegram-chatbox
To use this bot with react-telegram-chatbox, you simply put your token in the Chatbox component

```jsx
import { Chatbox } from 'react-telegram-chatbox'
// ...
    <Chatbox token="Your_token" />
// ...
```
See the usage section in [react-telegram-chatbox docs](https://github.com/jonamat/react-telegram-chatbox) for details.


## Commands

`/start`<br>
Sign up and create your access token.

`/help`<br>
Show a list of available commands and usage.

`/info`<br>
Display your information, your access token and whitelisted hostnames.

`/whitelist [hostname]`<br>
Toggle a hostname from your whitelist.<br>
The hosts that are not in the whitelist will be rejected.

`/refreshtoken`<br>
Create a new token and delete the old one (require confirmation).

`/deletedata`<br>
Close your account and delete all your information from the database (require confirmation).

`/r [username] [message]`<br>
Reply to a specific user

## Events
The only currently available event is `message`, and its payload is the message `string`. In the next release will be added `photo`, `file`, and `video`.

## Security concerns
This bot is currently under development. Although it can already establish encrypted duplex communication with clients and hides user personal info, it does not prevent from spoofing, nor does it provide a reliable authentication system for clients (makes a shallow comparison of user-defined hostnames with client referrers).<br>
these concerns could be fixed in the future by providing a backend auth system in addition of the current referrer based system. Any help in developing this system is welcome.

## Contributing
The app uses 2 databases to manage user data (mongodb) and logs (mysql). It extends the use of node-telegram-bot-api and socket.io libraries to adapt the requests flow to an MVC architecture.<br>

The Telegram user requests are handled in a simply way: the request goes through 3 middleware, one for logging, one for rejecting users who does not provide a valid Telegram ID and the last one that assign a custom property to the request object, populated with the user data fetched from the database (except for `/start` command). The request is routed using the `command` or the `code` in the [CallbackQueries](https://core.telegram.org/bots/api#callbackquery) to its controller.<br>

The client request goes through 3 middleware, one for logging, one to limit the number of incoming requests per IP, and the last one that validates and decrypts the client token (which contains the user ID), fetch the user data and rejects requests from non-whitelisted referrers. The request is routed using the `event` arg to its controller.<br>

On client connection, the app assign to the connection ID a short, generated **alias**, which user will use to reply to that specific socket instance. On disconnection, the alias will be deleted.

### Using remote containers in Visual Studio Code
This repository provide all the tools to start writing and testing your code without any configurations. The app is containerized to use two preconfigured database containers for testing and a CLI Telegram API emulator to test your code without creating a real bot in Telegram.<br>
To use devcontainer feature you need to have Docker installed and the Remote Containers extension enabled in VSCode.<br>
See [Developing inside a Container](https://code.visualstudio.com/docs/remote/containers) for details.

## License
MIT @ Jonathan Mataloni
