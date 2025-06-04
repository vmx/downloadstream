// Make service worker available quickly.
self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
})

const streams = new Map()

function createReadableStream(port) {
  return new ReadableStream({
    start(controller) {
      port.onmessage = (event) => {
        console.log('vmx: sw: within readable stream: received data:', event.data)
        if (event.data == 'close') {
          controller.close()
          return
        }
        if (event.data == 'abort') {
          controller.error("Download aborted.")
          return
        }

        // When a message is received, enqueue it into the stream
        controller.enqueue(event.data)
      }
      port.onmessageerror = () => {
        // Handle any errors
        controller.error('Error occurred while receiving message');
      }
    }
  })
}


self.addEventListener('message', (event) => {
  // The only message we get is when a new download is started. It contains the
  // pathname that we use as a unique identifier. A MessageChannel port is also
  // passed on, which is used to transmit the actual data of the stream.
  console.log('vmx: message from sw: event:', event)
  const pathname = event.data.pathname
  const port = event.ports[0]
  console.log('vmx: message from sw: pathname, port:', pathname, port)
  const stream = createReadableStream(port)
  streams.set(pathname, stream)
})

// The core of this service worker. Make sure the `Content-Disposition` header
// is set, so that there's a download file dialog.
self.addEventListener('fetch', (event) => {
  // The prefix that is be used for the non-existent URLs that are intercepted
  // here.
  const prefix = new URLSearchParams(self.location.search).get('prefix');
  const url = new URL(event.request.url)
  if (url.pathname.startsWith(`/${prefix}/`)) {
    console.log('vmx: sw: intercepting fetch: event:', event)

    const stream = streams.get(url.pathname)
    console.log('vmx: sw: intercepting fetch: stream:', stream)

    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment'
    })

    //const stream = 'abc'
    const response = new Response(stream, { headers })
    event.respondWith(response)
  }
})
