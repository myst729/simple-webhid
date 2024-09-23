enum HIDEventType {
  connect = 'connect',
  disconnect = 'disconnect',
  inputreport = 'inputreport',
}

interface SimpleWebHIDInit {
  autoRequest?: boolean,
  filters?: HIDDeviceFilter[],
}

type ReportData =
  | ArrayBuffer
  | DataView
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array

type HIDConnectionCallback = (device: HIDDevice, event?: HIDConnectionEvent) => any
type HIDInputReportCallback = (data: DataView, reportId?: number, device?: HIDDevice, event?: HIDInputReportEvent) => any

class SimpleWebHID {
  hid: HID = navigator.hid
  cachedDevices: HIDDevice[] = []
  connectCallbacks: HIDConnectionCallback[] = []
  disconnectCallbacks: HIDConnectionCallback[] = []
  inputreportCallbacks = new Map<HIDDevice, HIDInputReportCallback[]>()

  constructor(config: SimpleWebHIDInit = { autoRequest: false, filters: [] }) {
    if (this.hid) {
      this.init(config)
    } else {
      console.error('Navigator.hid is not available in your browser')
    }
  }

  async init(config: SimpleWebHIDInit = {autoRequest: false, filters: []}) {
    this.hid.addEventListener(HIDEventType.connect, (ev: HIDConnectionEvent) => {
      this.connectCallbacks.forEach(cb => cb(ev.device, ev))
    })

    this.hid.addEventListener(HIDEventType.disconnect, (ev: HIDConnectionEvent) => {
      this.disconnectCallbacks.forEach(cb => cb(ev.device, ev))
    })

    if (config.autoRequest) {
      await this.requestDevice(config.filters)
    }
  }

  async requestDevice(filters: HIDDeviceFilter[] = []): Promise<HIDDevice | null> {
    try {
      const [device] = await this.hid.requestDevice({ filters })
      await this.openDevice(device)
      return device
    } catch (error) {
      console.error('request device error', error)
      return null
    }
  }

  async getDevices(filters: HIDDeviceFilter[] = []): Promise<HIDDevice[]> {
    if (!this.cachedDevices.length) {
      await this.requestDevice(filters)
    }
    try {
      return await this.hid.getDevices()
    } catch (error) {
      console.error('get devices error', error)
      return []
    }
  }

  async openDevice(device: HIDDevice) {
    try {
      await device.open()
      if (!device.opened) {
        console.error('open device failed')
        return
      }
      if (!this.cachedDevices.includes(device)) {
        this.cachedDevices.push(device)
      }
      device.addEventListener('inputreport', (ev: HIDInputReportEvent) => {
        const { data, reportId, device } = ev
        const callbacks = this.inputreportCallbacks.get(device) || []
        callbacks.forEach(cb => cb(data, reportId, device, ev))
      })
    } catch (error) {
      console.error('open device error')
    }
  }

  async closeDevice(device: HIDDevice) {
    try {
      await device.close()
      if (!device.opened) {
        this.removeCachedDevices(device)
      }
    } catch (error) {
      console.error('close device error')
    }
  }

  async forgetDevice(device: HIDDevice) {
    try {
      await device.forget()
      if (!device.opened) {
        this.removeCachedDevices(device)
      }
    } catch (error) {
      console.error('forget device error')
    }
  }

  removeCachedDevices(device: HIDDevice) {
    const i = this.cachedDevices.indexOf(device)
    if (i > -1) {
      this.cachedDevices.splice(i, 1)
    }
  }

  onConncect(cb: HIDConnectionCallback) {
    this.connectCallbacks.push(cb)
  }

  onDisconncect(cb: HIDConnectionCallback) {
    this.connectCallbacks.push(cb)
  }

  onInputReport(device: HIDDevice, callback: HIDInputReportCallback) {
    if (this.cachedDevices.includes(device)) {
      const callbacks = this.inputreportCallbacks.get(device) || []
      this.inputreportCallbacks.set(device, [...callbacks, callback])
    }
  }

  async sendReport(device: HIDDevice, reportId: number, data: ReportData) {
    try {
      if (device.opened) {
        await device.sendReport(reportId, data)
      }
    } catch (error) {
      console.error('send report error', error)
    }
  }

  async sendFeatureReport(device: HIDDevice, reportId: number, data: ReportData) {
    try {
      if (device.opened) {
        await device.sendFeatureReport(reportId, data)
      }
    } catch (error) {
      console.error('send feature report error', error)
    }
  }

  async receiveFeatureReport(device: HIDDevice, reportId: number): Promise<DataView | undefined> {
    try {
      if (device.opened) {
        const data = await device.receiveFeatureReport(reportId)
        return data
      }
    } catch (error) {
      console.error('receive feature report error', error)
    }
  }
}
