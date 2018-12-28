addEventListener("fetch", e => {
  e.respondWith(fetchAndAddHeader(e.request));
});

async function fetchAndAddHeader(request) {
  const response = await fetch(request);

  if (response.status === 200) {
    response.headers.set("Foo", "Bar");
  } else {
    response.headers.set("Foo", "Not Bar");
  }

  return response;
}
