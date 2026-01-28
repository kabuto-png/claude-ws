/**
 * Marker Line Highlight Extension for CodeMirror
 *
 * Highlights lines that start with >>>>> or <<<<< markers
 * These are used for diff resolution markers
 */

import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { ViewPlugin, ViewUpdate } from '@codemirror/view';

// Create decoration for marker lines
const markerLineDecoration = Decoration.line({
  class: 'cm-marker-line-highlight'
});

// View plugin to manage marker line decorations
const markerLineHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const lines = view.state.doc.toString().split('\n');

      let pos = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if line starts with marker prefixes
        if (line.startsWith('>>>>>') || line.startsWith('<<<<<')) {
          // Add decoration to the line
          builder.add(pos, pos, markerLineDecoration);
        }
        // Move to next line (+1 for newline character)
        pos += line.length + 1;
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations
  }
);

// Extension that adds both the plugin and theme styling
export const markerLineHighlightExtension = [
  markerLineHighlightPlugin,
  EditorView.theme({
    '.cm-marker-line-highlight': {
      backgroundColor: 'rgba(245, 158, 11, 0.15)', // amber-500 with 15% opacity
      color: 'rgb(180, 83, 9)', // amber-700
      fontWeight: '600',
      borderLeft: '3px solid rgb(245, 158, 11)', // amber-500
      paddingLeft: '2px',
    },
    '.cm-marker-line-highlight.dark': {
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
      color: 'rgb(253, 224, 71)', // amber-300
      borderLeftColor: 'rgb(245, 158, 11)',
    }
  })
];

// Import RangeSetBuilder from correct location
import { RangeSetBuilder } from '@codemirror/state';
