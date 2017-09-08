'use strict'

var redux = require('redux')
var plan = require('redux-action-plan')

function Sketching () {}
Sketching.prototype = Object.create(null)
Sketching.prototype.getState = function () {
  return this._sketchingState
}
Sketching.prototype.getParent = function () {
  return this._sketchingParent
}
Sketching.prototype.getRoot = function () {
  return this._sketchingParent ? this._sketchingParent.getRoot() : this
}
Sketching.prototype.getRootState = function () {
  return this.getRoot().getState()
}

function bindReducer (sketching, reducer) {
  sketching.reducer = function (state, action) {
    // save the whole, but maybe not a root, state.
    sketching._sketchingState = state
    // try to check the existence of a parent sketched state once.
    if (typeof sketching._sketchingParent === 'undefined') {
      sketching._sketchingParent = this instanceof Sketching &&
        this !== sketching ? this : null
    }
    return (sketching._sketchingState = reducer(state, action))
  }
}

function createSketching (actions) {
  var sketching = new Sketching()
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

function createReducer (sketching, initValue, binding) {
  if (!binding) {
    return sketching.actionPlan.nop(initValue)
  }
  // try to find out bound actions
  var names = Object.getOwnPropertyNames(binding)
  var handlers = {}
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    if (typeof binding[name] === 'function') {
      handlers[name] = binding[name].bind(sketching)
    }
  }
  return sketching.actionPlan.combine(handlers, initValue)
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
      reducers[key] = substate.bind(sketching)
    } else if (!substate || typeof substate !== 'object') {
      // a constant state.
      initValue = typeof substate !== 'undefined' ? substate : null
      reducers[key] = sketching.actionPlan.nop(initValue)
    } else { // take as a descriptor object
      initValue = typeof substate.initialValue !== 'undefined'
        ? substate.initialValue : null
      if (typeof substate.reducer === 'function') {
        sketching[key] = substate
        reducers[key] = substate.reducer.bind(sketching)
      } else {
        reducers[key] = createReducer(sketching, initValue, substate)
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
  bindReducer(sketching, redux.combineReducers(reducers))
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
  var sketching = new Sketching()
  var initialValue = Object.create(null)
  var reducers = {}
  var keys = Object.getOwnPropertyNames(states)
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var substate = states[key]
    if (typeof substate === 'function') {
      // accept a reducer to handle the sub-state.
      initialValue[key] = null
      reducers[key] = substate.bind(sketching)
    } else { // take as a nested sketch state.
      sketching[key] = substate
      initialValue[key] = typeof substate.initialValue !== 'undefined'
        ? substate.initialValue : null
      reducers[key] = substate.reducer
        ? substate.reducer.bind(sketching)
        : plan.nopReducer(initialValue[key])
    }
  }
  // assembly the new composite state.
  sketching.initialValue = initialValue
  bindReducer(sketching, redux.combineReducers(reducers))
  return sketching
}

module.exports = sketch
