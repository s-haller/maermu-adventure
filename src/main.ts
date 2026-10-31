import "@fontsource/press-start-2p";
import { Game } from "./engine";

const required = <T extends Element>(id: string): T => {
  const element = document.querySelector<T>(id);
  if (!element) throw new Error(`Missing ${id}`);
  return element;
};

const game = new Game({
  game: required("#game"),
  layout: required("#layout"),
  canvas: required("#scene"),
  sentence: required("#sentence"),
  pack: required("#pack"),
  letterItem: required("#letter-item"),
  letterIcon: required("#letter-icon"),
  letterLayer: required("#letter"),
  letterHeading: required("#letter-heading"),
  letterBody: required("#letter-body"),
  letterClose: required("#letter-close"),
  menu: required("#menu"),
  chapters: required("#chapters"),
  continueChapter: required("#continue-chapter"),
  toMenu: required("#to-menu"),
});

void game.start();
