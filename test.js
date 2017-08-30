var assert = require('assert')
var sketch = require('./index')

describe('sketch: default exports', function () {
  var handler = function (state) { return state }
  var state = sketch({
    action1: 'Prefix/action1',
    action2: 'Prefix/action2'
  }, {
    STATE: null,
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
    }
  })
  it('should return a state descriptor', function () {
    assert.equal(typeof state, 'object', 'state is not an object')
    assert.equal(typeof state.initialState, 'object', 'initialState is missing')
    assert.equal(typeof state.Types, 'object', 'Types is missing')
    assert.equal(typeof state.Actions, 'object', 'Actions is missing')
    assert.equal(typeof state.reducer, 'function', 'reducer is missing')
  })
})

describe('sketch.types', function () {
  it('should generate a type definition object for an action name list.', function () {
    var types = sketch.types('Prefix', ['action1', 'action2'])
    assert.equal(typeof types, 'object')
  })
  it('should generate a type definition object for an action definition object.', function () {
    var types = sketch.types('Prefix', {
      action1: null,
      action2: 'payload',
      action3: ['payload'],
      action4: ['payload1', 'payload2']
    })
    assert.equal(typeof types, 'object')
  })
})
