'use strict';

const os = require('os');
const vscode = require('vscode');
const crypto = require('crypto');
const {Logger} = require('kite-installer');
const kitePkg = require('../package.json');
const localconfig = require('./localconfig.js');
const {metricsCounterPath} = require('./urls');
const Segment = require('analytics-node');

const OS_VERSION = os.type() + ' ' + os.release();

const EDITOR_UUID = vscode.env.machineId;

const ANALYTICS = new Segment(
  process.env.NODE_ENV === 'development'
  ? 'tlsFlkyXKAyTtbIYMsx8slXJxDQv8Izn'
  : 'qVSY2vJjokB4bKys6A8ypGQZUTQoXFop');

let Kite;

// Generate a unique ID for this user and save it for future use.
function distinctID() {
  var id = localconfig.get('distinctID');
  if (id === undefined) {
    // use the atom UUID
    id = EDITOR_UUID || crypto.randomBytes(32).toString('hex');
    localconfig.set('distinctID', id);
  }
  return id;
}

function sendFeatureMetric(name) {
  if (!Kite) { Kite = require('./kite'); }
  const path = metricsCounterPath();

  Logger.debug('feature metric:', name);

  return Kite.request({
    path,
    method: 'POST',
  }, JSON.stringify({
    name,
    value: 1,
  }));
}

function featureRequested(name) {
  sendFeatureMetric(`atom_${name}_requested`);
}

function featureFulfilled(name) {
  sendFeatureMetric(`atom_${name}_fulfilled`);
}

function track(event, properties = {}) {
  const e = {
    event,
    userId: '0',
    properties
  };
  
  Logger.debug('segment:', e);
  
  if (process.env.NODE_ENV !== 'test') { ANALYTICS.track(e); }
}

function trackHealth(value) {
  track('kited_health', {
    user_id: distinctID(),
    sent_at: Math.floor(new Date().getTime() / 1000),
    source: 'vscode',
    os_name: getOsName(),
    plugin_version: kitePkg.version,
    value,
  });
}

function getOsName() {
  switch (os.platform()) {
    case 'darwin': return 'macos';
    case 'win32': return 'windows';
    default: return '';
  }
}

module.exports = {
  distinctID,
  EDITOR_UUID,
  OS_VERSION,
  featureRequested,
  featureFulfilled,
  track: trackHealth,
};
