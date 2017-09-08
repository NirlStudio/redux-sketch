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
    } else if (typeof action === 'function') {
      // an anonymous side-effecting action.
      payloads[name] = action
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
  sketching.actionPlan = plan(sketching.ActionTypes)

  // Actions: action creators
  sketching.Actions = sketching.actionPlan(payloads)
  return sketching
}

function createReducer (actionPlan, initValue, binding) {
  if (!binding) {
    return actionPlan.nop(initValue)
  }
  // try to find out bound actions
  var names = Object.getOwnPropertyNames(binding)
  var handlers = {}
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    if (typeof binding[name] === 'function') {
      handlers[name] = binding[name]
    }
  }
  return actionPlan.combine(handlers, initValue)
}

function createReducers (sketching, state) {
  var reducers = {}
  var keys = Object.getOwnPropertyNames(state)
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var substate = state[key]
    var initValue = null
    if (typeof substate === 'function') {
      // a customized state reducer.
      reducers[key] = substate
    } else if (!substate || typeof substate !== 'object') {
      // a constant state.
      initValue = typeof substate !== 'undefined' ? substate : null
      reducers[key] = sketching.actionPlan.nop(initValue)
    } else { // take as a descriptor object
      initValue = typeof substate.initialValue !== 'undefined'
        ? substate.initialValue : null
      if (typeof substate.reducer === 'function') {
        sketching[key] = substate
        reducers[key] = substate.reducer
      } else {
        reducers[key] = createReducer(sketching.actionPlan, initValue, substate)
      }
    }
    sketching.initialValue[key] = initValue
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
  var combinedState = Object.create(null)
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    combinedState[key] = states[key]
    initialValue[key] = states[key].initialValue
    reducers[key] = states[key].reducer
  }
  // assembly the new composite state.
  combinedState.initialValue = initialValue
  combinedState.reducer = redux.combineReducers(reducers)
  return combinedState
}

module.exports = sketch
