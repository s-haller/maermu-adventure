import { loadImage, loadSprites } from "./assets";
import { chapters, type Chapter } from "./story/chapters";
import { endings, notebookPages, runScript } from "./story/play";
import { carriedItem } from "./story/items";
import { letter } from "./story/letter";
import { Player } from "./player";
import { getScene } from "./scenes";
import type { Action, Hotspot, Scene, Verb } from "./types";
import { commandLine, DEFAULT_QUIPS } from "./verbs";

const VIEW_W = 640;
const VIEW_H = 360;
const DRAG_SLOP = 6;

type ItemDrag = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
};

export type GameUi = {
  game: HTMLElement;
  layout: HTMLElement;
  canvas: HTMLCanvasElement;
  sentence: HTMLElement;
  pack: HTMLElement;
  letterItem: HTMLButtonElement;
  letterIcon: HTMLImageElement;
  letterLayer: HTMLElement;
  letterHeading: HTMLElement;
  letterBody: HTMLElement;
  letterClose: HTMLButtonElement;
  menu: HTMLElement;
  chapters: HTMLElement;
  continueChapter: HTMLButtonElement;
  toMenu: HTMLButtonElement;
};

export class Game {
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private scene: Scene = getScene("interior");
  private background: CanvasImageSource | null = null;
  private backgrounds = new Map<string, CanvasImageSource>();
  private hover: Hotspot | null = null;
  private hoverText = "";
  private message = "";
  private pinMessage = false;
  private pinAt = 0;
  private pinX = 0;
  private pinY = 0;
  private pointerX = 0;
  private pointerY = 0;
  private hasLetter = false;
  private inventory: string[] = [];
  private drag: ItemDrag | null = null;
  private flags = new Set<string>();
  private switches: string[] = [];
  private reader: "letter" | "notebook" | "ending" | null = null;
  private visited = new Set<string>();
  private debug = false;
  private shade = 0;
  private shading: "out" | "in" | "hold" | null = null;
  private pending: (() => void) | null = null;
  private letterOpen = false;
  private onMenu = true;
  private startingChapter = false;
  private chapter: Chapter | null = null;
  private savedMessage = "";
  private idle = 0;
  private yawned = false;
  private last = performance.now();
  private ghost = document.createElement("div");

  constructor(private ui: GameUi) {
    const ctx = ui.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    this.ctx = ctx;
    this.ghost.id = "drag-ghost";
    this.ghost.hidden = true;
    document.body.append(this.ghost);
    this.player = new Player({
      still: { south: null, north: null, east: null, west: null },
      walkEast: [],
      idleSouth: [],
    });
  }

  async start(): Promise<void> {
    this.bind();
    const { sprites, footPad } = await loadSprites();
    this.player = new Player(sprites);
    this.player.footPad = footPad;
    this.ui.letterIcon.src = "/art/letter.png";
    this.buildMenu();
    this.background = await loadImage(getScene(chapters[0]?.scene ?? "interior").background);
    this.showMenu();
    this.fit();
    requestAnimationFrame(this.frame);
  }

  private buildMenu(): void {
    for (const [index, chapter] of chapters.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      const title = document.createElement("span");
      const number = chapter.number ?? index + 1;
      title.textContent = `${number}  ${chapter.title}`;
      const summary = document.createElement("span");
      summary.className = "chapter-summary";
      summary.textContent = chapter.summary;
      button.append(title, summary);
      button.addEventListener("click", () => {
        void this.beginChapter(chapter);
      });
      this.ui.chapters.append(button);
    }
    this.ui.continueChapter.addEventListener("click", () => this.resume());
    this.ui.toMenu.addEventListener("click", () => {
      if (!this.onMenu) this.showMenu();
    });
  }

  private bind(): void {
    const canvas = this.ui.canvas;
    canvas.addEventListener("mousemove", (event) => {
      const point = this.eventPoint(event);
      this.pointerX = point.x;
      this.pointerY = point.y;
      if (this.pinMessage) {
        const moved = Math.hypot(point.x - this.pinX, point.y - this.pinY) > 14;
        const aged = performance.now() - this.pinAt > 700;
        if (moved && aged) this.pinMessage = false;
      }
      this.hover = this.hotspotAt(point.x, point.y);
      this.hoverText = this.previewLine(point.x, point.y);
      canvas.style.cursor = this.hover ? "pointer" : "crosshair";
      this.paintSentence();
    });
    canvas.addEventListener("mouseleave", () => {
      if (this.drag?.active) return;
      this.hover = null;
      this.hoverText = "";
      this.paintSentence();
    });
    this.ui.game.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("pointerdown", (event) => {
      if (this.blocked()) return;
      const point = this.eventPoint(event);
      if (this.debug) {
        console.log(`${this.scene.id} ${Math.round(point.x)}, ${Math.round(point.y)}`);
      }
      if (event.button === 2) {
        this.lookAt(point.x, point.y);
        return;
      }
      if (event.button !== 0) return;
      this.primary(point.x, point.y);
    });
    this.bindItem(this.ui.letterItem, "letter");
    this.ui.letterClose.addEventListener("click", () => this.closeLetter());
    this.ui.letterLayer.addEventListener("pointerdown", (event) => {
      if (event.target === this.ui.letterLayer) this.closeLetter();
    });
    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.key === "d" || event.key === "D") {
        if (this.onMenu) return;
        this.debug = !this.debug;
        this.message = this.debug ? "Hotspots shown. Clicks log their coordinates." : this.scene.intro;
        this.pinMessage = true;
        this.paintSentence();
      }
      if (event.key === "Escape") {
        if (this.shading) return;
        this.cancelDrag();
        if (this.letterOpen) this.closeLetter();
        else if (!this.onMenu) this.showMenu();
        return;
      }
      if (this.onMenu && /^[0-9]$/.test(event.key)) {
        const number = event.key === "0" ? 10 : Number(event.key);
        const chapter = chapters.find((entry, index) => (entry.number ?? index + 1) === number);
        if (chapter) void this.beginChapter(chapter);
      }
    });
    window.addEventListener("resize", () => this.fit());
  }

  private frame = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.updateFade(dt);
    if (!this.blocked()) {
      this.player.update(dt);
      this.idle = this.player.isWalking() ? 0 : this.idle + dt;
      if (this.idle > 36 && !this.yawned) {
        this.yawned = true;
        this.say("Märmu yawns. The snow is coming, and so is a nap. Not yet.");
      }
    }
    this.draw();
    requestAnimationFrame(this.frame);
  };

  private draw(): void {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (this.background) ctx.drawImage(this.background, 0, 0, VIEW_W, VIEW_H);
    else {
      ctx.fillStyle = "#87b4d4";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#6a8f4e";
      ctx.fillRect(0, this.scene.walk.yMin, VIEW_W, VIEW_H - this.scene.walk.yMin);
    }
    if (!this.onMenu) this.player.draw(ctx);
    if (this.debug && !this.onMenu) this.drawDebug(ctx);
    if (this.shade > 0) {
      ctx.fillStyle = `rgba(12, 8, 4, ${this.shade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private drawDebug(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = "#ffe14a";
    ctx.fillStyle = "#ffe14a";
    ctx.font = "10px monospace";
    const band = this.scene.walk;
    ctx.strokeRect(band.xMin, band.yMin, band.xMax - band.xMin, band.yMax - band.yMin);
    for (const hotspot of this.scene.hotspots) {
      ctx.strokeRect(hotspot.rect.x, hotspot.rect.y, hotspot.rect.w, hotspot.rect.h);
      ctx.fillText(hotspot.id, hotspot.rect.x + 2, hotspot.rect.y + 12);
    }
    ctx.restore();
  }

  private primary(x: number, y: number): void {
    const hotspot = this.hotspotAt(x, y);
    if (hotspot) this.perform(hotspot, hotspot.defaultVerb);
    else this.walk(x, y);
  }

  private lookAt(x: number, y: number): void {
    const hotspot = this.hotspotAt(x, y);
    if (hotspot) this.perform(hotspot, "look");
    else this.say(this.scene.groundLook);
  }

  private walk(x: number, y: number): void {
    const band = this.scene.walk;
    const tx = clamp(x, band.xMin, band.xMax);
    const ty = clamp(y, band.yMin, band.yMax);
    this.message = "Walk to";
    this.paintSentence();
    this.player.walkTo(tx, ty);
  }

  private perform(hotspot: Hotspot, verb: Verb): void {
    const action = hotspot.verbs[verb] ?? { type: "say", text: DEFAULT_QUIPS[verb] };
    this.message = commandLine(verb, hotspot.name);
    this.paintSentence();
    const approach = hotspot.approach;
    const walkFirst = approach && verb !== "look";
    const run = () => {
      if (approach?.facing) this.player.facing = approach.facing;
      else if (approach) this.player.faceToward(hotspot.rect.x + hotspot.rect.w / 2, hotspot.rect.y);
      this.apply(action);
    };
    if (walkFirst && approach) this.player.walkTo(approach.x, approach.y, run);
    else run();
  }

  private apply(action: Action): void {
    switch (action.type) {
      case "say":
        this.say(action.text);
        break;
      case "go":
        this.transition(action.scene);
        break;
      case "open-mailbox":
        this.openMailbox();
        break;
      case "close-mailbox":
        this.say(
          this.hasLetter
            ? "Märmu shuts the mailbox. Empty, for now."
            : "Märmu leaves it shut. The post is still inside.",
        );
        break;
      case "read-letter":
        this.openLetter();
        break;
      case "script":
        this.run(action.id);
        break;
      case "sequence":
        for (const step of action.steps) this.apply(step);
        break;
      default:
        break;
    }
  }

  private openMailbox(): void {
    if (this.hasLetter) {
      this.say("The mailbox is empty. The letter is in Märmu's paws now.");
      return;
    }
    this.hasLetter = true;
    this.ui.letterItem.hidden = false;
    this.say("A letter is waiting inside. Märmu takes it.");
  }

  private openLetter(): void {
    this.showReader("letter");
    this.say("Märmu reads the letter.");
  }

  private closeLetter(): void {
    if (!this.letterOpen) return;
    const mode = this.reader;
    this.letterOpen = false;
    this.reader = null;
    this.ui.letterLayer.hidden = true;
    this.ui.letterClose.textContent = "Close";
    if (mode === "ending") {
      this.showMenu();
      return;
    }
    if (mode === "notebook") {
      this.flags.add("notebook-read");
      this.say("Märmu closes the notebook. The recipe was a gift. There is no map. He will remember.");
      return;
    }
    this.flags.add("letter-read");
    this.say("Märmu folds the letter and keeps it.");
  }

  private showReader(mode: "letter" | "notebook" | "ending", ending?: keyof typeof endings): void {
    const doc =
      mode === "notebook"
        ? { heading: "Bruno's notebook", paragraphs: notebookPages }
        : mode === "ending" && ending
          ? endings[ending]
          : letter;
    this.reader = mode;
    this.letterOpen = true;
    this.hover = null;
    this.hoverText = "";
    this.ui.letterHeading.textContent = doc.heading;
    this.ui.letterBody.replaceChildren();
    for (const paragraph of doc.paragraphs) {
      const p = document.createElement("p");
      p.textContent = paragraph;
      this.ui.letterBody.append(p);
    }
    this.ui.letterClose.textContent = mode === "ending" ? "Menu" : "Close";
    this.ui.letterLayer.hidden = false;
  }

  private run(id: string): void {
    const result = runScript(id, {
      flags: this.flags,
      switches: this.switches,
      items: this.inventory,
      hasLetter: this.hasLetter,
    });
    if (result.switches) this.switches = result.switches;
    for (const flag of result.set ?? []) this.flags.add(flag);
    for (const item of result.remove ?? []) this.lose(item);
    for (const item of result.add ?? []) this.gain(item);
    this.say(result.say);
    if (result.read === "notebook") this.showReader("notebook");
    if (result.ending) this.showReader("ending", result.ending);
    if (result.go) this.transition(result.go);
  }

  private gain(id: string): void {
    if (this.inventory.includes(id)) return;
    this.inventory.push(id);
    this.syncPack();
  }

  private lose(id: string): void {
    this.inventory = this.inventory.filter((item) => item !== id);
    this.syncPack();
  }

  private bindItem(button: HTMLElement, id: string): void {
    button.dataset.item = id;
    button.addEventListener("pointerdown", (event) => this.beginDrag(event, id));
    button.addEventListener("pointermove", (event) => this.moveDrag(event));
    button.addEventListener("pointerup", (event) => this.endDrag(event));
    button.addEventListener("pointercancel", () => this.cancelDrag());
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.examineItem(id);
    });
    button.addEventListener("mouseenter", () => {
      if (this.drag?.active || this.blocked()) return;
      this.pinMessage = false;
      this.hoverText = this.itemHover(id);
      this.paintSentence();
    });
    button.addEventListener("mouseleave", () => {
      if (this.drag?.active) return;
      this.hoverText = "";
      this.paintSentence();
    });
  }

  private beginDrag(event: PointerEvent, id: string): void {
    if (event.button !== 0 || this.blocked()) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  }

  private moveDrag(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_SLOP) return;
      drag.active = true;
      this.pinMessage = false;
      document.body.classList.add("dragging");
    }
    this.ghost.hidden = false;
    this.ghost.textContent = this.itemName(drag.id);
    this.ghost.style.left = `${event.clientX}px`;
    this.ghost.style.top = `${event.clientY}px`;
    this.hoverText = this.dragLine(drag.id, event.clientX, event.clientY);
    this.paintSentence();
  }

  private endDrag(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const active = drag.active;
    const id = drag.id;
    this.cancelDrag();
    if (!active) {
      this.activateItem(id);
      return;
    }
    this.dropItem(id, event.clientX, event.clientY);
  }

  private cancelDrag(): void {
    const wasDragging = this.drag?.active ?? false;
    this.drag = null;
    this.ghost.hidden = true;
    document.body.classList.remove("dragging");
    if (!wasDragging) return;
    this.hoverText = "";
    this.paintSentence();
  }

  private activateItem(id: string): void {
    if (this.blocked()) return;
    if (id === "letter") {
      this.openLetter();
      return;
    }
    if (id === "notebook") {
      this.showReader("notebook");
      this.say("Märmu opens the notebook.");
      return;
    }
    const item = carriedItem(id);
    if (!item) return;
    this.say(`Drag the ${item.name} onto something.`);
  }

  private examineItem(id: string): void {
    if (this.blocked()) return;
    this.cancelDrag();
    if (id === "letter") {
      this.say("A folded letter. The handwriting is Uncle Bruno's.");
      return;
    }
    const item = carriedItem(id);
    if (item) this.say(item.look);
  }

  private dropItem(id: string, clientX: number, clientY: number): void {
    const name = this.itemName(id);
    const hotspot = this.hotspotAtClient(clientX, clientY);
    if (hotspot) {
      this.useOnHotspot(id, hotspot);
      return;
    }
    const other = this.itemAt(clientX, clientY);
    if (other && other !== id) {
      this.say(`The ${name} does nothing to the ${this.itemName(other)}.`);
      return;
    }
    if (this.overScene(clientX, clientY)) this.say(`The ${name} does nothing there.`);
  }

  private useOnHotspot(id: string, hotspot: Hotspot): void {
    const name = this.itemName(id);
    if (id === "letter") {
      this.say(`The letter does nothing to the ${hotspot.name}.`);
      return;
    }
    const action = hotspot.items?.[id];
    if (!action) {
      this.say(`The ${name} does nothing to the ${hotspot.name}.`);
      return;
    }
    this.message = `Use ${name} on ${hotspot.name}`;
    this.paintSentence();
    const approach = hotspot.approach;
    const run = () => {
      if (approach?.facing) this.player.facing = approach.facing;
      this.apply(action);
    };
    if (approach) this.player.walkTo(approach.x, approach.y, run);
    else run();
  }

  private itemHover(id: string): string {
    if (id === "letter" || id === "notebook") return `Read ${this.itemName(id)}`;
    return commandLine("use", this.itemName(id));
  }

  private dragLine(id: string, clientX: number, clientY: number): string {
    const name = this.itemName(id);
    const hotspot = this.hotspotAtClient(clientX, clientY);
    if (hotspot) return `Use ${name} on ${hotspot.name}`;
    const other = this.itemAt(clientX, clientY);
    if (other && other !== id) return `Use ${name} on ${this.itemName(other)}`;
    return `Use ${name} on…`;
  }

  private itemName(id: string): string {
    if (id === "letter") return "letter";
    return carriedItem(id)?.name ?? "thing";
  }

  private itemAt(clientX: number, clientY: number): string | null {
    const under = document.elementFromPoint(clientX, clientY);
    const el = under?.closest<HTMLElement>("[data-item]");
    return el?.dataset.item ?? null;
  }

  private hotspotAtClient(clientX: number, clientY: number): Hotspot | null {
    const point = this.scenePoint(clientX, clientY);
    if (!point) return null;
    return this.hotspotAt(point.x, point.y);
  }

  private overScene(clientX: number, clientY: number): boolean {
    return this.scenePoint(clientX, clientY) !== null;
  }

  private scenePoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.ui.canvas.getBoundingClientRect();
    if (clientX < rect.left || clientY < rect.top || clientX > rect.right || clientY > rect.bottom) return null;
    if (document.elementFromPoint(clientX, clientY) !== this.ui.canvas) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  private syncPack(): void {
    this.ui.pack.replaceChildren();
    for (const id of this.inventory) {
      const item = carriedItem(id);
      if (!item) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pack-item";
      button.textContent = item.name;
      this.bindItem(button, id);
      this.ui.pack.append(button);
    }
  }

  private showMenu(): void {
    if (!this.onMenu) this.savedMessage = this.message;
    this.onMenu = true;
    this.cancelDrag();
    this.letterOpen = false;
    this.ui.letterLayer.hidden = true;
    this.hover = null;
    this.hoverText = "";
    this.ui.continueChapter.hidden = this.chapter === null;
    if (this.chapter) this.ui.continueChapter.textContent = `Continue  ${this.chapter.title}`;
    this.ui.menu.hidden = false;
    this.say("Choose a chapter.");
  }

  private resume(): void {
    if (!this.chapter || this.startingChapter) return;
    this.onMenu = false;
    this.ui.menu.hidden = true;
    this.message = this.savedMessage;
    this.pinMessage = true;
    this.paintSentence();
  }

  private async beginChapter(chapter: Chapter): Promise<void> {
    if (this.startingChapter) return;
    this.startingChapter = true;
    this.chapter = chapter;
    this.onMenu = false;
    this.ui.menu.hidden = true;
    this.letterOpen = false;
    this.reader = null;
    this.ui.letterLayer.hidden = true;
    this.ui.letterClose.textContent = "Close";
    this.hasLetter = chapter.hasLetter ?? false;
    this.ui.letterItem.hidden = !this.hasLetter;
    this.inventory = chapter.items ? [...chapter.items] : [];
    this.cancelDrag();
    this.flags.clear();
    for (const flag of chapter.flags ?? []) this.flags.add(flag);
    this.switches = [];
    this.syncPack();
    this.visited.clear();
    this.hover = null;
    this.hoverText = "";
    this.shading = null;
    this.shade = 0;
    this.pending = null;
    this.player.stop();
    await this.enter(getScene(chapter.scene), true);
    this.startingChapter = false;
  }

  private transition(id: string): void {
    if (this.shading) return;
    this.shading = "out";
    this.pending = () => {
      void this.swap(id);
    };
  }

  private async swap(id: string): Promise<void> {
    await this.enter(getScene(id), false);
    this.shading = "in";
  }

  private async enter(scene: Scene, first: boolean): Promise<void> {
    this.scene = scene;
    this.player.band = scene.walk;
    const spot = first && scene.opening ? scene.opening : scene.entry;
    this.player.place(spot.x, spot.y, spot.facing);
    this.background = await this.backgroundFor(scene);
    const seen = this.visited.has(scene.id);
    this.visited.add(scene.id);
    this.idle = 0;
    this.yawned = false;
    if (!seen || first) this.say(scene.intro);
    else this.say(scene.returnLine);
  }

  private async backgroundFor(scene: Scene): Promise<CanvasImageSource | null> {
    const src = scene.background;
    const cached = this.backgrounds.get(src);
    if (cached) return cached;
    const image = await loadImage(src);
    if (image) this.backgrounds.set(src, image);
    return image;
  }

  private updateFade(dt: number): void {
    if (this.shading === "out") {
      this.shade = Math.min(1, this.shade + dt / 0.18);
      if (this.shade >= 1 && this.pending) {
        const next = this.pending;
        this.pending = null;
        this.shading = "hold";
        next();
      }
    } else if (this.shading === "in") {
      this.shade = Math.max(0, this.shade - dt / 0.22);
      if (this.shade <= 0) this.shading = null;
    }
  }

  private previewLine(x: number, y: number): string {
    const hotspot = this.hotspotAt(x, y);
    if (hotspot) return commandLine(hotspot.defaultVerb, hotspot.name);
    return "Walk to";
  }

  private hotspotAt(x: number, y: number): Hotspot | null {
    const spots = this.scene.hotspots;
    for (let i = spots.length - 1; i >= 0; i -= 1) {
      const hotspot = spots[i];
      if (!hotspot) continue;
      if (hotspot.when && !this.flags.has(hotspot.when)) continue;
      if (hotspot.unless && this.flags.has(hotspot.unless)) continue;
      const rect = hotspot.rect;
      if (x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h) return hotspot;
    }
    return null;
  }

  private say(text: string): void {
    this.message = text;
    this.pinMessage = true;
    this.pinAt = performance.now();
    this.pinX = this.pointerX;
    this.pinY = this.pointerY;
    this.paintSentence();
  }

  private paintSentence(): void {
    if (this.drag?.active && this.hoverText) {
      this.ui.sentence.textContent = this.hoverText;
      return;
    }
    if (this.pinMessage) {
      this.ui.sentence.textContent = this.message;
      return;
    }
    if (this.hoverText && !this.letterOpen) {
      this.ui.sentence.textContent = this.hoverText;
      return;
    }
    this.ui.sentence.textContent = this.message;
  }

  private blocked(): boolean {
    return this.onMenu || this.letterOpen || this.shading !== null;
  }

  private eventPoint(event: MouseEvent): { x: number; y: number } {
    const rect = this.ui.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  private fit(): void {
    const game = this.ui.game;
    game.style.transform = "none";
    const natural = game.offsetHeight;
    const scale = Math.max(
      1,
      Math.min(
        3,
        Math.floor(window.innerWidth / 660),
        Math.floor((window.innerHeight - 24) / natural),
      ),
    );
    game.style.transform = `scale(${scale})`;
    this.ui.layout.style.width = `${game.offsetWidth * scale}px`;
    this.ui.layout.style.height = `${natural * scale}px`;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
