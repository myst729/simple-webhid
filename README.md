# Simple WebHID

```js
const myHid = new SimpleWebHID()

const myDevice = myHid.requestDevice({
  filters: [{
    vendorId: 0xDE29,
    productId: 0x9A29,
  }]
})

myHid.onInputReport(myDevice, (data, reportId) => {
  console.log(data, reportId)
})

myHid.sendReport(myDevice, /*reportId*/ 0x7, /*data*/ Uint8Array.from([1, 2, 3, 4]))
```
