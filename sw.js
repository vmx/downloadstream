// Make service worker available quickly.
self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// The current streams. The key is the pathname, the value is the
// `ReadableStream`.
const streams = new Map()

const createReadableStream = (port) => {
  return new ReadableStream({
    start(controller) {
      port.onmessage = (event) => {
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
      // When the stream is closed, send a message to the originator, so that
      // things can be cleaned up. Also close the port so that we don't
      // continue to accept data, even if it's sent.
      port.postMessage('abort')
      port.close()
    }
  })
}

self.addEventListener('message', (event) => {
  // When a port is supplied, it means that a new download should be started.
  // All other messages are ignored, they are only sent to keep the service
  // worker alive.
  if (event.ports.length == 1) {
    const port = event.ports[0]
    const pathname = event.data.pathname
    const stream = createReadableStream(port)
    streams.set(pathname, stream)
  }
})

// The core of this service worker. Make sure the `Content-Disposition` header
// is set, so that there's a download file dialog.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  const stream = streams.get(url.pathname)

  // Do a normal fetch if it's a URL that isn't supposed to be a streaming
  // download.
  if (stream === undefined) {
    return
  }


  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment'
  })

  const response = new Response(stream, { headers })
  event.respondWith(response)
})
