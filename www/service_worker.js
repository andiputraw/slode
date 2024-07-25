// src/service_worker.ts
var extractHtmlContent = function(content) {
  return content.match(/<Fragment>([\s\S]*?)<\/Fragment>/s)?.[1] ?? null;
};
var extractStyleContent = function(content) {
  return content.match(/<style>([\s\S]*?)<\/style>/s)?.[1] ?? null;
};
var extractJsContent = function(content) {
  return content.match(/<script>([\s\S]*?)<\/script>/s)?.[1] ?? null;
};
var toResponse = function(body, contentType) {
  if (!body)
    return new Response(null, { status: 404, statusText: "not ok" });
  return new Response(body, {
    status: 200,
    statusText: "ok",
    headers: { "Content-Type": contentType }
  });
};
var getSlides = function(file, request) {
  const [fileName, type] = file.split(".");
  const htmlReq = new Request(request.url.replace(`/slides/${file}`, `/slides/${fileName}.html`));
  console.log(htmlReq);
  return fetch(htmlReq).then((res) => res.text()).then((text) => {
    switch (type) {
      case "html": {
        return toResponse(extractHtmlContent(text), "text/html");
      }
      case "css": {
        return toResponse(extractStyleContent(text), "text/css");
      }
      case "js": {
        return toResponse(extractJsContent(text), "text/javascript");
      }
      default: {
        return new Response("File not found", {
          status: 404,
          statusText: "not ok"
        });
      }
    }
  });
};
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url).pathname.split("/");
  console.log(url);
  if (url.length > 2 && url[1] == "slides") {
    event.respondWith(getSlides(url[2], event.request));
  } else {
    event.respondWith(fetch(event.request));
  }
});
