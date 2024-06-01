const createSocketService = () => {
  // 和服务端连接的socket对象
  let ws = null
  // 存储回调函数
  let callBackMapping = {}
  // 标识是否连接成功
  let connected = false
  // 记录重试发送的次数
  let sendRetryCount = 0
  // 重新连接尝试的次数
  let connectRetryCount = 0
  // 心跳包定时器
  let heartbeatTimer = null
  // 服务器响应定时器
  let serverTimeoutTimer = null
  // 心跳包发送间隔时间
  const HEARTBEAT_INTERVAL = 1000 * 15
  // 重连间隔时间
  const RETRY_INTERVAL = 150

  const connect = (url = 'ws://localhost:9998') => {
    if (!window.WebSocket) {
      console.log('您的浏览器不支持WebSocket')
      return
    }
    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('连接服务端成功了')
      connected = true
      connectRetryCount = 0
      startHeartbeat()
    }
    // 1.连接服务端失败
    // 2.当连接成功之后, 服务器关闭的情况
    ws.onclose = () => {
      console.log('连接服务端失败')
      connected = false
      stopHeartbeat()
      connectRetryCount++
      setTimeout(connect, RETRY_INTERVAL * connectRetryCount)
    }

    ws.onmessage = (msg) => {
      console.log('从服务端获取到了数据', msg)
      const recvData = JSON.parse(msg.data)
      const { socketType, action, data } = recvData
      const callback = callBackMapping[socketType]

      if (callback) {
        if (action === 'getData') {
          callback(JSON.parse(data))
        }
        if (action === 'fullScreen' || action === 'themeChange') {
          callback(recvData)
        }
      }
      if (action === 'heartbeat') {
        resetHeartbeat()
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket错误: ', error)
      stopHeartbeat()
    }
  }
  // 注册回调函数
  const registerCallBack = (socketType, callBack) => {
    callBackMapping = { ...callBackMapping, [socketType]: callBack }
  }
  // 销毁回调函数
  const unRegisterCallBack = (socketType) => {
    const { [socketType]: _, ...rest } = callBackMapping
    callBackMapping = rest
  }
  // 发送消息
  const send = (data) => {
    if (connected) {
      sendRetryCount = 0
      ws.send(JSON.stringify(data))
    } else {
      sendRetryCount++
      setTimeout(() => send(data), RETRY_INTERVAL * sendRetryCount)
    }
  }

  // 心跳机制
  const startHeartbeat = () => {
    heartbeatTimer = setInterval(() => {
      if (connected) {
        ws.send(JSON.stringify({ action: 'heartbeat', type: 'client' }))
        serverTimeoutTimer = setTimeout(() => {
          console.warn('心跳包未收到响应，正在尝试重新连接')
          ws.close()
        }, HEARTBEAT_INTERVAL)
      }
    }, HEARTBEAT_INTERVAL)
  }

  // 如果收到心跳响应，则重置定时器
  const resetHeartbeat = () => {
    if (serverTimeoutTimer) {
      clearTimeout(serverTimeoutTimer)
      serverTimeoutTimer = null
    }
  }
  // 关闭心跳机制
  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (serverTimeoutTimer) {
      clearTimeout(serverTimeoutTimer)
      serverTimeoutTimer = null
    }
  }

  return {
    connect,
    registerCallBack,
    unRegisterCallBack,
    send
  }
}

const SocketService = (() => {
  let instance
  return {
    getInstance: () => {
      if (!instance) {
        instance = createSocketService()
      }
      return instance
    }
  }
})()

export default SocketService

// export default class SocketService {
//   /**
//    * 单例
//    */
//   static instance = null
//   static get Instance() {
//     if (!this.instance) {
//       this.instance = new SocketService()
//     }
//     return this.instance
//   }

//   // 和服务端连接的socket对象
//   ws = null

//   // 存储回调函数
//   callBackMapping = {}

//   // 标识是否连接成功
//   connected = false

//   // 记录重试发送的次数
//   sendRetryCount = 0

//   // 重新连接尝试的次数
//   connectRetryCount = 0

//   //  定义连接服务器的方法
//   connect() {
//     // 连接服务器
//     if (!window.WebSocket) {
//       return console.log('您的浏览器不支持WebSocket')
//     }
//     this.ws = new WebSocket('ws://localhost:9998')

//     // 连接成功的事件
//     this.ws.onopen = () => {
//       console.log('连接服务端成功了')
//       this.connected = true
//       // 重置重新连接的次数
//       this.connectRetryCount = 0
//     }
//     // 1.连接服务端失败
//     // 2.当连接成功之后, 服务器关闭的情况
//     this.ws.onclose = () => {
//       console.log('连接服务端失败')
//       this.connected = false
//       this.connectRetryCount++
//       setTimeout(() => {
//         this.connect()
//       }, 500 * this.connectRetryCount)
//     }
//     // 得到服务端发送过来的数据
//     this.ws.onmessage = msg => {
//       console.log('从服务端获取到了数据')
//       // 真正服务端发送过来的原始数据时在msg中的data字段
//       // console.log(msg.data)
//       const recvData = JSON.parse(msg.data)
//       const socketType = recvData.socketType
//       // 判断回调函数是否存在
//       if (this.callBackMapping[socketType]) {
//         const action = recvData.action
//         if (action === 'getData') { // 如果是获取数据的请求
//           const realData = JSON.parse(recvData.data)
//           this.callBackMapping[socketType].call(this, realData)
//         } else if (action === 'fullScreen') { // 全屏
//           this.callBackMapping[socketType].call(this, recvData)
//         } else if (action === 'themeChange') { // 主题切换
//           this.callBackMapping[socketType].call(this, recvData)
//         }
//       }
//     }
//   }

//   // 回调函数的注册
//   registerCallBack (socketType, callBack) {
//     this.callBackMapping[socketType] = callBack
//   }

//   // 取消某一个回调函数
//   unRegisterCallBack (socketType) {
//     this.callBackMapping[socketType] = null
//   }

//   // 发送数据的方法
//   send (data) {
//     // 判断此时此刻有没有连接成功
//     if (this.connected) {
//       this.sendRetryCount = 0
//       this.ws.send(JSON.stringify(data))
//     } else {
//       this.sendRetryCount++
//       setTimeout(() => {
//         this.send(data)
//       }, this.sendRetryCount * 150)
//     }
//   }
// }
