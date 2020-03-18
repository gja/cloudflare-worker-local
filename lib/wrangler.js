"use strict";
exports.__esModule = true;
var fs = require("fs");
var TOML = require("@iarna/toml");
var lodash_get_1 = require("lodash.get");
var lodash_merge_1 = require("lodash.merge");
var placeholder = /(?<!\\)$\{([^\}]+)\}/g; // negative lookbehind supported by V8 and therefore CloudFlare and NodeJS
//TODO remove '\' from escaped '\${}'
/**
 * Load the CloudFlare wrangler.toml file
 * This replaces all ${} placeholders in vars and secrets string values.
 * A placeholder path is resolved using lodash.get and has the context of the root of the config document.
 * A placeholder can not refer to a value defined later in the document that also has placeholders.
 * @param path filesystem path to wrangler.toml file
 * @param env env to load from wrangler.toml file
 */
function loadConfig(path, env) {
    var data = fs.readFileSync(path, { encoding: 'utf8' });
    var config = TOML.parse(data);
    // Load env
    if (env && config.env && config.env[env]) {
        var env_config = config.env[env];
        delete config['env'];
        lodash_merge_1["default"](config, env_config);
    }
    else {
        // Use base env
        delete config['env'];
    }
    // Populate all ${} placeholders in vars
    if (config.vars) {
        for (var _i = 0, _a = Object.entries(config.vars); _i < _a.length; _i++) {
            var _b = _a[_i], k = _b[0], v = _b[1];
            if (typeof v === 'string')
                config.vars[k] = v.replace(placeholder, function (match, path) { return lodash_get_1["default"](config, path, match); });
        }
    }
    // Populate all ${} placeholders in secrets
    if (config.secrets && config.vars && typeof config.vars['IDP'] === 'string') {
        var IDP_1 = config.vars['IDP'].split(',').map(function (v) { return v.trim(); }); // TODO should a full blown CSV parser be pulled in?
        for (var _c = 0, _d = Object.entries(config.secrets).filter(function (_a) {
            var k = _a[0], secret = _a[1];
            return IDP_1.includes(k);
        }); _c < _d.length; _c++) {
            var _e = _d[_c], k = _e[0], secret = _e[1];
            switch (typeof secret) {
                case 'string':
                    config.secrets[k] = secret.replace(placeholder, function (match, path) { return lodash_get_1["default"](config, path, match); });
                    break;
                case 'object':
                    if (Array.isArray(secret)) {
                        config.secrets[k] = secret.map(function (v) {
                            return typeof v === 'string' ?
                                v.replace(placeholder, function (match, path) { return lodash_get_1["default"](config, path, match); })
                                : v;
                        });
                    }
                    else {
                        for (var _f = 0, _g = Object.entries(secret); _f < _g.length; _f++) {
                            var _h = _g[_f], k_1 = _h[0], v = _h[1];
                            if (typeof v === 'string')
                                secret[k_1] = v.replace(placeholder, function (match, path) { return lodash_get_1["default"](config, path, match); });
                        }
                    }
            }
        }
    }
    return config;
}
exports.loadConfig = loadConfig;
/**
 * Replace, in place, all non string values of vars and secrets with their JSON encoding
 * @param config config root loaded via loadConfig()
 */
function toJSON(config) {
    if (config.vars)
        for (var _i = 0, _a = Object.entries(config.vars); _i < _a.length; _i++) {
            var _b = _a[_i], k = _b[0], v = _b[1];
            if (typeof v !== 'string')
                config.vars[k] = JSON.stringify(v);
        }
    if (config.secrets)
        for (var _c = 0, _d = Object.entries(config.secrets); _c < _d.length; _c++) {
            var _e = _d[_c], k = _e[0], v = _e[1];
            if (typeof v !== 'string')
                config.secrets[k] = JSON.stringify(v);
        }
}
exports.toJSON = toJSON;
