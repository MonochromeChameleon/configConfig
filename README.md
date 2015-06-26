# configConfig
Environment-specific config handling for node.js

## Why?
I was looking for a way to handle application config with environment-specific overrides, and I failed to find one.

## Seriously?
Well, [Sails.js](http://sailsjs.org/) has decent config handling, but I wasn't using Sails at the time.

## So how does it work?
Write a config file that exports a JS object with your config properties on. Something like:

```
module.exports = {
    foo: 'bar',
    bar: 'foo',
    _environments: {
        dev: {
            bar: 'baz'
        },
        production: {
            bar: 'bar black sheep'
        }
    }
}
```

Then require configConfig in an appropriate location in your application, probably app.js:

```
var configConfig = require('configConfig');
var myConfig = configConfig(_pathToMyConfigFile_);
```

This will initialize myConfig with the base properties of your object, with overrides taken from the _environments object, based on the value of `process.env.NODE_ENV`. Once initialized, you can simply require('configConfig') anywhere else in your app and it will export only the config object for your environment.

## What options can I use?
If you want a little more fine-grained control on initialization, you can pass an object:

```
var configConfig = require('configConfig');
var myConfig = configConfig({
    global: true,
    globalVariableName: 'foo',
    path: _pathToMyConfigFile_,
    env: 'whyWouldIEverDoThis'
})
```

This would expose your config as a global variable (probably a bad idea) with the name foo (probably a bad idea) using the config for 'whyWouldIEverDoThis' rather than `process.env.NODE_ENV` (probably a bad idea).

## What else can I do?
If you really want, you can put your config file in the default location (_appDir_/config.js) with an additional _configConfig property - the same as the options above, but with the addition of an autoload behaviour, so:

```
module.exports = {
    foo: 'bar',
    bar: 'foo',
    _environments: {
        dev: {
            bar: 'baz'
        },
        production: {
            bar: 'bar black sheep'
        }
    },
    _configConfig: {
        autoload: true
    }
}
```

would force everything to execute immediately, meaning that your initial require call:

```
var configConfig = require('configConfig');
```

would be all you needed to initialize everything.

## Why the name?
Have you seen how many times I've written the word 'config' in this readme?
