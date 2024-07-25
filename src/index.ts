/**
 * TODO:
 *
 * Jangan lakukan perubahan pada symbol yang di definisikan di global.css
 * Selesaikan ${Extractor.extractCssSymbol}
 */

const presentation = document.getElementById("presentation");

const stylesheet = document.styleSheets[0];
const btnTable = { isLeftHold: false, isRightHold: false };

interface SlideJs {
  main(): void;
}

interface SlideData {
  html: string;
  css: string[];
  js: SlideJs;
}

interface GlobalSymbol {
  ids: string[];
  classes: string[];
}

function getRandomString(length = 8) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

class HistoryState {
  constructor() {}
  static push(index: number) {
    window.history.pushState({}, "", `/?page=${index}`);
  }
}

class Extractor {
  prefix: string;
  constructor(private src: string, private symbols: GlobalSymbol) {
    this.prefix = getRandomString(6);
  }

  static extractCssSymbol(src: string): GlobalSymbol {
    const ids = src.match(/#([a-zA-Z0-9_-]+)/g);
    const classes = src.match(/\.([a-zA-Z0-9_-]+)/g);

    // let cssid = Array.from(ids);
    // let cssclass = Array.from(classes);
    console.log(ids, classes);
    return {
      classes: [],
      ids: [],
    };
  }

  extractHtmlContent(): string | null {
    return (
      this.src
        .match(/<Fragment>([\s\S]*?)<\/Fragment>/s)?.[1]
        .replace(/\b(id|class)="([^"]+)"/g, (_, attr, value) => {
          const newValue = (value as string)
            .split(" ")
            .map((v) => `${this.prefix}-${v}`)
            .join(" ");

          return `${attr}="${newValue}"`;
        }) ?? null
    );
  }

  extractStyleContent(): string[] | null {
    const style =
      this.src
        .match(/<style>([\s\S]*?)<\/style>/s)?.[1]
        .replace(/(#|\.)([a-zA-Z0-9_-]+)/g, (_, symbol, name) => {
          return `${symbol}${this.prefix}-${name}`;
        }) ?? "";

    if (style === "") return null;
    return style.split("}").map((v) => v + "}") ?? null;
  }

  extractJsContent(): string | null {
    return this.src.match(/<script>([\s\S]*?)<\/script>/s)?.[1] ?? null;
  }
}

class SlideResource {
  maxSlide: number | null;
  symbols: GlobalSymbol | null;
  constructor() {
    this.symbols = null;
    this.maxSlide = null;
  }
  async getSlide(slide: number): Promise<SlideData | null> {
    // If we know the max slide. Diretly return null
    if (this.maxSlide && slide > this.maxSlide) return null;
    /* TODO: any error will return null, for example, network disconnected, but there may still be a slide
      Handle other error
    */
    const src = await fetch(`/slides/${slide}.html`)
      .then((res) => {
        if (res.status == 404) return null;
        return res.text();
      })
      .catch(() => null);

    // Set max slide if we dont found the slide
    if (!src) {
      this.maxSlide = slide - 1;
      return null;
    }

    if (!this.symbols) {
      const global =
        (await fetch("/slides/global.css").then((res) => res.text())) || "";
      this.symbols = Extractor.extractCssSymbol(global);
    }

    const extractor = new Extractor(src, this.symbols);
    const jsBlob = new Blob([extractor.extractJsContent() ?? ""], {
      type: "text/javascript",
    });
    const jsUrl = URL.createObjectURL(jsBlob);
    return {
      html: extractor.extractHtmlContent() ?? "",
      css: extractor.extractStyleContent() ?? [],
      js: (await import(jsUrl)) as SlideJs,
    };
  }
}

class Slode extends EventTarget {
  slideIndex: number;
  private constructor(
    public dom: HTMLElement,
    public slideData: SlideData,
    public SlideResource: SlideResource
  ) {
    super();
    this.slideIndex = getSlideNumber();
  }

  static async init(dom: HTMLElement) {
    const resource = new SlideResource();
    let slideData = await resource.getSlide(getSlideNumber());
    if (!slideData) {
      slideData = await resource.getSlide(1);
      HistoryState.push(1);
      if (!slideData) throw new Error("Slide not found");
    }
    return new Slode(dom, slideData, resource);
  }

  show() {
    this.dom.innerHTML = this.slideData.html;
    for (const rule of this.slideData.css) {
      console.log(rule);
      stylesheet.insertRule(rule, stylesheet.cssRules.length);
    }
    this.slideData.js.main();
  }
  setSlideIndex(index: number) {
    this.slideIndex = index;
    HistoryState.push(index);
  }
  async next() {
    try {
      const slideData = await this.SlideResource.getSlide(this.slideIndex + 1);
      if (!slideData) return;
      this.slideData = slideData;
    } catch {
      return;
    }
    this.setSlideIndex(this.slideIndex + 1);

    this.show();
  }
  async prev() {
    if (this.slideIndex <= 1) return;
    try {
      const slideData = await this.SlideResource.getSlide(this.slideIndex - 1);
      if (!slideData) return;
      this.slideData = slideData;
    } catch {
      return;
    }
    this.setSlideIndex(this.slideIndex - 1);

    this.show();
  }
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
