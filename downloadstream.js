// A prefix that will be used for the non-existent URLs that will trigger the
// download.
const PREFIX = '_download'


const registerServiceWorker = async () => {
  // Pass in the `prefix` as a query parameter, so that it doesn't need to be
  // hard-coded within the servie worker.
  const registration = await navigator.serviceWorker.register(`sw.js`)
}

registerServiceWorker()


const downloadStream = (filename, queuingStrategy) => {
  // Generate a URL that is unique that will be used to trigger the download.
  const uuid = crypto.randomUUID()
  const url = new URL(`${window.location.origin}/${PREFIX}/${uuid}/${filename}`)

  // Each download has a `MessageChannel` associate, which is the way to
  // transfer the data from a stream into the service worker, which will
  // make sure the output is streamed and not fully buffered in memory.
  const channel = new MessageChannel()

  // Setup the service worker to do the right thing for this pathname
  const pathname = url.pathname
  navigator.serviceWorker.controller.postMessage({ pathname }, [channel.port2])

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
      console.log('vmx: called close on writable stream')
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

export default downloadStream
