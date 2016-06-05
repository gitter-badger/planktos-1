# Planktos

[![Join the chat at https://gitter.im/xuset/planktos](https://badges.gitter.im/xuset/planktos.svg)](https://gitter.im/xuset/planktos?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Planktos is a library for building p2p web applications. A simple push/pull interface is provided for storing and retreiving data in a distributed way; so all the data is stored on the peers visiting the website and not on any servers. The code is in an early alpha state so there are bound to be bugs and inefficiencies. If you want to help out, join us on [gitter](https://gitter.im/xuset/planktos) or try out our live demo at [chatter.planktos.xyz](http://chatter.planktos.xyz).

## Setup - start hacking

To get setup, [NodeJs](https://nodejs.org/) and it's package manager [npm](http://blog.npmjs.org/post/85484771375/how-to-install-npm) will need to be installed. Once installed, clone the repo and run `npm install` from within the project root to install all the dependcies. Once the project moves out of the alpha state, npm and bower modules will be made available for the code.

## Running and Building

There are three main components to this repo:
 1. Server - keeps track of the peers in the network and forwards webrtc signaling information
 2. Library - Browser code that handles all the storing, retrieving, and discovering data in the network. All of this code is written in typescript.
 3. App - A demo application that utilizes the library to run a post-based website were users can create and view posts.

Running `npm start` from within the project root will compile everything and start an http server on port 8000 serving the demo app. When file changes are detected, the code is automatically recompilled. Alternatively, you can run `npm run gulp -- build-lib` to just build the lib, but not start the server.

Opening up a web browser and pointing it to `http://localhost:8000/` will load the demo app.

## Project layout

```
├── test        # Stores the tests
├── app         # Demo web app that utilizes planktos
├── lib         # Meat of the project. Houses the p2p code written in typescript
├── build       # Compiled output for `app` and `lib`
└── README.md   # This file
```
