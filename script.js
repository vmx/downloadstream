// A prefix that will be used for the non-existent URLs that will trigger the
// download.
const PREFIX = '_download'


const registerServiceWorker = async () => {
  // Pass in the `prefix` as a query parameter, so that it doesn't need to be
  // hard-coded within the servie worker.
  const registration = await navigator.serviceWorker.register(`sw.js?prefix=${PREFIX}`)
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


  const writableStream = new WritableStream({
    start(controller) {
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
    },
    abort(reason) {
      channel.port1.postMessage('abort')
    },
  },
  queuingStrategy)

  return writableStream
}

document.getElementsByTagName('button')[0].addEventListener('click', async (event) => {
  event.preventDefault()

  const outputStream = downloadStream('myfile.data').getWriter()

  //const data = new Uint8Array([1,2,3,4,5,6,7])
  //outputStream.write(data)
  //outputStream.close()

  let counter = 0
  const intervalID = window.setInterval(() => {
    console.log('sending a byte:', counter)
    const data = new Uint8Array([counter])
    outputStream.write(data)
  }, 5000)
})
