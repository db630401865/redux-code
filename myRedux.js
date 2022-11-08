// enhancer 对 createStore 功能进行增加
// createStore(reducer, preloadedState, enhancer)
// 返回 3 个方法 { getStage, dispatch, subscribe }
// redux 的中间件就是通过 enhancer 演变出来的
// enhancer 就等于增强 dispatch 属性，支持异步
function createStore(reducer, preloadedState, enhancer) {
  // 约束 reducer 参数类型
  if (typeof reducer !== 'function') {
    throw new Error('reducer必须是函数')
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('enhancer必须是函数')
    }
    return enhancer(createStore)(reducer, preloadedState)
  }
  // store 对象中存储的状态
  var currentState = preloadedState
  // 存放订阅者函数
  var currentListeners = []
  // 获取状态
  function getState() {
    return currentState
  }
  // 触发 action
  function dispatch(action) {
    // 判断 action 是否是对象
    if (!isPlainObject(action)) {
      throw new Error('action必须是对象')
    }
    // 判断对象中是否具有 type 对象
    if (typeof action.type === 'undefined') {
      throw new Error('action对象中必须要有 type 属性')
    }
    currentState = reducer(currentState, action)
    // 循环数组 调用订阅者
    for (let i = 0; i < currentListeners.length; i++) {
      // 获取订阅者
      var listener = currentListeners[i]
      // 调用订阅者
      listener()
    }
  }
  // 订阅 store 状态
  function subscribe(listener) {
    currentListeners.push(listener)
  }

  return {
    getState,
    dispatch,
    subscribe
  }
}

// 判断 obj 参数是否是对象
function isPlainObject(obj) {
  // 排除基本数据类型和null
  if (typeof obj !== 'object' || obj === null) {
    return false
  }
  // 区分数组和对象，原型对象对比的方式
  var proto = obj

  while (Object.getPrototypeOf(proto) != null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}

function applyMiddleware(...middlewares) {
  return function (createStore) {
    return function (reducer, preloadedState) {
      // 创建 sorte
      var store = createStore(reducer, preloadedState)
      // 阉割版的 store
      var middlewareApi = {
        getState: store.getState,
        dispatch: store.dispatch
      }

      // 调用中间件的第一层函数，传递阉割版的 store 对象
      let chain = middlewares.map((middleware) => middleware(middlewareApi))
      // 给第一层函数传递参数
      var dispatch = compose(...chain)(store.dispatch)
      // 此时第一个中间件给了 store ，在调用中间件函数就是调用 logger 了，而在 logger 中去调用 thunk, 在 thunk 中调用原始的 dispatch, 进入 reducer
      return {
        ...store,
        dispatch
      }
    }
  }
}

function compose() {
  var funs = [...arguments]
  return function (dispatch) {
    // 调用第二层函数通过倒叙，先调用 thunk,再调用 logger
    for (let i = funs.length - 1; i >= 0; i--) {
      dispatch = funs[i](dispatch)
    }
    // 因为是倒叙循环，所以返回出去的就是第一个logger，的内部函数
    // 第一个中间件函数
    return dispatch
  }
}

function bindActionCreators(actionCreators, dispatch) {
  var boundActionCreators = {}
  for (const key in actionCreators) {
    // 使用函数自调用储存 key 值
    ;(function (key) {
      boundActionCreators[key] = function (params) {
        dispatch(actionCreators[key]())
      }
    })(key)
  }
  return boundActionCreators
}

function combinReducers(reducers) {
  // 检查 reducer 类型，必须是函数
  var reducerKeys = Object.keys(reducers)
  for (let i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i]
    if (typeof reducers[key] !== 'function') {
      throw new Error('redurce必须是函数')
    }
  }
  // 调用一个一个的小的 reudcer 将每一个小的 reducer 中返回的状态储存在一个新的大的对象中
  return function (state, action) {
    var nextState = {}
    for (var i = 0; i < reducerKeys.length; i++) {
      var key = reducerKeys[i]
      var reducer = reducers[key]
      var previousStateForKey = state[key]
      nextState[key] = reducer(previousStateForKey, action)
    }
    return nextState
  }
}
