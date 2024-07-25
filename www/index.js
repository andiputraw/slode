// src/index.ts
var getSlide = function(slide) {
  const html = fetch(`/slides/${slide}.html`).then((res) => res.text());
  const css = fetch(`/slides/${slide}.css`).then((res) => res.text());
  const js = import(`/slides/${slide}.js`).then((module) => module);
  return Promise.all([html, css, js]).then(([html2, css2, js2]) => ({
    html: html2,
    css: css2,
    js: js2
  }));
};
var getSlideNumber = function() {
  const url = new URL(window.location.href);
  return parseInt(url.searchParams.get("page") || "1") || 1;
};
var registerPresentationEvent = function(slide) {
  slide.dom.addEventListener("keydown", (ev) => {
    if (ev.code === "ArrowRight") {
      slide.next();
    } else if (ev.code === "ArrowLeft") {
      slide.prev();
    }
  });
  slide.dom.addEventListener("keyup", (ev) => {
    if (ev.code === "ArrowRight") {
      btnTable.isRightHold = false;
    } else if (ev.code === "ArrowLeft") {
      btnTable.isLeftHold = false;
    }
  });
};
async function main() {
  if (!presentation)
    throw new Error("Presentation element not found");
  const slide = await Slide.init(presentation);
  registerPresentationEvent(slide);
  slide.show();
}
var presentation = document.getElementById("presentation");
var stylesheet = document.styleSheets[0];
var btnTable = { isLeftHold: false, isRightHold: false };
if ("serviceWorker" in navigator) {
  try {
    const registration = await navigator.serviceWorker.register("/service_worker.js", { scope: "/" });
    if (registration.installing) {
      console.log("Service worker installing");
      window.location.reload();
    } else if (registration.waiting) {
      console.log("Service worker installed");
    } else if (registration.active) {
      console.log("Service worker active");
    }
  } catch (error) {
    console.error(`Registration failed with ${error}`);
  }
}

class Slide extends EventTarget {
  dom;
  slideData;
  slideIndex;
  constructor(dom, slideData) {
    super();
    this.dom = dom;
    this.slideData = slideData;
    this.slideIndex = getSlideNumber();
  }
  static async init(dom) {
    const slideData = await getSlide(getSlideNumber());
    return new Slide(dom, slideData);
  }
  show() {
    this.dom.innerHTML = this.slideData.html;
    stylesheet.insertRule(this.slideData.css, stylesheet.cssRules.length);
    this.slideData.js.main();
  }
  setSlideIndex(index) {
    this.slideIndex = index;
    const url = new URL(window.location.href);
    url.searchParams.set("page", index.toString());
    window.history.pushState({}, "", url);
  }
  async next() {
    try {
      this.slideData = await getSlide(this.slideIndex + 1);
    } catch {
      return;
    }
    this.setSlideIndex(this.slideIndex + 1);
    this.show();
  }
  async prev() {
    if (this.slideIndex <= 1)
      return;
    try {
      this.slideData = await getSlide(this.slideIndex - 1);
    } catch {
      return;
    }
    this.setSlideIndex(this.slideIndex - 1);
    this.show();
  }
}
await main();
