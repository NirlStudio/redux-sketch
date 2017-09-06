'use strict'

var assert = require('assert')
var sketch = require('./index')

var reducer = function (state, action) { return state }
var handler = function (state, action) { return state }

describe('sketch: default exports', function () {
  var state = sketch({
    action1: 'Prefix/action1',
    action2: ['Prefix/action2'],
    action3: ['Prefix/action3', 'payload'],
    action4: ['Prefix/action4', ['payload']],
    action5: ['Prefix/action5', ['payload1', 'payload2']],
    action6: function () {
      return function (dispatch) {
        return new Promise(function (resolve) {})
      }
    }
  }, {
    CONST: null,
    STATE: reducer,
    state0: {
      value: 'initial-state1'
    },
    state1: {
      value: 'initial-state1',
      bind: handler
    },
    state2: {
      value: 'initial-state2',
      bind: ['action1', 'action2', handler]
    },
    state3: {
      value: 'initial-state3',
      bind: {
        action1: handler,
        action2: handler
      }
    },
    state4: {
      value: 'initial-state4',
      reducer: handler
    }
  })
  it('should return a state descriptor', function () {
    assert.equal(typeof state, 'object', 'state is not an object')
    assert.equal(typeof state.initialValue, 'object', 'initialValue is missing')
    assert.equal(typeof state.ActionTypes, 'object', 'ActionTypes is missing')
    assert.equal(typeof state.Actions, 'object', 'Actions is missing')
    assert.equal(typeof state.Actions.action6, 'function', 'side-effecting action is missing')
    assert.equal(typeof state.reducer, 'function', 'reducer is missing')
  })
})

describe('sketch.actions', function () {
  it('should generate a type definition object for an action name list.', function () {
    var actions = sketch.actions('Prefix', ['action1', 'action2'])
    assert.equal(typeof actions, 'object')
  })
  it('should generate a type definition object for an action definition object.', function () {
    var types = sketch.actions('Prefix', {
      action1: null,
      action2: 'payload',
      action3: ['payload'],
      action4: ['payload1', 'payload2']
    })
    assert.equal(typeof types, 'object')
  })
})

describe('sketch.combine', function () {
  it('should generate a combined state object from one or more substates.', function () {
    var state1 = sketch({
      action1: 'state1/action1',
      action2: 'state1/action2'
    }, {
      state1: {
        value: 'initial-state1',
        bind: handler
      },
      state2: {
        value: 'initial-state2',
        bind: ['action1', 'action2', handler]
      }
    })
    var state2 = sketch({
      action1: 'state2/action1',
      action2: 'state2/action2'
    }, {
      state1: {
        value: 'initial-state1',
        bind: handler
      },
      state2: {
        value: 'initial-state2',
        bind: ['action1', 'action2', handler]
      }
    })
    var state = sketch.combine({
      state1: state1,
      state2: state2
    })
    assert.equal(typeof state, 'object', 'state is not an object')
    assert.equal(typeof state.States, 'object', 'initialValue is invalid')
    assert.equal(state.States.state1, state1, 'sub-state1 is invalid')
    assert.equal(state.States.state2, state2, 'sub-state2 is invalid')
    assert.equal(typeof state.initialValue, 'object', 'initialValue is invalid')
    assert.equal(typeof state.reducer, 'function', 'reducer is invalid')
  })
})
