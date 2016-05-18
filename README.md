# p2pweb

## Setup

[NodeJs](https://nodejs.org/) and it's package manager [npm](http://blog.npmjs.org/post/85484771375/how-to-install-npm) will need to be installed. Once installed, run `npm install` from within the project root to install all the dependcies.


## Running and Building
Running `npm start` from within the project root will compile everything and start an http server on port 8000. When file changes are detected, the code is automatically recompilled.
Opening up a web browser and pointing to `http://localhost:8000/` will load the app.

## Project layout

```
├── test        # Stores the test which are currently out-dated and not working
├── app         # Basic website code utilizing `lib` to provide p2p communication
├── lib         # Meat of the project. Houses the client and server p2p code
├── build       # Compiled output for `app` and `lib`
└── README.md   # This file
```

The `lib` code is written in typescript, a superset of javascript with type checking. The `app` code is just vanilla html/css/js.
