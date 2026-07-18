export interface Line {
  text: string;
}

export interface Slide {
  lines: Line[];
}

export interface Section {
  title: string;
  slides: Slide[];
}

export interface Presentation {
  sections: Section[];
}
