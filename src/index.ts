/**
 * TODO:
 *
 * Hapus service workser, gunakan URL.createObjectURL().
 *
 *
 */

const presentation = document.getElementById("presentation");

const stylesheet = document.styleSheets[0];
const btnTable = { isLeftHold: false, isRightHold: false };

interface SlideJs {
  main(): void;
}

interface SlideData {
  html: string;
  css: string;
  js: SlideJs;
}

class Extractor {
  constructor(private src: string) {}

  extractHtmlContent(): string | null {
    return this.src.match(/<Fragment>([\s\S]*?)<\/Fragment>/s)?.[1] ?? null;
  }

  extractStyleContent(): string | null {
    return this.src.match(/<style>([\s\S]*?)<\/style>/s)?.[1] ?? null;
  }

  extractJsContent(): string | null {
    return this.src.match(/<script>([\s\S]*?)<\/script>/s)?.[1] ?? null;
  }
}

class Slode extends EventTarget {
  slideIndex: number;
  constructor(public dom: HTMLElement, public slideData: SlideData) {
    super();
    this.slideIndex = getSlideNumber();
  }

  static async init(dom: HTMLElement) {
    const slideData = await getSlide(getSlideNumber());
    return new Slode(dom, slideData);
  }

  show() {
    this.dom.innerHTML = this.slideData.html;
    stylesheet.insertRule(this.slideData.css, stylesheet.cssRules.length);
    this.slideData.js.main();
  }
  setSlideIndex(index: number) {
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
    if (this.slideIndex <= 1) return;
    try {
      this.slideData = await getSlide(this.slideIndex - 1);
    } catch {
      return;
    }
    this.setSlideIndex(this.slideIndex - 1);

    this.show();
  }
}

async function getSlide(slide: number): Promise<SlideData> {
  await fetch(`/slides/${slide}.html`);
  const src = await fetch(`/slides/${slide}.html`).then((res) => res.text());
  const extractor = new Extractor(src);

  const js_url = URL.createObjectURL(
    new Blob([extractor.extractJsContent() ?? ""])
  );
  return {
    html: extractor.extractHtmlContent() ?? "",
    css: extractor.extractStyleContent() ?? "",
    js: (await import(js_url)) as SlideJs,
  };
}

function getSlideNumber() {
  const url = new URL(window.location.href);
  return parseInt(url.searchParams.get("page") || "1") || 1;
}

function registerPresentationEvent(slide: Slode) {
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
}

async function main() {
  if (!presentation) throw new Error("Presentation element not found");
  const slide = await Slode.init(presentation);
  registerPresentationEvent(slide);
  slide.show();
}

await main();
