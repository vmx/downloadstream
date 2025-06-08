Downloadstream
==============

Downloadstream is a library which enables downloads that are generated
client-sided within the browser. The resulting data doesn't need to be fully
kept in memory.

Use cases are on-the-fly transformations of large files or newly generated data
from within a browser.

This library is heavily inspired by [StreamSaver.js], thanks [@jimmywarting]!
My version is less versatile, less tested and probably less compatible with all
sorts of browsers. So if you look for a battle tested library, use
StreamSaver.js instead. I hope that my implementation is a bit simpler though.
The biggest difference is that it expects that your page is with a
[secure context], which is a viable thing in 2025.


Usage
-----

There is a single async function called `downloadStream()`, which returns a
Promise with a [WritableStream]. The input parameters are:

 - `filename`: the name that should be used for the download.
 - `queuingStrategy` (optional): [WritableStream] takes a [queuing strategy] as
    optional parameter. This one is the same and simply forwarded.


### Examples

The examples mentioned below can be found and run from the
[examples directory]. The easiest way is to run a HTTP server from the root of
this repository (e.g. `python -m http.server`) and navigate into the `examples`
directory.


### From ReadableStream

This example pipes a [ReadableStream] into a download.

```js
import { downloadStream } from `./downloadstream.js`

const response = await fetch('https://api.github.com/')
const inputStream = response.body
const outputStream = await downloadStream('github_api.json')
await inputStream.pipeTo(outputStream)
```


### Manually generate stream

This example outputs seven bytes into a file.

```js
import { downloadStream } from `./downloadstream.js`

const outputStream = (await downloadStream('myfile.data')).getWriter()

const data = new Uint8Array([1,2,3,4,5,6,7])
outputStream.write(data)
outputStream.close()
```


### Endless stream

This example keeps writing single bytes into a stream every 5s. You need to
cancel the download in order to stop it.

```js
import { downloadStream } from `./downloadstream.js`

const outputStream = (await downloadStream('myfile.data')).getWriter()

let counter = 0
const intervalID = window.setInterval(() => {
  console.log('sending a byte:', counter)
  const data = new Uint8Array([counter])
  outputStream.write(data)
  counter += 1
}, 5000)
```


How it works
------------

One would expect that it should be simple to save a [ReadableStream] to disk,
without buffering it fully in memory. Sadly this is only possible with Chromium
based browsers using [`showSaveFilePicker`] as of June 2025.

The workaround is to use a service worker that intercepts fake download URLs.

First step is installing a service worker which listens to all fetches. When
calling `downloadStream()` a URL that doesn't really exist is generated. It's
relative to the location of the service worker and has the shape:

    _downloadstream/<a-uuid>/<the-filename>

The `_downloadstream` prefix was choose so that you can easily debug things or
log anything related to those requests, the UUID makes sure there are no
clashes with actual files.

Then a stream gets associated with the URL. A link (a `<a href>`) is generated
with that URL, which then is "clicked" programmatically. That click requests
the file. This would result in a [HTTP 404 not found]. But the service worker
intercepts it and instead replies with the desired stream.


License
-------

This project is licensed under either of

 - Apache License, Version 2.0, ([LICENSE-APACHE] or https://www.apache.org/licenses/LICENSE-2.0)
 - MIT license ([LICENSE-MIT] or https://opensource.org/licenses/MIT)

at your option.

[StreamSaver.js]: https://github.com/jimmywarting/StreamSaver.js
[@jimmywarting]: https://github.com/jimmywarting
[secure context]: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
[examples directory]: ./examples/
[WritableStream]: https://developer.mozilla.org/en-US/docs/Web/API/WritableStream
[queuing strategy]: https://developer.mozilla.org/en-US/docs/Web/API/WritableStream/WritableStream#queuingstrategy
[ReadableStream]: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
[`showSaveFilePicker`]: https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
[HTTP 404 not found]: https://en.wikipedia.org/wiki/HTTP_404
[LICENSE-APACHE]: ./LICENSE-APACHE
[LICENSE-MIT]: ./LICENSE-MIT
