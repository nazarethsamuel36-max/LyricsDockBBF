import type { Presentation, Section, Slide, Line } from './PresentationTypes';

interface Stanza {
  title: string;
  lines: string[];
}

export class PresentationRenderer {
  /**
   * Render a display string into a Presentation model
   * @param display - The raw display text from the song
   * @param density - Maximum lines per slide (4 or 2)
   */
  static render(display: string, density: 4 | 2 = 4): Presentation {
    const stanzas = this.parseStanzas(display);
    const sections = this.buildSections(stanzas, density);
    
    return {
      sections
    };
  }

  /**
   * Parse display text into stanzas
   * Stanzas are determined by section markers or blank lines
   */
  private static parseStanzas(display: string): Stanza[] {
    const lines = display.split('\n');
    const stanzas: Stanza[] = [];
    
    let currentTitle = '';
    let currentLines: string[] = [];
    let inBlankLines = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this is a section marker
      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      
      if (sectionMatch) {
        // Save current stanza if it has content
        if (currentLines.length > 0) {
          stanzas.push({
            title: currentTitle,
            lines: currentLines
          });
        }
        
        // Start new stanza
        currentTitle = sectionMatch[1];
        currentLines = [];
        inBlankLines = false;
      } else if (trimmed === '') {
        // Blank line - mark as separator but don't end stanza yet
        // We'll only end the stanza when we encounter the next non-empty line
        inBlankLines = true;
      } else {
        // Non-empty line
        if (inBlankLines && currentLines.length > 0) {
          // Blank line was a separator - save current stanza
          stanzas.push({
            title: currentTitle,
            lines: currentLines
          });
          
          // Start new stanza with same title
          currentLines = [];
        }
        
        currentLines.push(trimmed);
        inBlankLines = false;
      }
    }
    
    // Save final stanza if it has content
    if (currentLines.length > 0) {
      stanzas.push({
        title: currentTitle,
        lines: currentLines
      });
    }
    
    // Filter out empty stanzas (Rule 3, Rule 5, Rule 6)
    return stanzas.filter(stanza => stanza.lines.length > 0);
  }

  /**
   * Build sections from stanzas with slide generation
   * @param stanzas - Parsed stanzas from display text
   * @param density - Maximum lines per slide (4 or 2)
   */
  private static buildSections(stanzas: Stanza[], density: 4 | 2): Section[] {
    const sections: Section[] = [];
    
    for (const stanza of stanzas) {
      const slides = this.generateSlides(stanza.lines, density);
      
      if (slides.length > 0) {
        sections.push({
          title: stanza.title,
          slides
        });
      }
    }
    
    return sections;
  }

  /**
   * Generate slides from stanza lines
   * @param lines - Lyric lines from a stanza
   * @param density - Maximum lines per slide (4 or 2)
   * 4-line mode: balanced distribution
   * 2-line mode: simple chunking for maximum readability
   */
  private static generateSlides(lines: string[], density: 4 | 2): Slide[] {
    if (lines.length === 0) return [];
    
    // 2-line mode: simple chunking for maximum readability
    if (density === 2) {
      const slides: Slide[] = [];
      for (let i = 0; i < lines.length; i += 2) {
        const chunk = lines.slice(i, i + 2);
        slides.push({
          lines: chunk.map(text => ({ text }))
        });
      }
      return slides;
    }
    
    // 4-line mode: balanced distribution
    if (lines.length <= 4) {
      return [{
        lines: lines.map(text => ({ text }))
      }];
    }
    
    // Calculate optimal slide count
    const slideCount = Math.ceil(lines.length / 4);
    
    // Calculate base lines per slide and remainder
    const baseLinesPerSlide = Math.floor(lines.length / slideCount);
    const remainder = lines.length % slideCount;
    
    // Distribute lines evenly
    const slides: Slide[] = [];
    let lineIndex = 0;
    
    for (let i = 0; i < slideCount; i++) {
      // First 'remainder' slides get one extra line
      const linesInThisSlide = baseLinesPerSlide + (i < remainder ? 1 : 0);
      
      const slideLines = lines.slice(lineIndex, lineIndex + linesInThisSlide);
      slides.push({
        lines: slideLines.map(text => ({ text }))
      });
      
      lineIndex += linesInThisSlide;
    }
    
    return slides;
  }
}
