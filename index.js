"use strict";

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var appDir = path.dirname(require.main.filename);
var defaultConfig = {
    global: false,
    globalVariableName: 'config',
    path: appDir + '/config',
    env: process.env.NODE_ENV,
    autoload: false
};

// Adds properties of config to base, overwriting as required.
function apply(config, base) {
    return _([config]).reduce(function (c, e) {
        return _.assign(c, e);
    }, base);
}

// Init function can be a string pointing at the config file, an object with additional options, or blank. This
// standardises it.
function handleInitOptions(opts) {
    if (typeof opts === "string") {
        return {
            path: opts
        };
    }

    return opts;
}

// Applies the environment-specific config over the top of our base config.
function applyEnvironmentConfig(config, configConfig) {
    // configConfig.env is either our process environment, or else a specifically-configured override.
    var environmentConfig = config._environments || {};

    // Apply the environment-specific config over the top of our base.
    apply(environmentConfig[configConfig.env], config);

    // Clean up behind ourselves.
    delete config._environments;
    delete config._configConfig;

    return config;
}

function updateReferences(config, configConfig) {
    // Add properties to initial export.
    apply(config, initFn);

    // Override export so we get the object directly whenever we subsequently require() this module.
    module.exports = config;

    // Declare a global variable if and only if we have explicitly decided to.
    if (configConfig.global === true) {
        GLOBAL[configConfig.globalVariableName] = config;
    }
}

function load(configConfig) {
    // Get initial config.
    var baseConfig = apply(require(configConfig.path), {});
    // Apply environment over the top.
    var config = applyEnvironmentConfig(baseConfig, configConfig);

    // Update the exports etc. so that the config properties are all available externally.
    updateReferences(config, configConfig);

    return config;
}

var initFn = function (initOptions) {

    // Process arguments and default config for our actual config import.
    var opts = handleInitOptions(initOptions);
    var configConfig = apply(opts, defaultConfig);

    return load(configConfig);
};

// On initial load, see whether we have a file in the default location.
if (fs.existsSync(defaultConfig.path + '.js')) { // fs.exists[Sync] is being deprecated, but stick with it for now.

    // If that file exists and has a _configConfig property, we assume that that property defines the config behaviour.
    var tryConfig = require(defaultConfig.path) || {};
    var configConfig = apply(tryConfig._configConfig, defaultConfig);

    // If our config includes an autoload property, just load it and export the config object directly.
    if (configConfig.autoload === true) {
        load(configConfig);
    }
} else {
    module.exports = initFn;
}