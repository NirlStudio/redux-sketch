'use strict'
var redux = require('redux')
var plan = require('redux-action-plan')

function createSketching (types) {
  var sketching = Object.create(null)
  // Types: mapping of (action-name, action-type-value)
  sketching.Types = Object.create(null)
  var payloads = {}
  var names = Object.getOwnPropertyNames(types)
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    var type = types[name]
    if (typeof type === 'string') {
      sketching.Types[name] = type // no named payload
    } else if (type.length) {
      sketching.Types[name] = type[0]
      if (type.length > 2) {
        // multiple named payload fields.
        payloads[name] = type.slice(1)
      } else if (type.length > 1) {
        // one payload descriptor, but it may be an array.
        payloads[name] = type[1]
      }
    }
  }

  // create the intermediate action plan
  sketching.actions = plan(sketching.Types)

  // Actions: action creators
  sketching.Actions = sketching.actions(payloads)
  return sketching
}

function createReducer (actions, initValue, binding) {
  if (!binding) {
    return actions.nop(initValue)
  } else if (binding.length) { // an array of action name(s) and a handler
    var last = binding.length - 1
    return typeof binding[last] === 'function'
      ? actions.bind(binding.slice(0, last), binding[last], initValue)
      : actions.bind(binding, null, initValue)
  } else { // a map object of action-name to its handler
    return actions.combine(binding, initValue)
  }
}

function createReducers (sketching, state) {
  var reducers = {}
  var keys = Object.getOwnPropertyNames(state)
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var substate = state[key]
    if (!substate) {
      sketching.initialState[key] = null
      reducers[key] = sketching.actions.nop()
    } else {
      var initValue = typeof substate.value === 'undefined' ? null : substate.value
      sketching.initialState[key] = initValue
      reducers[key] = typeof substate.bind === 'function'
        ? substate.bind // a customized reducer
        : createReducer(sketching.actions, initValue, substate.bind)
    }
  }
  return reducers
}

function sketch (types, state) {
  // create sketching of action types and action creators.
  var sketching = createSketching(types)
  // initialState
  sketching.initialState = Object.create(null)
  // reducer
  var reducers = createReducers(sketching, state)
  // create final reducer
  sketching.reducer = redux.combineReducers(reducers)
  // remove action plan
  delete sketching.actions
  return sketching
}

sketch.types = function (prefix, actions) {
  var names
  if (actions.length) {
    names = actions
    actions = Object.create(null)
  } else {
    names = Object.getOwnPropertyNames(actions)
  }
  var types = Object.create(null)
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    types[name] = [(prefix || '') + '/' + name]
    if (actions[name]) {
      types[name].push(actions[name])
    }
  }
  return types
}

module.exports = sketch
