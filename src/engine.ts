import { loadImage, loadSprites } from "./assets";
import { chapters, type Chapter } from "./story/chapters";
import { endings, notebookPages, runScript } from "./story/play";
import { carriedItem } from "./story/items";
import { letter } from "./story/letter";
import { Player } from "./player";
import { getScene } from "./scenes";
import type { Action, FrameImage, Hotspot, Rect, Scene, Verb } from "./types";
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

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type DesignHandle = (typeof HANDLES)[number] | "move";

const HANDLE_CURSORS: Record<DesignHandle, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  move: "move",
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
  private wolkeImage: FrameImage | null = null;
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
  private design = false;
  private selectedId: string | null = null;
  private designDrag: {
    id: string;
    handle: DesignHandle;
    startX: number;
    startY: number;
    rect: Rect;
    approach: { x: number; y: number } | null;
  } | null = null;
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
    this.wolkeImage = await loadImage("/art/wolke/south.png");
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
      if (this.design) {
        this.onDesignMove(point.x, point.y);
        return;
      }
      this.hover = this.hotspotAt(point.x, point.y);
      this.hoverText = this.previewLine(point.x, point.y);
      canvas.style.cursor = this.hover ? "pointer" : "crosshair";
      this.paintSentence();
    });
    canvas.addEventListener("mouseleave", () => {
      if (this.drag?.active || this.design) return;
      this.hover = null;
      this.hoverText = "";
      this.paintSentence();
    });
    this.ui.game.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("pointerdown", (event) => {
      if (this.blocked()) return;
      const point = this.eventPoint(event);
      if (this.design) {
        if (event.button === 0) this.onDesignDown(point.x, point.y);
        return;
      }
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
    window.addEventListener("pointerup", () => {
      this.designDrag = null;
    });
    window.addEventListener("keydown", (event) => {
      if (this.design && !this.onMenu && event.key.startsWith("Arrow")) {
        event.preventDefault();
        this.nudgeSelected(event.key, event.shiftKey ? 8 : 1);
        return;
      }
      if (event.repeat) return;
      if ((event.key === "e" || event.key === "E") && !event.metaKey && !event.ctrlKey) {
        this.toggleDesign();
        return;
      }
      if ((event.key === "s" || event.key === "S") && this.design && !this.onMenu) {
        event.preventDefault();
        void this.saveDesign();
        return;
      }
      if (event.key === "d" || event.key === "D") {
        if (this.onMenu || this.design) return;
        this.debug = !this.debug;
        this.message = this.debug ? "Hotspots shown. Clicks log their coordinates." : this.scene.intro;
        this.pinMessage = true;
        this.paintSentence();
      }
      if (event.key === "Escape") {
        if (this.shading) return;
        this.cancelDrag();
        if (this.design) {
          this.leaveDesign();
          return;
        }
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
    if (!this.onMenu) this.drawCast(ctx);
    if (this.design && !this.onMenu) this.drawDesign(ctx);
    else if (this.debug && !this.onMenu) this.drawDebug(ctx);
    if (this.shade > 0) {
      ctx.fillStyle = `rgba(12, 8, 4, ${this.shade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private drawCast(ctx: CanvasRenderingContext2D): void {
    const figures: { y: number; draw: () => void }[] = [
      { y: this.player.y, draw: () => this.player.draw(ctx) },
    ];
    const wolke = this.wolkeSpot();
    if (wolke && this.wolkeImage) {
      const place = this.wolkePlace(wolke);
      figures.push({ y: place.y, draw: () => this.drawWolke(ctx, place.x, place.y) });
    }
    figures.sort((a, b) => a.y - b.y);
    for (const figure of figures) figure.draw();
  }

  private wolkeSpot(): Hotspot | null {
    if (this.scene.id === "power" || this.scene.id === "canteen2") return null;
    const spots = this.scene.hotspots;
    for (let i = spots.length - 1; i >= 0; i -= 1) {
      const hotspot = spots[i];
      if (hotspot?.id === "wolke" && !this.hotspotHidden(hotspot)) return hotspot;
    }
    return null;
  }

  private wolkePlace(hotspot: Hotspot): { x: number; y: number } {
    return {
      x: hotspot.rect.x + hotspot.rect.w / 2,
      y: hotspot.rect.y + hotspot.rect.h,
    };
  }

  private drawWolke(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const image = this.wolkeImage;
    if (!image) return;
    const depth = depthScale(y, this.scene.walk);
    const bob = Math.round(Math.sin(performance.now() / 420) * depth);
    const w = image.width * depth;
    const h = image.height * depth;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(x - w / 2), Math.round(y - h + bob), Math.round(w), Math.round(h));
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
    button.addEventListener("pointerdown", (event) => {
      if (this.design) return;
      this.beginDrag(event, id);
    });
    button.addEventListener("pointermove", (event) => this.moveDrag(event));
    button.addEventListener("pointerup", (event) => this.endDrag(event));
    button.addEventListener("pointercancel", () => this.cancelDrag());
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (this.design) return;
      this.examineItem(id);
    });
    button.addEventListener("mouseenter", () => {
      if (this.design || this.drag?.active || this.blocked()) return;
      this.pinMessage = false;
      this.hoverText = this.itemHover(id);
      this.paintSentence();
    });
    button.addEventListener("mouseleave", () => {
      if (this.design || this.drag?.active) return;
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
    this.selectedId = null;
    this.designDrag = null;
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

  private toggleDesign(): void {
    if (this.onMenu || this.letterOpen) return;
    this.design = !this.design;
    this.designDrag = null;
    this.pinMessage = false;
    if (this.design) {
      this.hoverText = "Design mode. Drag a box, drag an edge to resize, S saves, Esc leaves.";
    } else {
      this.leaveDesign();
      return;
    }
    this.paintSentence();
  }

  private leaveDesign(): void {
    this.design = false;
    this.designDrag = null;
    this.selectedId = null;
    this.hoverText = "";
    this.message = this.scene.intro;
    this.pinMessage = false;
    this.ui.canvas.style.cursor = "crosshair";
    this.paintSentence();
  }

  private onDesignDown(x: number, y: number): void {
    const selected = this.selectedHotspot();
    const handle = selected ? this.handleAt(selected, x, y) : null;
    const hotspot = handle && selected ? selected : this.designHotspotAt(x, y);
    if (!hotspot) {
      this.selectedId = null;
      this.hoverText = this.designLine(null);
      this.paintSentence();
      return;
    }
    this.selectedId = hotspot.id;
    this.designDrag = {
      id: hotspot.id,
      handle: handle ?? "move",
      startX: x,
      startY: y,
      rect: { ...hotspot.rect },
      approach: hotspot.approach ? { x: hotspot.approach.x, y: hotspot.approach.y } : null,
    };
    this.pinMessage = false;
    this.hoverText = this.designLine(hotspot);
    this.ui.canvas.style.cursor = HANDLE_CURSORS[this.designDrag.handle] ?? "move";
    this.paintSentence();
  }

  private onDesignMove(x: number, y: number): void {
    const drag = this.designDrag;
    if (drag) {
      const hotspot = this.scene.hotspots.find((entry) => entry.id === drag.id);
      if (!hotspot) return;
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      hotspot.rect = resizeRect(drag.rect, drag.handle, dx, dy);
      if (drag.handle === "move" && drag.approach && hotspot.approach) {
        const band = this.scene.walk;
        hotspot.approach.x = clamp(Math.round(drag.approach.x + dx), band.xMin, band.xMax);
        hotspot.approach.y = clamp(Math.round(drag.approach.y + dy), band.yMin, band.yMax);
      }
      this.hoverText = this.designLine(hotspot);
      this.ui.canvas.style.cursor = HANDLE_CURSORS[drag.handle] ?? "move";
      this.paintSentence();
      return;
    }
    const selected = this.selectedHotspot();
    const handle = selected ? this.handleAt(selected, x, y) : null;
    const hotspot = handle && selected ? selected : this.designHotspotAt(x, y);
    this.hoverText = this.designLine(hotspot);
    this.ui.canvas.style.cursor = handle ? HANDLE_CURSORS[handle] : hotspot ? "move" : "crosshair";
    this.paintSentence();
  }

  private nudgeSelected(key: string, step: number): void {
    const hotspot = this.selectedHotspot();
    if (!hotspot) return;
    const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
    const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
    const next = resizeRect(hotspot.rect, "move", dx, dy);
    const movedX = next.x - hotspot.rect.x;
    const movedY = next.y - hotspot.rect.y;
    hotspot.rect = next;
    if (hotspot.approach) {
      const band = this.scene.walk;
      hotspot.approach.x = clamp(hotspot.approach.x + movedX, band.xMin, band.xMax);
      hotspot.approach.y = clamp(hotspot.approach.y + movedY, band.yMin, band.yMax);
    }
    this.pinMessage = false;
    this.hoverText = this.designLine(hotspot);
    this.paintSentence();
  }

  private async saveDesign(): Promise<void> {
    const hotspots = this.scene.hotspots.map((hotspot) => ({
      id: hotspot.id,
      rect: { ...hotspot.rect },
      approach: hotspot.approach ? { x: hotspot.approach.x, y: hotspot.approach.y } : undefined,
    }));
    try {
      const response = await fetch("/__design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: this.scene.id, hotspots }),
      });
      const data = (await response.json()) as { error?: string; missing?: string[] };
      if (!response.ok) throw new Error(data.error || "Could not save.");
      const missing = data.missing?.length ? ` Missing ${data.missing.join(", ")}.` : "";
      this.say(`Saved ${this.scene.id}.${missing}`);
    } catch {
      this.say("Could not save. Design mode writes the source only while npm run dev is running.");
    }
  }

  private drawDesign(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = "10px monospace";
    ctx.lineWidth = 1;
    const band = this.scene.walk;
    ctx.strokeStyle = "rgba(255, 225, 74, 0.45)";
    ctx.strokeRect(band.xMin, band.yMin, band.xMax - band.xMin, band.yMax - band.yMin);
    for (const hotspot of this.scene.hotspots) {
      if (hotspot.id === this.selectedId) continue;
      this.strokeHotspot(ctx, hotspot, false);
    }
    const selected = this.selectedHotspot();
    if (selected) this.strokeHotspot(ctx, selected, true);
    ctx.fillStyle = "#7dffb3";
    ctx.fillText("DESIGN", 8, 14);
    ctx.restore();
  }

  private strokeHotspot(ctx: CanvasRenderingContext2D, hotspot: Hotspot, selected: boolean): void {
    const hidden = this.hotspotHidden(hotspot);
    const rect = hotspot.rect;
    ctx.strokeStyle = selected ? "#7dffb3" : hidden ? "rgba(255, 225, 74, 0.55)" : "#ffe14a";
    ctx.fillStyle = selected ? "rgba(125, 255, 179, 0.16)" : "rgba(255, 225, 74, 0.08)";
    ctx.setLineDash(hidden && !selected ? [3, 3] : []);
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w, rect.h);
    ctx.setLineDash([]);
    const label = hotspot.id;
    const width = ctx.measureText(label).width + 4;
    const labelY = rect.y > 16 ? rect.y - 12 : rect.y + 2;
    ctx.fillStyle = "rgba(12, 8, 4, 0.78)";
    ctx.fillRect(rect.x, labelY, width, 12);
    ctx.fillStyle = selected ? "#7dffb3" : "#ffe14a";
    ctx.fillText(label, rect.x + 2, labelY + 10);
    if (!selected) return;
    ctx.fillStyle = "#ffffff";
    for (const handle of HANDLES) {
      const point = handlePoint(rect, handle);
      ctx.fillRect(point.x - 3, point.y - 3, 6, 6);
    }
    if (!hotspot.approach) return;
    ctx.strokeStyle = "#7dffb3";
    ctx.beginPath();
    ctx.arc(hotspot.approach.x, hotspot.approach.y, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  private designLine(hotspot: Hotspot | null): string {
    if (!hotspot) return "Design mode. Drag a box, drag an edge to resize, S saves, Esc leaves.";
    const rect = hotspot.rect;
    const hidden = this.hotspotHidden(hotspot) ? " hidden" : "";
    return `${hotspot.id}${hidden}  ${rect.x}, ${rect.y}  ${rect.w}x${rect.h}    S saves`;
  }

  private designHotspotAt(x: number, y: number): Hotspot | null {
    const spots = this.scene.hotspots;
    for (let i = spots.length - 1; i >= 0; i -= 1) {
      const hotspot = spots[i];
      if (!hotspot) continue;
      const rect = hotspot.rect;
      if (x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h) return hotspot;
    }
    return null;
  }

  private selectedHotspot(): Hotspot | null {
    if (!this.selectedId) return null;
    return this.scene.hotspots.find((hotspot) => hotspot.id === this.selectedId) ?? null;
  }

  private handleAt(hotspot: Hotspot, x: number, y: number): DesignHandle | null {
    for (const handle of HANDLES) {
      const point = handlePoint(hotspot.rect, handle);
      if (Math.hypot(point.x - x, point.y - y) <= 8) return handle;
    }
    return null;
  }

  private hotspotHidden(hotspot: Hotspot): boolean {
    if (hotspot.when && !this.flags.has(hotspot.when)) return true;
    if (hotspot.unless && this.flags.has(hotspot.unless)) return true;
    return false;
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

function depthScale(y: number, band: { yMin: number; yMax: number }): number {
  const span = band.yMax - band.yMin || 1;
  const t = clamp((y - band.yMin) / span, 0, 1);
  return 0.82 + t * 0.28;
}

function handlePoint(rect: Rect, handle: (typeof HANDLES)[number]): { x: number; y: number } {
  const midX = rect.x + rect.w / 2;
  const midY = rect.y + rect.h / 2;
  switch (handle) {
    case "nw":
      return { x: rect.x, y: rect.y };
    case "n":
      return { x: midX, y: rect.y };
    case "ne":
      return { x: rect.x + rect.w, y: rect.y };
    case "e":
      return { x: rect.x + rect.w, y: midY };
    case "se":
      return { x: rect.x + rect.w, y: rect.y + rect.h };
    case "s":
      return { x: midX, y: rect.y + rect.h };
    case "sw":
      return { x: rect.x, y: rect.y + rect.h };
    case "w":
      return { x: rect.x, y: midY };
  }
}

function resizeRect(orig: Rect, handle: DesignHandle, dx: number, dy: number): Rect {
  if (handle === "move") return clampRect({ x: orig.x + dx, y: orig.y + dy, w: orig.w, h: orig.h });
  let x = orig.x;
  let y = orig.y;
  let right = orig.x + orig.w;
  let bottom = orig.y + orig.h;
  if (handle.includes("w")) x += dx;
  if (handle.includes("e")) right += dx;
  if (handle.includes("n")) y += dy;
  if (handle.includes("s")) bottom += dy;
  if (right - x < 12) {
    if (handle.includes("w")) x = right - 12;
    else right = x + 12;
  }
  if (bottom - y < 12) {
    if (handle.includes("n")) y = bottom - 12;
    else bottom = y + 12;
  }
  return clampRect({ x, y, w: right - x, h: bottom - y });
}

function clampRect(rect: Rect): Rect {
  const w = Math.max(12, Math.round(rect.w));
  const h = Math.max(12, Math.round(rect.h));
  const x = clamp(Math.round(rect.x), 0, VIEW_W - 12);
  const y = clamp(Math.round(rect.y), 0, VIEW_H - 12);
  return { x, y, w: Math.min(w, VIEW_W - x), h: Math.min(h, VIEW_H - y) };
}
