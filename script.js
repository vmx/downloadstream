import downloadStream from './downloadstream.js'

document.getElementsByTagName('button')[0].addEventListener('click', async (event) => {
  event.preventDefault()

  const outputStream = downloadStream('myfile.data').getWriter()

  let counter = 0
  const intervalID = window.setInterval(() => {
    console.log('sending a byte:', counter)
    const data = new Uint8Array([counter])
    outputStream.write(data)
    counter += 1
  }, 5000)
})
