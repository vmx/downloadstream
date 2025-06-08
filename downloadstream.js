// A prefix that will be used for the non-existent URLs that will trigger the
// download.
const PREFIX = '_downloadstream'

// Returns the base directory (path without the filename at the end) of the
// current script. It's without a trailing slash.
const basedir = () => {
  const pathname = new URL(import.meta.url).pathname
  return pathname.substring(0, pathname.lastIndexOf('/'))
}

const registerServiceWorker = async () => {
  const base = basedir()
  await navigator.serviceWorker.register(`${base}/sw.js`)
}

registerServiceWorker()

const downloadStream = async (filename, queuingStrategy) => {
  // Generate a URL that is unique that will be used to trigger the download.
  // It's relative to the service worker.
  const uuid = crypto.randomUUID()
  const base = basedir()
  const pathname = `${base}/${PREFIX}/${uuid}/${filename}`

  // The service worker might reside in a sub-directory.
  const registration = await navigator.serviceWorker.getRegistration(
      `${base}/`)

  // Each download has a `MessageChannel` associate, which is the way to
  // transfer the data from a stream into the service worker, which will
  // make sure the output is streamed and not fully buffered in memory.
  const channel = new MessageChannel()

  // Setup the service worker to do the right thing for this pathname
  registration.active.postMessage({ pathname }, [channel.port2])

  let ping
  const writableStream = new WritableStream({
    start(controller) {
      // Send a ping every 10s to keep the worker alive as long as the download
      // is happening.
      ping = window.setInterval(() => {
        navigator.serviceWorker.controller.postMessage('ping')
      }, 10000)

      // Trigger the download with simulating a click on the link.
      const link = document.createElement('a')
      link.setAttribute('href', pathname)
      link.setAttribute('download', '');
      link.click();
    },
    write(chunk, controller) {
      // Make the data available to the service worker which then writes the
      // data.
      channel.port1.postMessage(chunk)
    },
    close(controller) {
      channel.port1.postMessage('close')
      window.clearInterval(ping)
    },
    abort(reason) {
      channel.port1.postMessage('abort')
      window.clearInterval(ping)
    },
  },
  queuingStrategy)

  // Whenever we get a message from the service worker, it means that we should
  // abort the stream.
  channel.port1.onmessage = (message) => {
    window.clearInterval(ping)
  }

  return writableStream
}

export { downloadStream }
