"use strict";

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var ENVIRONMENT = "environment";
var IMPORT = "import";

var appDir = path.dirname(require.main.filename);
var defaultConfig = {
    global: false,
    globalVariableName: 'config',
    path: path.join(appDir, 'config'),
    env: process.env.NODE_ENV,
    autoload: false,
    environmentPropName: '_environments',
    importPropName: '_imports',
    loadPriority: ENVIRONMENT
};

function getValidFilePath(filePath) {
    // Try various file locations until one exists or we run out of places to look

    if (fs.existsSync(filePath)) {
        return filePath;
    }

    var testPath = path.join(appDir, filePath);

    if (fs.existsSync(testPath)) {
        return testPath;
    }

    testPath = path.join(__dirname, filePath);

    if (fs.existsSync(testPath)) {
        return testPath;
    }

    if (!/\.js$/.test(filePath)) {
        // Try again with a .js extension
        return getValidFilePath(filePath + '.js');
    }
}

function fileExists(filePath) {
    return !!getValidFilePath(filePath);
}

function loadFile(filePath) {
    var validFilePath = getValidFilePath(filePath);
    return !!validFilePath ? require(validFilePath) : {};
}

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
    var environmentConfig = config[configConfig.environmentPropName] || {};

    // Apply the environment-specific config over the top of our base.
    apply(environmentConfig[configConfig.env], config);

    // Clean up behind ourselves.
    delete config[configConfig.environmentPropName];

    return config;
}

function processImports(config, configConfig) {
    var imports = config[configConfig.importPropName];
    if (typeof imports === "string") {
        imports = [imports];
    }

    _.each(imports, function (imp) {
        var imported = loadFile(imp);
        apply(imported, config);
    });

    delete config[configConfig.importPropName];

    return config;
}

function handleEnvironmentAndImports(config, configConfig, loadPriority) {

    while (config[configConfig.environmentPropName] || config[configConfig.importPropName]) {
        // If Imports are prioritized, we load them all up until we have no more - imports can be nested
        while (loadPriority === IMPORT && config[configConfig.importPropName]) {
            config = processImports(config, configConfig);
        }

        // Load environment - this is probably never going to be nested, but we may as well support it.
        while (loadPriority === ENVIRONMENT && config[configConfig.environmentPropName]) {
            config = applyEnvironmentConfig(config, configConfig);
        }

        // Handle non-prioritized loads one at a time, any nesting will be handled by the outer loop

        if (config[configConfig.importPropName]) {
            config = processImports(config, configConfig);
        }

        if (config[configConfig.environmentPropName]) {
            config = applyEnvironmentConfig(config, configConfig);
        }
    }

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
    var baseConfig = apply(loadFile(configConfig.path), {});

    var config = handleEnvironmentAndImports(baseConfig, configConfig, configConfig.loadPriority);
    delete config._configConfig;

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
if (fileExists(defaultConfig.path)) {

    // If that file exists and has a _configConfig property, we assume that that property defines the config behaviour.
    var tryConfig = loadFile(defaultConfig.path);
    var configConfig = apply(tryConfig._configConfig, defaultConfig);

    // If our config includes an autoload property, just load it and export the config object directly.
    if (configConfig.autoload === true) {
        load(configConfig);
    }
} else {
    module.exports = initFn;
}
