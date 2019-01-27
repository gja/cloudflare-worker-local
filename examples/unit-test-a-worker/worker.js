// Add any more global vars (like Request, Response) to the below list as they are used
/* global addEventListener fetch Response Headers */

addEventListener("fetch", e => {
  e.respondWith(fetchAndAddHeader(e.request));
});

async function fetchAndAddHeader(request) {
  const response = await fetch(request);

  const headers = new Headers(response.headers);
  
  if (response.status === 200) {
    headers.set("Foo", "Bar");
  } else {
    headers.set("Foo", "Not Bar");
  }

  return new Response(response.body, {
    headers: headers,
    status: response.status,
    statusText: response.statusText,
  });
}
