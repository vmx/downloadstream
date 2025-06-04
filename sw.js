// Make service worker available quickly.
self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
})

const streams = new Map()

const createReadableStream = (port) => {
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
        controller.error('Error occurred while receiving message.')
      }
    },
    cancel(reason) {
      console.log('vmx: sw: within readable stream: stop it3')
      // When the stream is closed, send a message to the originator, so that
      // things can be cleaned up. Also close the port so that we don't
      // continue to accept data, even if it's sent.
      port.postMessage('abort')
      port.close()
    }
  })
}


self.addEventListener('message', (event) => {
  console.log('vmx: message from sw: event:', event)
  // When a port is supplied, it means that a new download should be started.
  // All other messages are ignored, they are only sent to keep the service
  // worker alive
  if (event.ports.length == 1) {
    const port = event.ports[0]
    const pathname = event.data.pathname
    console.log('vmx: message from sw: pathname, port:', pathname, port)
    const stream = createReadableStream(port)
    streams.set(pathname, stream)
  }
})

// The core of this service worker. Make sure the `Content-Disposition` header
// is set, so that there's a download file dialog.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  console.log('vmx: sw: intercepting fetch: event:', event)

  const stream = streams.get(url.pathname)

  // Do a normal fetch if it's a URL that isn't supposed to be a streaming
  // download.
  if (stream === undefined) {
    return
  }

  console.log('vmx: sw: intercepting fetch: stream:', stream)

  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment'
  })

  const response = new Response(stream, { headers })
  event.respondWith(response)
})
