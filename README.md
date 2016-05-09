# p2pweb

## Setup

First, nodejs and npm will need to be installed. Most of the time npm installed whenever nodejs is installed. Node can be installed with brew, aptitude, or downloaded from the nodejs website.

Installing all the dependcies can be done inside the project root with:
```
npm install -g gulp bower typings
npm install
bower install
typings install
```

## Building
Running `gulp serve` from within the project root will compile everything and start an http server on port 8000. When file changes are detected, the code is automatically recompilled.

## Project layout

```
├── test        # Stores the test which are currently out-dated and not working
├── app         # Basic website code utilizing `lib` to provide p2p communication
├── lib         # Meat of the project. Houses the client and server p2p code
├── build       # Compiled output for `app` and `lib`
└── README.md   # This file
```

The `lib` code is written in typescript, a superset of javascript with type checking. The `app` code is just vanilla html/css/js.
