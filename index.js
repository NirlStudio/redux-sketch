'use strict'

var redux = require('redux')
var plan = require('redux-action-plan')

function createSketching (actions) {
  var sketching = Object.create(null)
  // Types: mapping of (action-name, action-type-value)
  sketching.ActionTypes = Object.create(null)
  var payloads = {}
  var names = Object.getOwnPropertyNames(actions)
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    var action = actions[name]
    if (typeof action === 'string') {
      sketching.ActionTypes[name] = action // no named payload
    } else if (action.length) { // might be a non-empty array
      sketching.ActionTypes[name] = action[0]
      if (action.length > 2) {
        // multiple named payload fields.
        payloads[name] = action.slice(1)
      } else if (action.length > 1) {
        // one payload descriptor, but it may be an array.
        payloads[name] = action[1]
      }
    }
  }

  // create the intermediate action plan
  sketching.actions = plan(sketching.ActionTypes)

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
    if (!substate) { // a constant state.
      sketching.initialValue[key] = null
      reducers[key] = sketching.actions.nop()
    } else if (typeof substate === 'function') {
      // a customized reducer is provided.
      sketching.initialValue[key] = null
      reducers[key] = substate
    } else if (
      typeof substate.initialValue !== 'undefined' &&
      typeof substate.reducer === 'function'
    ) { // a nested state object.
      sketching.initialValue[key] = substate.initialValue
      reducers[key] = substate.reducer
    } else { // take as a descriptor object
      var initValue = typeof substate.value === 'undefined' ? null : substate.value
      sketching.initialValue[key] = initValue
      reducers[key] = typeof substate.bind === 'function'
        ? substate.bind // a customized reducer
        : createReducer(sketching.actions, initValue, substate.bind)
    }
  }
  return reducers
}

function sketch (actions, state) {
  // create sketching of action types and action creators.
  var sketching = createSketching(actions)
  // initialValue
  sketching.initialValue = Object.create(null)
  // reducer
  var reducers = createReducers(sketching, state)
  // create final reducer
  sketching.reducer = redux.combineReducers(reducers)
  // remove action plan
  delete sketching.actions
  return sketching
}

sketch.actions = function (prefix, actions) {
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

sketch.combine = function (states) {
  // merge initial state and reducers
  var initialValue = Object.create(null)
  var reducers = {}
  var keys = Object.getOwnPropertyNames(states)
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    initialValue[key] = states[key].initialValue
    reducers[key] = states[key].reducer
  }
  // assembly a new composite state.
  var combinedState = Object.create(null)
  combinedState.States = states
  combinedState.initialValue = initialValue
  combinedState.reducer = redux.combineReducers(reducers)
  return combinedState
}

module.exports = sketch
